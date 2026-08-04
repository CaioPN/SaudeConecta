package br.com.hackgov.dao;

import br.com.hackgov.db.Conexao;
import br.com.hackgov.modelos.AcessoTemporario;
import br.com.hackgov.modelos.Medico;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * DAO do acesso temporário do médico — tabelas "acessos_temporarios" e
 * "acessos_log".
 *
 * O código mostrado ao médico nunca chega aqui: o ApiServer envia apenas o
 * hash SHA-256 dele, tanto para gravar quanto para procurar.
 */
public class AcessoDAO {

    private static final String SELECT_BASE =
            "SELECT a.id, a.paciente_id, a.escopo, a.criado_em, a.expira_em, a.usado_em, "
            + "       a.revogado_em, m.id AS medico_id, m.nome AS medico_nome, "
            + "       m.especialidade, m.crm "
            + "FROM acessos_temporarios a "
            + "LEFT JOIN medicos m ON m.id = a.medico_id ";

    /** INSERT — cria um acesso válido por `minutos` a partir de agora. */
    public int criar(int idPaciente, String codigoHash, String escopo, int minutos) throws SQLException {
        String sql = "INSERT INTO acessos_temporarios (paciente_id, codigo_hash, escopo, expira_em) "
                + "VALUES (?, ?, ?, ?)";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            ps.setInt(1, idPaciente);
            ps.setString(2, codigoHash);
            ps.setString(3, escopo);
            ps.setTimestamp(4, Timestamp.valueOf(LocalDateTime.now().plusMinutes(minutos)));
            ps.executeUpdate();

            try (ResultSet rs = ps.getGeneratedKeys()) {
                return rs.next() ? rs.getInt(1) : 0;
            }
        }
    }

    /**
     * SELECT — procura um acesso ainda utilizável pelo hash do código: não
     * revogado, dentro da validade e que ainda não foi trocado por um token.
     * Retorna null quando não houver.
     */
    public AcessoTemporario buscarUtilizavelPorHash(String codigoHash) throws SQLException {
        String sql = SELECT_BASE
                + "WHERE a.codigo_hash = ? AND a.revogado_em IS NULL "
                + "  AND a.usado_em IS NULL AND a.expira_em > NOW()";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setString(1, codigoHash);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? montar(rs) : null;
            }
        }
    }

    /**
     * SELECT — acesso ainda válido pelo id. Usado a cada requisição do médico:
     * é isso que faz a revogação valer na hora, sem esperar o token expirar.
     */
    public AcessoTemporario buscarValidoPorId(int id) throws SQLException {
        String sql = SELECT_BASE + "WHERE a.id = ? AND a.revogado_em IS NULL AND a.expira_em > NOW()";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? montar(rs) : null;
            }
        }
    }

    /** SELECT — acessos de um paciente, do mais recente para o mais antigo. */
    public List<AcessoTemporario> listarPorPaciente(int idPaciente) throws SQLException {
        String sql = SELECT_BASE + "WHERE a.paciente_id = ? ORDER BY a.criado_em DESC";
        List<AcessoTemporario> lista = new ArrayList<>();
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, idPaciente);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    lista.add(montar(rs));
                }
            }
        }
        return lista;
    }

    /** UPDATE — marca que o código virou token e registra qual médico o usou. */
    public void marcarUso(int idAcesso, int idMedico) throws SQLException {
        String sql = "UPDATE acessos_temporarios SET usado_em = NOW(), medico_id = ? WHERE id = ?";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, idMedico);
            ps.setInt(2, idAcesso);
            ps.executeUpdate();
        }
    }

    /**
     * UPDATE — revoga um acesso, garantindo que ele pertence ao paciente
     * informado. Retorna true se algo foi revogado.
     */
    public boolean revogar(int idAcesso, int idPaciente) throws SQLException {
        String sql = "UPDATE acessos_temporarios SET revogado_em = NOW() "
                + "WHERE id = ? AND paciente_id = ? AND revogado_em IS NULL";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, idAcesso);
            ps.setInt(2, idPaciente);
            return ps.executeUpdate() > 0;
        }
    }

    /** INSERT — grava uma linha na trilha de auditoria do acesso. */
    public void registrarLog(int idAcesso, String acao, String detalhe) throws SQLException {
        String sql = "INSERT INTO acessos_log (acesso_id, acao, detalhe) VALUES (?, ?, ?)";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, idAcesso);
            ps.setString(2, acao);
            ps.setString(3, detalhe);
            ps.executeUpdate();
        }
    }

    /** SELECT — auditoria de um acesso, da ação mais recente para a mais antiga. */
    public List<String[]> listarLog(int idAcesso) throws SQLException {
        String sql = "SELECT acao, detalhe, criado_em FROM acessos_log "
                + "WHERE acesso_id = ? ORDER BY criado_em DESC";
        List<String[]> lista = new ArrayList<>();
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, idAcesso);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    lista.add(new String[] {
                        rs.getString("acao"),
                        rs.getString("detalhe"),
                        texto(rs.getTimestamp("criado_em")),
                    });
                }
            }
        }
        return lista;
    }

    private AcessoTemporario montar(ResultSet rs) throws SQLException {
        AcessoTemporario a = new AcessoTemporario();
        a.setIdAcesso(rs.getInt("id"));
        a.setIdPaciente(rs.getInt("paciente_id"));
        a.setEscopo(rs.getString("escopo"));
        a.setCriadoEm(texto(rs.getTimestamp("criado_em")));
        a.setExpiraEm(texto(rs.getTimestamp("expira_em")));
        a.setUsadoEm(texto(rs.getTimestamp("usado_em")));
        a.setRevogadoEm(texto(rs.getTimestamp("revogado_em")));

        int idMedico = rs.getInt("medico_id");
        if (!rs.wasNull()) {
            Medico m = new Medico();
            m.setIdMedico(idMedico);
            m.setNome(rs.getString("medico_nome"));
            m.setEspecialidade(rs.getString("especialidade"));
            m.setCrm(rs.getString("crm"));
            a.setMedico(m);
        }
        return a;
    }

    /** Converte o timestamp do banco em texto ISO (2026-08-03T20:15:00). */
    private static String texto(Timestamp t) {
        return t == null ? null : t.toLocalDateTime().toString();
    }
}
