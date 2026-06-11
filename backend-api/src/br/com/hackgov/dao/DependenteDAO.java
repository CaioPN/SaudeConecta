package br.com.hackgov.dao;

import br.com.hackgov.db.Conexao;
import br.com.hackgov.modelos.Dependente;

import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

/**
 * DAO da entidade Dependente — SQL da tabela "dependentes".
 * Cada dependente pertence a um paciente (paciente_id).
 */
public class DependenteDAO {

    /** INSERT — cadastra um dependente vinculado a um paciente. */
    public int inserir(Dependente d) throws SQLException {
        String sql = "INSERT INTO dependentes "
                + "(paciente_id, nome, cpf, genero, tipo_sanguineo, data_nascimento) "
                + "VALUES (?, ?, ?, ?, ?, ?)";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            ps.setInt(1, d.getIdPaciente());
            ps.setString(2, d.getNome());
            ps.setString(3, d.getCpf());
            ps.setString(4, d.getGenero());
            ps.setString(5, d.getTipoSanguineo());
            ps.setDate(6, Date.valueOf(d.getDataNascimento()));
            ps.executeUpdate();

            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) {
                    d.setId(rs.getInt(1));
                }
            }
            return d.getId();
        }
    }

    /** SELECT — lista os dependentes de um paciente. */
    public List<Dependente> listarPorPaciente(int idPaciente) throws SQLException {
        String sql = "SELECT id, paciente_id, nome, cpf, genero, tipo_sanguineo, data_nascimento "
                + "FROM dependentes WHERE paciente_id = ? ORDER BY nome";
        List<Dependente> lista = new ArrayList<>();
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, idPaciente);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Dependente d = new Dependente();
                    d.setId(rs.getInt("id"));
                    d.setIdPaciente(rs.getInt("paciente_id"));
                    d.setNome(rs.getString("nome"));
                    d.setCpf(rs.getString("cpf"));
                    d.setGenero(rs.getString("genero"));
                    d.setTipoSanguineo(rs.getString("tipo_sanguineo"));
                    Date dn = rs.getDate("data_nascimento");
                    d.setDataNascimento(dn != null ? dn.toString() : null);
                    lista.add(d);
                }
            }
        }
        return lista;
    }

    /** DELETE — remove um dependente pelo id. Retorna true se removeu. */
    public boolean excluir(int id) throws SQLException {
        String sql = "DELETE FROM dependentes WHERE id = ?";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, id);
            return ps.executeUpdate() > 0;
        }
    }

    /**
     * DELETE — remove um dependente garantindo que ele pertence ao paciente
     * informado (evita que um paciente apague dependente de outro).
     * Retorna true se algo foi removido.
     */
    public boolean excluirDoPaciente(int id, int idPaciente) throws SQLException {
        String sql = "DELETE FROM dependentes WHERE id = ? AND paciente_id = ?";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, id);
            ps.setInt(2, idPaciente);
            return ps.executeUpdate() > 0;
        }
    }
}
