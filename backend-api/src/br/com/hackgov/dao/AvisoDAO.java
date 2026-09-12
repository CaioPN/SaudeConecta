package br.com.hackgov.dao;

import br.com.hackgov.db.Conexao;
import br.com.hackgov.modelos.Aviso;
import br.com.hackgov.util.CarteiraVacinal;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

/**
 * DAO dos avisos do Dashboard.
 *
 * Não existe tabela "avisos": cada regra abaixo é uma consulta sobre os dados
 * que o paciente já tem (exames, consultas, carteira de vacinação) mais as
 * campanhas em cartaz. O texto é montado aqui para a tela apenas exibir o que
 * recebe.
 *
 * <h3>Quem entra na conta</h3>
 * O titular e cada dependente. Para o titular valem todas as regras; para os
 * dependentes valem as três que a pessoa responsável precisa ver sem abrir
 * tela nenhuma — consulta chegando, resultado alterado e dose de vacina
 * atrasada. As regras de "faz tempo que não faz exame" ficam de fora deles de
 * propósito: criança saudável não faz exame de rotina, e o aviso viraria
 * ruído permanente no Dashboard.
 */
public class AvisoDAO {

    /** A partir de quantos dias sem exame o aviso aparece. */
    private static final int DIAS_EXAME_ALERTA = 180;
    /** A partir de quantos dias sem consulta o aviso aparece. */
    private static final int DIAS_CONSULTA_ALERTA = 365;
    /** Janela para avisar de uma consulta que está chegando. */
    private static final int DIAS_CONSULTA_PROXIMA = 30;

    /** Monta a lista de avisos do paciente, da mais para a menos urgente. */
    public List<Aviso> listarPorPaciente(int idPaciente) throws SQLException {
        List<Aviso> avisos = new ArrayList<>();

        try (Connection con = Conexao.abrir()) {
            adicionarProximaConsulta(con, idPaciente, null, null, avisos);
            adicionarResultadosAlterados(con, idPaciente, null, null, avisos);
            adicionarVacinasAtrasadas(con, idPaciente, null, null, null, avisos);
            adicionarUltimoExame(con, idPaciente, avisos);
            adicionarUltimaConsulta(con, idPaciente, avisos);

            for (String[] dep : dependentesDe(con, idPaciente)) {
                int idDependente = Integer.parseInt(dep[0]);
                String nome = primeiroNome(dep[1]);
                adicionarProximaConsulta(con, idPaciente, idDependente, nome, avisos);
                adicionarResultadosAlterados(con, idPaciente, idDependente, nome, avisos);
                adicionarVacinasAtrasadas(con, idPaciente, idDependente, nome, dep[2], avisos);
            }

            adicionarCampanhas(con, avisos);
        }

        ordenarPorSeveridade(avisos);
        return avisos;
    }

