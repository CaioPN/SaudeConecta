package br.com.hackgov.dao;

import br.com.hackgov.db.Conexao;
import br.com.hackgov.modelos.Familiar;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

/**
 * DAO da entidade Familiar — SQL da tabela "familiares".
 *
 * São os contatos de emergência do paciente: quem avisar se algo acontecer.
 * O paciente é sempre o dono da lista, e todo SELECT/DELETE filtra por
 * paciente_id — nenhuma rota recebe o id de outro titular por parâmetro.
 *
 * O id do paciente entra por parâmetro em vez de sair do objeto Familiar
 * porque o POJO guarda um Paciente inteiro, e a camada de rota tem só o id
 * que veio do JWT — montar um Paciente falso só para carregar um número
 * deixaria o modelo com um objeto pela metade.
 */
public class FamiliarDAO {

    /** SELECT — contatos de emergência de um paciente, em ordem de cadastro. */
    public List<Familiar> listarPorPaciente(int idPaciente) throws SQLException {
        String sql = "SELECT id, nome, parentesco, telefone FROM familiares "
                + "WHERE paciente_id = ? ORDER BY id";

        List<Familiar> lista = new ArrayList<>();
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, idPaciente);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Familiar f = new Familiar();
                    f.setIdFamiliar(rs.getInt("id"));
                    f.setNome(rs.getString("nome"));
                    f.setParentesco(rs.getString("parentesco"));
                    f.setTelefone(rs.getString("telefone"));
                    lista.add(f);
                }
            }
        }
        return lista;
    }

    /** INSERT — cadastra um contato e devolve o id gerado (também gravado no objeto). */
    public int inserir(int idPaciente, Familiar f) throws SQLException {
        String sql = "INSERT INTO familiares (paciente_id, nome, parentesco, telefone) "
                + "VALUES (?, ?, ?, ?)";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            ps.setInt(1, idPaciente);
            ps.setString(2, f.getNome());
            ps.setString(3, f.getParentesco());
            ps.setString(4, f.getTelefone());
            ps.executeUpdate();

            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) {
                    f.setIdFamiliar(rs.getInt(1));
                }
            }
            return f.getIdFamiliar();
        }
    }

    /**
     * SELECT — nome de um contato do paciente, ou null se não for dele.
     * Usado antes de excluir: depois do DELETE não há de onde tirar o nome
     * para a trilha de auditoria.
     */
    public String nomeDoPaciente(int id, int idPaciente) throws SQLException {
        String sql = "SELECT nome FROM familiares WHERE id = ? AND paciente_id = ?";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, id);
            ps.setInt(2, idPaciente);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? rs.getString("nome") : null;
            }
        }
    }

    /** DELETE — remove um contato, desde que ele seja do paciente informado. */
    public boolean excluirDoPaciente(int id, int idPaciente) throws SQLException {
        String sql = "DELETE FROM familiares WHERE id = ? AND paciente_id = ?";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, id);
            ps.setInt(2, idPaciente);
            return ps.executeUpdate() > 0;
        }
    }
}
