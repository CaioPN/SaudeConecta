package br.com.hackgov.dao;

import br.com.hackgov.db.Conexao;
import br.com.hackgov.modelos.RegistroAuditoria;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

/**
 * DAO da trilha de auditoria do paciente — tabela "auditoria".
 *
 * <h3>Por que existe uma fila aqui</h3>
 * Auditar não pode atrasar nem derrubar o atendimento: o paciente pediu o
 * prontuário, não pediu para esperar um INSERT. Então {@link #registrar} não
 * grava — ele <b>enfileira</b> e volta na hora. Uma única thread daemon
 * consome a fila e escreve no banco.
 *
 * A estrutura é uma FILA (FIFO), não uma pilha: a ordem em que as ações
 * aconteceram é o próprio conteúdo da trilha. Entra pelo fim ({@code addLast})
 * e sai pela frente ({@code pollFirst}).
 *
 * Ter um só consumidor também resolve de graça o agrupamento das leituras
 * (ver {@link #houveRecente}): como ninguém mais escreve, não há corrida entre
 * o "já existe uma parecida?" e o INSERT.
 *
 * <h3>O que se perde com isso</h3>
 * A fila mora na memória. Se a JVM for morta com registros pendentes, esses
 * registros somem. É aceitável aqui porque a trilha serve para o paciente
 * saber quem mexeu nos dados dele, não como livro fiscal — e o preço de
 * gravar de forma síncrona seria um INSERT no caminho de toda requisição
 * sensível. O que nunca some é o lado do médico, que é gravado na hora pelo
 * {@link AcessoDAO} dentro da própria transação da ação.
 */
public class AuditoriaDAO {

    /**
     * Janela de agrupamento das ações repetitivas, em minutos. Abrir a tela de
     * exames três vezes em cinco minutos é uma consulta só para quem lê a
     * trilha; sem isso, o React gravaria uma linha a cada montagem de tela.
     */
    private static final int MINUTOS_AGRUPAMENTO = 10;

    /**
     * Teto da fila. Se o banco cair, a fila para de esvaziar — melhor descartar
     * registro de auditoria do que estourar a memória da API e derrubar o app.
     */
    private static final int LIMITE_FILA = 500;

    private static final Deque<RegistroAuditoria> FILA = new ArrayDeque<>();

    private static Thread gravador;

    /**
     * Enfileira uma ação para ser gravada. Nunca lança exceção: falha de
     * auditoria não pode virar erro na resposta do paciente.
     *
     * @param agrupavel true para leituras, que se repetem a cada abertura de tela
     */
    public void registrar(int idPaciente, String acao, String recurso,
                          String detalhe, String origemIp, boolean agrupavel) {
        if (idPaciente <= 0 || acao == null) return;

        RegistroAuditoria r = new RegistroAuditoria(
                idPaciente, acao, recurso, limitar(detalhe, 255), limitar(origemIp, 45), agrupavel);

        garantirGravador();
        synchronized (FILA) {
            if (FILA.size() >= LIMITE_FILA) return;
            FILA.addLast(r);
            FILA.notifyAll();
        }
    }

    /**
     * SELECT — trilha de um paciente, da ação mais recente para a mais antiga.
     *
     * O filtro é sempre pelo paciente do JWT; não existe rota que receba o id
     * de outro por parâmetro. O limite existe porque a tela mostra histórico,
     * não relatório.
     */
    public List<RegistroAuditoria> listarPorPaciente(int idPaciente, int limite) throws SQLException {
        String sql = "SELECT id, paciente_id, acao, recurso, detalhe, origem_ip, criado_em "
                + "FROM auditoria WHERE paciente_id = ? "
                + "ORDER BY criado_em DESC, id DESC LIMIT ?";

        List<RegistroAuditoria> lista = new ArrayList<>();
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, idPaciente);
            ps.setInt(2, limite);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    RegistroAuditoria r = new RegistroAuditoria();
                    r.setIdRegistro(rs.getInt("id"));
                    r.setIdPaciente(rs.getInt("paciente_id"));
                    r.setAcao(rs.getString("acao"));
                    r.setRecurso(rs.getString("recurso"));
                    r.setDetalhe(rs.getString("detalhe"));
                    r.setOrigemIp(rs.getString("origem_ip"));
                    r.setCriadoEm(texto(rs.getTimestamp("criado_em")));
                    lista.add(r);
                }
            }
        }
        return lista;
    }

    // ===================== FILA DE GRAVAÇÃO =====================

    /** Sobe a thread consumidora na primeira ação auditada da execução. */
    private static synchronized void garantirGravador() {
        if (gravador != null && gravador.isAlive()) return;
        gravador = new Thread(AuditoriaDAO::consumirFila, "auditoria");
        gravador.setDaemon(true);
        gravador.start();
    }

    /** Tira um registro por vez da frente da fila e grava; dorme quando ela esvazia. */
    private static void consumirFila() {
        while (true) {
            RegistroAuditoria r;
            synchronized (FILA) {
                while (FILA.isEmpty()) {
                    try {
                        FILA.wait();
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        return;
                    }
                }
                r = FILA.pollFirst();
            }
            try {
                gravar(r);
            } catch (SQLException e) {
                // Uma gravação perdida não pode matar a thread e cegar a trilha inteira.
                System.out.println("[auditoria] falha ao gravar '" + r.getAcao() + "': " + e.getMessage());
            }
        }
    }

    private static void gravar(RegistroAuditoria r) throws SQLException {
        String sql = "INSERT INTO auditoria (paciente_id, acao, recurso, detalhe, origem_ip) "
                + "VALUES (?, ?, ?, ?, ?)";
        try (Connection con = Conexao.abrir()) {
            if (r.isAgrupavel() && houveRecente(con, r)) return;

            try (PreparedStatement ps = con.prepareStatement(sql)) {
                ps.setInt(1, r.getIdPaciente());
                ps.setString(2, r.getAcao());
                ps.setString(3, r.getRecurso());
                ps.setString(4, r.getDetalhe());
                ps.setString(5, r.getOrigemIp());
                ps.executeUpdate();
            }
        }
    }

    /**
     * true quando a MESMA ação, sobre o MESMO alvo, já foi gravada há pouco.
     *
     * O detalhe entra na comparação porque é ele que diz de quem é o dado
     * aberto: abrir os exames do titular e, em seguida, os de um dependente
     * são duas leituras diferentes, e agrupar só por ação esconderia a
     * segunda. O operador <=> do MySQL é a igualdade que trata NULL como
     * valor — com "=" comum, o detalhe nulo do titular nunca casaria consigo
     * mesmo e toda leitura dele viraria linha nova.
     */
    private static boolean houveRecente(Connection con, RegistroAuditoria r) throws SQLException {
        String sql = "SELECT 1 FROM auditoria WHERE paciente_id = ? AND acao = ? "
                + "AND detalhe <=> ? AND criado_em > (NOW() - INTERVAL ? MINUTE) LIMIT 1";
        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setInt(1, r.getIdPaciente());
            ps.setString(2, r.getAcao());
            ps.setString(3, r.getDetalhe());
            ps.setInt(4, MINUTOS_AGRUPAMENTO);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    private static String limitar(String s, int max) {
        if (s == null) return null;
        String t = s.trim();
        if (t.isEmpty()) return null;
        return t.length() <= max ? t : t.substring(0, max);
    }

    /** Converte o timestamp do banco em texto ISO (2026-08-03T20:15:00). */
    private static String texto(Timestamp t) {
        return t == null ? null : t.toLocalDateTime().toString();
    }
}
