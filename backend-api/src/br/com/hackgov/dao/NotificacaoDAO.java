package br.com.hackgov.dao;

import br.com.hackgov.db.Conexao;
import br.com.hackgov.modelos.Notificacao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;

/**
 * DAO da entidade Notificacao — SQL da tabela "notificacoes".
 *
 * Quem cria notificação hoje é o portal do médico: ao registrar uma consulta
 * ou um exame no prontuário de alguém, o paciente precisa ficar sabendo sem
 * depender de abrir a tela certa por acaso.
 *
 * A gravação aqui é SÍNCRONA, ao contrário da fila do {@link AuditoriaDAO}.
 * A diferença é o dono da espera: a auditoria atrasaria o paciente que só
 * queria ver o próprio prontuário, enquanto a notificação nasce dentro de um
 * POST do médico que já está gravando no banco de qualquer jeito — e perdê-la
 * numa fila faria o paciente nunca saber do registro.
 */
public class NotificacaoDAO {

    /** Tipos aceitos, para o tipo nunca chegar ao banco vindo do corpo da requisição. */
    public static final String TIPO_CONSULTA = "consulta";
    public static final String TIPO_EXAME = "exame";
    public static final String TIPO_PRONTUARIO = "prontuario";
    public static final String TIPO_ACESSO = "acesso";

    /** INSERT — cria a notificação. */
    public void inserir(int idPaciente, String tipo, String mensagem) throws SQLException {
        String sql = "INSERT INTO notificacoes (paciente_id, tipo, mensagem) VALUES (?, ?, ?)";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, idPaciente);
            ps.setString(2, tipo);
            ps.setString(3, limitar(mensagem));
            ps.executeUpdate();
        }
    }

    /**
     * INSERT que nunca lança — usado dentro das rotas do médico.
     *
     * A consulta já foi gravada quando esta chamada acontece; falhar em criar
     * o aviso não pode desfazer o atendimento nem devolver erro para o médico,
     * que faria ele registrar tudo de novo e duplicar a consulta.
     */
    public void inserirSemFalhar(int idPaciente, String tipo, String mensagem) {
        try {
            inserir(idPaciente, tipo, mensagem);
        } catch (SQLException e) {
            System.out.println("[notificacao] falha ao criar '" + tipo + "': " + e.getMessage());
        }
    }

    /**
     * SELECT — notificações do paciente, da mais recente para a mais antiga.
     *
     * @param apenasNaoLidas true para trazer só as que ainda não foram lidas
     */
    public List<Notificacao> listarPorPaciente(int idPaciente, boolean apenasNaoLidas, int limite)
            throws SQLException {
        String sql = "SELECT id, paciente_id, tipo, mensagem, criado_em, lida_em "
                + "FROM notificacoes WHERE paciente_id = ? "
                + (apenasNaoLidas ? "AND lida_em IS NULL " : "")
                + "ORDER BY criado_em DESC, id DESC LIMIT ?";

        List<Notificacao> lista = new ArrayList<>();
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, idPaciente);
            ps.setInt(2, limite);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Notificacao n = new Notificacao();
                    n.setIdNotificacao(rs.getInt("id"));
                    n.setIdPaciente(rs.getInt("paciente_id"));
                    n.setTipo(rs.getString("tipo"));
                    n.setMensagem(rs.getString("mensagem"));
                    n.setDataEnvio(texto(rs.getTimestamp("criado_em")));
                    n.setLidaEm(texto(rs.getTimestamp("lida_em")));
                    lista.add(n);
                }
            }
        }
        return lista;
    }

    /** SELECT — quantas notificações o paciente ainda não leu. */
    public int contarNaoLidas(int idPaciente) throws SQLException {
        String sql = "SELECT COUNT(*) FROM notificacoes WHERE paciente_id = ? AND lida_em IS NULL";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, idPaciente);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? rs.getInt(1) : 0;
            }
        }
    }

    /**
     * UPDATE — marca uma notificação como lida.
     *
     * O filtro por paciente_id é o que impede alguém de marcar a notificação
     * de outro passando um id na URL. A condição "lida_em IS NULL" deixa a
     * operação repetível: clicar duas vezes não reescreve a hora da leitura.
     */
    public boolean marcarLida(int id, int idPaciente) throws SQLException {
        String sql = "UPDATE notificacoes SET lida_em = NOW() "
                + "WHERE id = ? AND paciente_id = ? AND lida_em IS NULL";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, id);
            ps.setInt(2, idPaciente);
            return ps.executeUpdate() > 0;
        }
    }

    /** UPDATE — marca todas as pendentes do paciente como lidas; devolve quantas. */
    public int marcarTodasLidas(int idPaciente) throws SQLException {
        String sql = "UPDATE notificacoes SET lida_em = NOW() "
                + "WHERE paciente_id = ? AND lida_em IS NULL";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, idPaciente);
            return ps.executeUpdate();
        }
    }

    private static String limitar(String s) {
        if (s == null) return "";
        String t = s.trim();
        return t.length() <= 255 ? t : t.substring(0, 255);
    }

    /** Converte o timestamp do banco em texto ISO (2026-08-03T20:15:00). */
    private static String texto(Timestamp t) {
        return t == null ? null : t.toLocalDateTime().toString();
    }
}