    /** id, nome e data de nascimento dos dependentes da conta. */
    private List<String[]> dependentesDe(Connection con, int idPaciente) throws SQLException {
        String sql = "SELECT id, nome, data_nascimento FROM dependentes WHERE paciente_id = ? ORDER BY nome";
        List<String[]> lista = new ArrayList<>();
        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setInt(1, idPaciente);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    lista.add(new String[] {
                        String.valueOf(rs.getInt("id")),
                        rs.getString("nome"),
                        rs.getString("data_nascimento"),
                    });
                }
            }
        }
        return lista;
    }

    /**
     * Doses do calendário infantil cuja data recomendada já passou e que
     * ninguém registrou como aplicadas.
     *
     * A regra é a mesma do {@link br.com.hackgov.util.CarteiraVacinal}, escrita
     * em SQL: aqui só interessa a CONTAGEM, e trazer as 26 doses para o Java
     * para contar as vencidas seria buscar dado à toa a cada Dashboard aberto.
     * Ao mexer no critério de atraso, mexa nos dois lugares.
     *
     * Só o calendário da criança tem idade recomendada; as doses do adulto
     * dependem de campanha e de histórico que o app não guarda, então nunca
     * ficam atrasadas — por isso o titular quase sempre sai daqui sem aviso.
     */
    private void adicionarVacinasAtrasadas(Connection con, int idPaciente, Integer idDependente,
                                           String pessoa, String nascimento, List<Aviso> avisos)
            throws SQLException {
        String nasc = nascimento;
        if (nasc == null && idDependente == null) {
            nasc = nascimentoDoTitular(con, idPaciente);
        }
        if (nasc == null) return;

        // O calendário infantil só vale para quem ainda está nele. Sem esta
        // conferência, um adulto aparecia com o calendário da criança inteiro
        // "em atraso" — as datas recomendadas passaram todas há anos, e nada
        // dali é cobrável de quem já cresceu.
        if (!CarteiraVacinal.PUBLICO_CRIANCA.equals(CarteiraVacinal.publicoPara(nasc))) return;

        String sql = "SELECT COUNT(*) AS atrasadas "
                + "FROM calendario_vacinal c "
                + "LEFT JOIN vacinas_aplicadas v "
                + "       ON v.dose_id = c.id AND v.paciente_id = ? AND v.dependente_id <=> ? "
                + "WHERE c.publico = 'crianca' AND c.idade_meses IS NOT NULL "
                + "  AND DATE_ADD(?, INTERVAL c.idade_meses MONTH) <= CURDATE() "
                + "  AND v.id IS NULL";

        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setInt(1, idPaciente);
            if (idDependente == null) {
                ps.setNull(2, java.sql.Types.INTEGER);
            } else {
                ps.setInt(2, idDependente);
            }
            ps.setString(3, nasc);

            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return;
                int atrasadas = rs.getInt("atrasadas");
                if (atrasadas == 0) return;

                avisos.add(new Aviso(
                        "vacina",
                        atrasadas == 1
                                ? "1 dose de vacina em atraso"
                                : atrasadas + " doses de vacina em atraso",
                        "Confira a carteira de vacinação e leve o cartão ao posto.",
                        atrasadas >= 3 ? Aviso.ALTA : Aviso.MEDIA,
                        pessoa));
            }
        }
    }

    private String nascimentoDoTitular(Connection con, int idPaciente) throws SQLException {
        try (PreparedStatement ps = con.prepareStatement(
                "SELECT data_nascimento FROM pacientes WHERE id = ?")) {
            ps.setInt(1, idPaciente);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? rs.getString("data_nascimento") : null;
            }
        }
    }

    /** Primeiro nome — o Dashboard é do titular, que não precisa do nome completo. */
    private static String primeiroNome(String nome) {
        if (nome == null) return null;
        String limpo = nome.trim();
        int espaco = limpo.indexOf(' ');
        return espaco > 0 ? limpo.substring(0, espaco) : limpo;
    }

    /** Consulta agendada dentro dos próximos dias, do titular ou de um dependente. */
    private void adicionarProximaConsulta(Connection con, int idPaciente, Integer idDependente,
                                          String pessoa, List<Aviso> avisos)
            throws SQLException {
        // LEFT JOIN porque a consulta anotada pelo paciente não tem médico
        // cadastrado: com o JOIN de antes, justamente a consulta que ele mesmo
        // marcou não viraria aviso no Dashboard.
        String sql = "SELECT c.data, c.local, COALESCE(m.nome, c.profissional) AS medico, "
                + "       DATEDIFF(c.data, CURDATE()) AS dias "
                + "FROM consultas c "
                + "LEFT JOIN medicos m ON m.id = c.medico_id "
                + "WHERE c.paciente_id = ? AND c.dependente_id <=> ? "
                + "  AND c.status = 'agendada' "
                + "  AND c.data BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY) "
                + "ORDER BY c.data "
                + "LIMIT 1";

        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setInt(1, idPaciente);
            if (idDependente == null) {
                ps.setNull(2, java.sql.Types.INTEGER);
            } else {
                ps.setInt(2, idDependente);
            }
            ps.setInt(3, DIAS_CONSULTA_PROXIMA);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    int dias = rs.getInt("dias");
                    String quando;
                    if (dias == 0) {
                        quando = "Consulta hoje";
                    } else if (dias == 1) {
                        quando = "Consulta amanhã";
                    } else {
                        quando = "Consulta em " + dias + " dias";
                    }
                    avisos.add(new Aviso(
                            "consulta",
                            quando + " com " + rs.getString("medico"),
                            rs.getString("local"),
                            dias <= 2 ? Aviso.ALTA : Aviso.MEDIA,
                            pessoa));
                }
            }
        }
    }

    /** Resultados fora da faixa de referência na coleta de sangue mais recente. */
    private void adicionarResultadosAlterados(Connection con, int idPaciente, Integer idDependente,
                                              String pessoa, List<Aviso> avisos)
            throws SQLException {
        String sql = "SELECT COUNT(*) AS fora, MAX(e.data) AS data "
                + "FROM exame_itens i "
                + "JOIN exames e ON e.id = i.exame_id "
                + "WHERE e.paciente_id = ? AND e.dependente_id <=> ? AND e.tipo = 'sangue' "
                + "  AND e.data = ( "
                + "      SELECT MAX(data) FROM exames "
                + "      WHERE paciente_id = ? AND dependente_id <=> ? AND tipo = 'sangue') "
                + "  AND (i.valor < i.ref_min OR i.valor > i.ref_max)";

        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setInt(1, idPaciente);
            ps.setInt(3, idPaciente);
            if (idDependente == null) {
                ps.setNull(2, java.sql.Types.INTEGER);
                ps.setNull(4, java.sql.Types.INTEGER);
            } else {
                ps.setInt(2, idDependente);
                ps.setInt(4, idDependente);
            }
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    int fora = rs.getInt("fora");
                    if (fora > 0) {
                        avisos.add(new Aviso(
                                "resultado",
                                fora == 1
                                        ? "1 resultado fora da faixa no último exame de sangue"
                                        : fora + " resultados fora da faixa no último exame de sangue",
                                "Coleta de " + formatarData(rs.getString("data")),
                                Aviso.ALTA,
                                pessoa));
                    }
                }
            }
        }
    }

    /** Tempo desde o último exame de qualquer tipo. */
    private void adicionarUltimoExame(Connection con, int idPaciente, List<Aviso> avisos)
            throws SQLException {
        String sql = "SELECT MAX(data) AS ultima, DATEDIFF(CURDATE(), MAX(data)) AS dias "
                + "FROM exames "
                + "WHERE paciente_id = ? AND dependente_id IS NULL";

        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setInt(1, idPaciente);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    String ultima = rs.getString("ultima");
                    if (ultima == null) {
                        avisos.add(new Aviso(
                                "exame",
                                "Nenhum exame registrado ainda",
                                "Guarde seus resultados para acompanhar sua saúde ao longo do tempo.",
                                Aviso.MEDIA));
                        return;
                    }
                    int dias = rs.getInt("dias");
                    if (dias >= DIAS_EXAME_ALERTA) {
                        avisos.add(new Aviso(
                                "exame",
                                humanizar(dias) + " desde o último exame",
                                "Último registro em " + formatarData(ultima) + ".",
                                dias >= 365 ? Aviso.ALTA : Aviso.MEDIA));
                    }
                }
            }
        }
    }

    /** Tempo desde a última consulta já realizada (o "check-up"). */
    private void adicionarUltimaConsulta(Connection con, int idPaciente, List<Aviso> avisos)
            throws SQLException {
        String sql = "SELECT MAX(data) AS ultima, DATEDIFF(CURDATE(), MAX(data)) AS dias "
                + "FROM consultas "
                + "WHERE paciente_id = ? AND dependente_id IS NULL AND status = 'realizada'";

        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setInt(1, idPaciente);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    String ultima = rs.getString("ultima");
                    if (ultima != null && rs.getInt("dias") >= DIAS_CONSULTA_ALERTA) {
                        avisos.add(new Aviso(
                                "consulta",
                                humanizar(rs.getInt("dias")) + " desde a última consulta",
                                "Vale agendar um check-up de rotina.",
                                Aviso.MEDIA));
                    }
                }
            }
        }
    }

    /** Campanhas de vacinação em cartaz hoje. */
    private void adicionarCampanhas(Connection con, List<Aviso> avisos) throws SQLException {
        String sql = "SELECT nome, vacina, publico_alvo, DATEDIFF(fim, CURDATE()) AS dias "
                + "FROM campanhas_vacinacao "
                + "WHERE CURDATE() BETWEEN inicio AND fim "
                + "ORDER BY fim";

        try (PreparedStatement ps = con.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                int dias = rs.getInt("dias");
                String prazo;
                if (dias == 0) {
                    prazo = "Último dia da campanha de " + rs.getString("vacina");
                } else if (dias == 1) {
                    prazo = "1 dia para o fim da campanha de " + rs.getString("vacina");
                } else {
                    prazo = dias + " dias para o fim da campanha de " + rs.getString("vacina");
                }
                avisos.add(new Aviso(
                        "campanha",
                        prazo,
                        rs.getString("publico_alvo"),
                        dias <= 7 ? Aviso.ALTA : Aviso.BAIXA));
            }
        }
    }

    /** Coloca os avisos de severidade alta primeiro, preservando a ordem interna. */
    private void ordenarPorSeveridade(List<Aviso> avisos) {
        List<Aviso> ordenados = new ArrayList<>(avisos.size());
        for (String nivel : new String[] { Aviso.ALTA, Aviso.MEDIA, Aviso.BAIXA }) {
            for (Aviso a : avisos) {
                if (nivel.equals(a.getSeveridade())) {
                    ordenados.add(a);
                }
            }
        }
        avisos.clear();
        avisos.addAll(ordenados);
    }

    /** Transforma uma quantidade de dias em "20 dias", "8 meses" ou "1 ano". */
    private String humanizar(int dias) {
        if (dias >= 365) {
            int anos = dias / 365;
            return anos == 1 ? "1 ano" : anos + " anos";
        }
        if (dias >= 60) {
            return (dias / 30) + " meses";
        }
        return dias + " dias";
    }

    /** Converte "2026-01-12" (formato do banco) em "12/01/2026". */
    private String formatarData(String iso) {
        if (iso == null || iso.length() < 10) return iso;
        return iso.substring(8, 10) + "/" + iso.substring(5, 7) + "/" + iso.substring(0, 4);
    }
}
