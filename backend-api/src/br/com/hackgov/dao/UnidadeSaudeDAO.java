package br.com.hackgov.dao;

import br.com.hackgov.db.Conexao;
import br.com.hackgov.modelos.UnidadeSaude;
import br.com.hackgov.util.CnesApi;
import br.com.hackgov.util.Localizacao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * DAO da rede de saúde — as UBS, UPAs e prontos-socorros perto do paciente.
 *
 * A tabela unidades_saude é um espelho local do CNES, não um dado nosso: a API
 * do Ministério da Saúde entrega 20 registros por requisição, e uma cidade como
 * São Paulo tem centenas de unidades. Buscar tudo a cada abertura da tela
 * levaria dezenas de segundos, então gravamos uma vez e reusamos.
 *
 * A atualização segue duas regras:
 *   - município sem nenhuma unidade gravada: busca na hora (não há o que servir);
 *   - município com dados vencidos: devolve o que já existe e atualiza em outra
 *     thread, para o paciente não esperar.
 *
 * Uma segunda passada confere as coordenadas contra o CEP de cada unidade —
 * ver {@link #refinarCoordenadas(int)}. Ela roda sempre em segundo plano e é
 * lenta de propósito (a API de CEP é gratuita e limita requisições), então
 * grava unidade por unidade e retoma de onde parou a cada abertura da tela.
 */
public class UnidadeSaudeDAO {

    /** Por quantos dias o espelho do CNES é considerado bom. */
    private static final int DIAS_VALIDADE_CACHE = 30;

    /** Quantas unidades a tela recebe, das mais próximas para as mais distantes. */
    private static final int LIMITE_PADRAO = 30;

    /** Municípios com atualização em andamento, para não baixar duas vezes. */
    private static final Set<Integer> EM_ATUALIZACAO = new HashSet<>();

    /**
     * A partir de quantos km de diferença a coordenada do CNES é considerada
     * errada e trocada pela do CEP da unidade.
     *
     * Não é para corrigir imprecisão: quando as duas concordam, a do CNES é
     * melhor, porque aponta o prédio e o CEP aponta a rua inteira. E rua
     * inteira em São Paulo é muita coisa — a Rua Vergueiro tem 6 km, e o ponto
     * que a API de CEP devolve para ela fica a 3,5 km da UPA que leva o mesmo
     * nome. Por isso o limiar é alto: os registros realmente defeituosos estão
     * a mais de 10 km do lugar certo.
     */
    private static final double LIMIAR_CORRECAO_KM = 8.0;

    /**
     * Quantas outras unidades precisam dividir o mesmo ponto para o registro
     * virar suspeito.
     *
     * É esta pilha que denuncia o erro de geocodificação: duas unidades no
     * mesmo endereço existem (a UBS Sé e a AMA Sé), mas cinco unidades de
     * bairros diferentes empilhadas sobre a Praça da Sé, não. Sem esta
     * condição, uma unidade sozinha e bem localizada numa rua comprida seria
     * "corrigida" para pior.
     */
    private static final int MIN_VIZINHAS_SUSPEITAS = 3;

    /** Raio da pilha, em graus — ~550 m em latitude. */
    private static final double RAIO_PILHA_GRAUS = 0.005;

    /**
     * Intervalo entre duas consultas de CEP — 10 por minuto.
     *
     * A API de CEP é gratuita e corta o acesso em rajada: medindo na mão, uma
     * consulta por segundo já é barrada e o bloqueio dura minutos, enquanto uma
     * a cada cinco segundos passa sem problema. Como isto roda numa thread
     * daemon e o resultado fica gravado, ir devagar não custa nada ao paciente.
     */
    private static final long PAUSA_ENTRE_CEPS_MS = 6_000;

    /** Espera maior depois de uma falha, para o caso de termos sido barrados. */
    private static final long PAUSA_APOS_FALHA_MS = 60_000;

    /** Falhas seguidas que encerram a passada (API fora do ar ou nos barrando). */
    private static final int FALHAS_SEGUIDAS_MAXIMAS = 5;

    /**
     * Unidades do município ordenadas da mais próxima para a mais distante.
     *
     * @param latitude  ponto de partida do paciente; null quando não se sabe
     *                  onde ele está (aí a lista sai em ordem alfabética e a
     *                  distância vem negativa, sinalizando "não calculada").
     */
    public List<UnidadeSaude> buscarProximas(int codigoMunicipio, Double latitude, Double longitude)
            throws SQLException {

        garantirCache(codigoMunicipio);

        boolean temOrigem = latitude != null && longitude != null;

        // Fórmula de Haversine direto no SQL: assim o banco já devolve
        // ordenado e cortado no limite, sem trazer a cidade inteira.
        String distancia = temOrigem
                ? "6371 * 2 * ASIN(SQRT("
                + "  POWER(SIN(RADIANS(? - latitude) / 2), 2)"
                + "  + COS(RADIANS(?)) * COS(RADIANS(latitude))"
                + "  * POWER(SIN(RADIANS(? - longitude) / 2), 2)))"
                : "-1";

        String sql = "SELECT codigo_cnes, codigo_municipio, nome, tipo, logradouro, numero, "
                + "       bairro, cep, telefone, turno, latitude, longitude, "
                + "       " + distancia + " AS distancia_km "
                + "FROM unidades_saude "
                + "WHERE codigo_municipio = ? "
                + "ORDER BY " + (temOrigem ? "distancia_km" : "nome") + " "
                + "LIMIT ?";

        List<UnidadeSaude> unidades = new ArrayList<>();

        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            int i = 1;
            if (temOrigem) {
                ps.setDouble(i++, latitude);
                ps.setDouble(i++, latitude);
                ps.setDouble(i++, longitude);
            }
            ps.setInt(i++, codigoMunicipio);
            ps.setInt(i, LIMITE_PADRAO);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    unidades.add(montar(rs));
                }
            }
        }

        return unidades;
    }

    // ===================== CACHE DO CNES =====================

    /**
     * Garante que o município tenha dados utilizáveis na tabela.
     *
     * Só bloqueia o paciente quando não há absolutamente nada gravado; a partir
     * daí a renovação acontece por fora, em segundo plano.
     */
    private void garantirCache(int codigoMunicipio) throws SQLException {
        int total;
        int pendentes;
        boolean vencido;

        String sql = "SELECT COUNT(*) AS total, "
                + "       MIN(atualizado_em < DATE_SUB(NOW(), INTERVAL ? DAY)) AS vencido, "
                + "       SUM(cep_conferido = 0) AS pendentes "
                + "FROM unidades_saude WHERE codigo_municipio = ?";

        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setInt(1, DIAS_VALIDADE_CACHE);
            ps.setInt(2, codigoMunicipio);
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                total = rs.getInt("total");
                vencido = rs.getBoolean("vencido");
                pendentes = rs.getInt("pendentes");
            }
        }

        if (total == 0) {
            // Sem nada gravado não há o que mostrar: baixa agora (~7 s numa
            // cidade grande) e só depois manda conferir as coordenadas, para o
            // paciente já receber a lista.
            atualizarDoCnes(codigoMunicipio);
            emSegundoPlano(codigoMunicipio, false);
        } else if (vencido) {
            emSegundoPlano(codigoMunicipio, true);
        } else if (pendentes > 0) {
            // A conferência de CEP é lenta e quase nunca termina numa sessão
            // só. Cada abertura da tela retoma de onde parou.
            emSegundoPlano(codigoMunicipio, false);
        }
    }

    /**
     * Dispara a manutenção do município numa thread à parte, no máximo uma por
     * município.
     *
     * @param baixarDoCnes true para rebaixar a lista antes de refinar; false
     *                     quando ela acabou de ser baixada.
     */
    private void emSegundoPlano(int codigoMunicipio, boolean baixarDoCnes) {
        synchronized (EM_ATUALIZACAO) {
            if (!EM_ATUALIZACAO.add(codigoMunicipio)) return;
        }

        Thread t = new Thread(() -> {
            try {
                if (baixarDoCnes) {
                    atualizarDoCnes(codigoMunicipio);
                }
                refinarCoordenadas(codigoMunicipio);
            } catch (SQLException e) {
                System.out.println("[ERRO rede-saude] falha ao renovar o município "
                        + codigoMunicipio);
            } finally {
                synchronized (EM_ATUALIZACAO) {
                    EM_ATUALIZACAO.remove(codigoMunicipio);
                }
            }
        }, "cnes-" + codigoMunicipio);

        t.setDaemon(true); // não segura o desligamento da API
        t.start();
    }

    /**
     * Baixa o município no CNES e grava o resultado.
     *
     * Se a API não responder (sem internet, fora do ar), não apaga nada: é
     * melhor a tela mostrar dados de um mês atrás do que mostrar vazio.
     */
    private void atualizarDoCnes(int codigoMunicipio) throws SQLException {
        List<UnidadeSaude> unidades = CnesApi.buscarPorMunicipio(codigoMunicipio);
        if (unidades.isEmpty()) return;

        String sql = "INSERT INTO unidades_saude "
                + "(codigo_cnes, codigo_municipio, nome, tipo, logradouro, numero, bairro, "
                + " cep, telefone, turno, latitude, longitude) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) "
                // A ordem importa: o MySQL aplica as atribuições da esquerda
                // para a direita, então tudo que compara com o CEP antigo tem
                // de vir ANTES de "cep = VALUES(cep)".
                //
                // Coordenada já conferida não é sobrescrita pela do CNES,
                // senão a renovação mensal desfaria a correção. Se o CEP
                // mudou, a unidade se mudou: a conferência recomeça.
                + "ON DUPLICATE KEY UPDATE "
                + "  nome = VALUES(nome), tipo = VALUES(tipo), "
                + "  logradouro = VALUES(logradouro), numero = VALUES(numero), "
                + "  bairro = VALUES(bairro), "
                + "  telefone = VALUES(telefone), turno = VALUES(turno), "
                + "  latitude  = IF(cep_conferido = 1 AND cep = VALUES(cep), "
                + "                 latitude,  VALUES(latitude)), "
                + "  longitude = IF(cep_conferido = 1 AND cep = VALUES(cep), "
                + "                 longitude, VALUES(longitude)), "
                + "  cep_conferido = IF(cep = VALUES(cep), cep_conferido, 0), "
                + "  cep = VALUES(cep), "
                + "  atualizado_em = NOW()";

        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            for (UnidadeSaude u : unidades) {
                ps.setInt(1, u.getCodigoCnes());
                ps.setInt(2, u.getCodigoMunicipio());
                ps.setString(3, u.getNome());
                ps.setString(4, u.getTipo());
                ps.setString(5, u.getLogradouro());
                ps.setString(6, u.getNumero());
                ps.setString(7, u.getBairro());
                ps.setString(8, u.getCep());
                ps.setString(9, u.getTelefone());
                ps.setString(10, u.getTurno());
                ps.setDouble(11, u.getLatitude());
                ps.setDouble(12, u.getLongitude());
                ps.addBatch();
            }
            ps.executeBatch();
        }
    }

    // ===================== CORREÇÃO DAS COORDENADAS =====================

    /**
     * Conserta as coordenadas erradas do CNES usando o CEP da própria unidade.
     *
     * Parte do cadastro de São Paulo foi geocodificada no centro da cidade: a
     * UPA de Perus, a UPA III da Lapa e várias UBS da Brasilândia estão
     * gravadas com a coordenada da Sé, embora o CEP delas esteja certo. Como
     * elas caem no meio da cidade, apareciam em primeiro lugar para quem mora
     * perto do centro — justamente o contrário do que a tela promete.
     *
     * Só entram na conferência as unidades com cara de defeito (ver
     * {@link #buscarSuspeitas(int)}) — em São Paulo, 40 das 547; nas outras não
     * há o que conferir, e elas são marcadas na hora, sem gastar consulta. Das
     * suspeitas, o CEP só manda quando os dois pontos discordam por mais de
     * {@link #LIMIAR_CORRECAO_KM}.
     *
     * A passada é deliberadamente lenta (ver {@link #PAUSA_ENTRE_CEPS_MS}) e
     * cada unidade é gravada assim que é conferida, marcando `cep_conferido`.
     * Assim uma queda no meio do caminho não joga fora o que já foi feito, e
     * uma nova execução continua de onde parou em vez de recomeçar.
     */
    private void refinarCoordenadas(int codigoMunicipio) throws SQLException {
        Set<Integer> suspeitas = buscarSuspeitas(codigoMunicipio);

        List<UnidadeSaude> aConferir = new ArrayList<>();
        List<Integer> semSuspeita = new ArrayList<>();

        for (UnidadeSaude u : buscarNaoConferidas(codigoMunicipio)) {
            if (suspeitas.contains(u.getCodigoCnes())) {
                aConferir.add(u);
            } else {
                semSuspeita.add(u.getCodigoCnes());
            }
        }

        // Sem nenhum dos dois sinais de defeito, a coordenada do CNES fica como
        // está. São a grande maioria — 507 das 547 em São Paulo —, e por isso
        // vão todas numa tacada só, sem consultar nada.
        marcarSemConsulta(semSuspeita);

        int falhasSeguidas = 0;

        for (UnidadeSaude u : aConferir) {
            if (Thread.currentThread().isInterrupted()) break;

            Localizacao.Lugar lugar = Localizacao.buscarPorCep(u.getCep());

            if (lugar == null || lugar.getLatitude() == null) {
                // Pode ser um CEP que a API não conhece ou o bloqueio por
                // excesso de consultas. Espera mais e tenta a próxima; várias
                // falhas seguidas encerram a passada, que recomeça na próxima
                // vez em que alguém abrir a tela.
                if (++falhasSeguidas >= FALHAS_SEGUIDAS_MAXIMAS) break;
                if (!esperar(PAUSA_APOS_FALHA_MS)) break;
                continue;
            }
            falhasSeguidas = 0;

            double diferenca = Localizacao.distanciaKm(
                    u.getLatitude(), u.getLongitude(),
                    lugar.getLatitude(), lugar.getLongitude());

            if (diferenca >= LIMIAR_CORRECAO_KM) {
                marcarConferida(u.getCodigoCnes(), lugar.getLatitude(), lugar.getLongitude());
            } else {
                marcarConferida(u.getCodigoCnes(), null, null);
            }

            if (!esperar(PAUSA_ENTRE_CEPS_MS)) break;
        }
    }

    /**
     * Códigos CNES das unidades que valem uma consulta de CEP — as candidatas a
     * estarem geocodificadas no lugar errado.
     *
     * São dois sinais, e basta um deles:
     *
     *   1. a unidade está EMPILHADA com outras sobre o mesmo ponto (ver
     *      {@link #MIN_VIZINHAS_SUSPEITAS});
     *   2. a coordenada tem só 4 casas decimais, enquanto o CNES normalmente
     *      grava 7. Esse arredondamento denuncia um lote geocodificado à parte,
     *      e é nele que estão as unidades erradas que ficaram sozinhas — a UBS
     *      Jardim Elisa Maria I, por exemplo, não tem nenhuma vizinha e por
     *      isso escapava do primeiro sinal.
     *
     * Nenhum dos dois decide sozinho: eles só escolhem quem consultar. Quem
     * decide a troca é a comparação com o CEP, em {@link #refinarCoordenadas}.
     * Um palpite errado aqui custa uma consulta e não mexe em nada.
     */
    private Set<Integer> buscarSuspeitas(int codigoMunicipio) throws SQLException {
        String sql = "SELECT a.codigo_cnes "
                + "FROM unidades_saude a "
                + "WHERE a.codigo_municipio = ? "
                + "  AND ( (SELECT COUNT(*) FROM unidades_saude v "
                + "          WHERE v.codigo_municipio = a.codigo_municipio "
                + "            AND v.codigo_cnes <> a.codigo_cnes "
                + "            AND ABS(v.latitude  - a.latitude)  < ? "
                + "            AND ABS(v.longitude - a.longitude) < ?) >= ? "
                + "        OR (a.latitude  = ROUND(a.latitude, 4) "
                + "        AND a.longitude = ROUND(a.longitude, 4)) )";

        Set<Integer> suspeitas = new HashSet<>();

        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, codigoMunicipio);
            ps.setDouble(2, RAIO_PILHA_GRAUS);
            ps.setDouble(3, RAIO_PILHA_GRAUS);
            ps.setInt(4, MIN_VIZINHAS_SUSPEITAS);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    suspeitas.add(rs.getInt("codigo_cnes"));
                }
            }
        }

        return suspeitas;
    }

    /** Unidades que ainda não passaram pela conferência de coordenada. */
    private List<UnidadeSaude> buscarNaoConferidas(int codigoMunicipio) throws SQLException {
        String sql = "SELECT codigo_cnes, cep, latitude, longitude "
                + "FROM unidades_saude "
                + "WHERE codigo_municipio = ? "
                + "  AND cep_conferido = 0 "
                + "  AND CHAR_LENGTH(cep) = 8";

        List<UnidadeSaude> unidades = new ArrayList<>();

        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, codigoMunicipio);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    UnidadeSaude u = new UnidadeSaude();
                    u.setCodigoCnes(rs.getInt("codigo_cnes"));
                    u.setCep(rs.getString("cep"));
                    u.setLatitude(rs.getDouble("latitude"));
                    u.setLongitude(rs.getDouble("longitude"));
                    unidades.add(u);
                }
            }
        }

        // A lista sai daqui inteira e a conexão fecha: as consultas de CEP
        // levam minutos, e segurar conexão do banco esse tempo é desperdício.
        return unidades;
    }

    /** Marca de uma vez as unidades que não precisam de consulta de CEP. */
    private void marcarSemConsulta(List<Integer> codigosCnes) throws SQLException {
        if (codigosCnes.isEmpty()) return;

        String sql = "UPDATE unidades_saude SET cep_conferido = 1 WHERE codigo_cnes = ?";

        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            for (Integer codigo : codigosCnes) {
                ps.setInt(1, codigo);
                ps.addBatch();
            }
            ps.executeBatch();
        }
    }

    /**
     * Marca a unidade como conferida, trocando a coordenada quando há uma
     * melhor.
     *
     * @param latitude  nova coordenada, ou null para manter a do CNES (que
     *                  concordou com o CEP e portanto está certa).
     */
    private void marcarConferida(int codigoCnes, Double latitude, Double longitude)
            throws SQLException {

        String sql = latitude == null
                ? "UPDATE unidades_saude SET cep_conferido = 1 WHERE codigo_cnes = ?"
                : "UPDATE unidades_saude SET latitude = ?, longitude = ?, cep_conferido = 1 "
                + "WHERE codigo_cnes = ?";

        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            int i = 1;
            if (latitude != null) {
                ps.setDouble(i++, latitude);
                ps.setDouble(i++, longitude);
            }
            ps.setInt(i, codigoCnes);
            ps.executeUpdate();
        }
    }

    /** Espera entre duas consultas de CEP. Devolve false se a thread for parada. */
    private boolean esperar(long milissegundos) {
        try {
            Thread.sleep(milissegundos);
            return true;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    /** Monta a unidade a partir da linha do ResultSet. */
    private UnidadeSaude montar(ResultSet rs) throws SQLException {
        UnidadeSaude u = new UnidadeSaude();
        u.setCodigoCnes(rs.getInt("codigo_cnes"));
        u.setCodigoMunicipio(rs.getInt("codigo_municipio"));
        u.setNome(rs.getString("nome"));
        u.setTipo(rs.getString("tipo"));
        u.setLogradouro(rs.getString("logradouro"));
        u.setNumero(rs.getString("numero"));
        u.setBairro(rs.getString("bairro"));
        u.setCep(rs.getString("cep"));
        u.setTelefone(rs.getString("telefone"));
        u.setTurno(rs.getString("turno"));
        u.setLatitude(rs.getDouble("latitude"));
        u.setLongitude(rs.getDouble("longitude"));
        u.setDistanciaKm(rs.getDouble("distancia_km"));
        return u;
    }
}
