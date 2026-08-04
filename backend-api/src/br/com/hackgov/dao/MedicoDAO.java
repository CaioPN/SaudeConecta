package br.com.hackgov.dao;

import br.com.hackgov.db.Conexao;
import br.com.hackgov.modelos.Medico;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * DAO da entidade Medico — SQL da tabela "medicos".
 *
 * Não existe cadastro prévio de médicos: quando um profissional usa o código
 * do paciente pela primeira vez, o registro é criado a partir do CRM informado.
 */
public class MedicoDAO {

    /** SELECT — busca um médico pelo CRM. Retorna null se não existir. */
    public Medico buscarPorCrm(String crm) throws SQLException {
        String sql = "SELECT id, nome, especialidade, crm, telefone FROM medicos WHERE crm = ?";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setString(1, crm);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return null;
                Medico m = new Medico();
                m.setIdMedico(rs.getInt("id"));
                m.setNome(rs.getString("nome"));
                m.setEspecialidade(rs.getString("especialidade"));
                m.setCrm(rs.getString("crm"));
                m.setTelefone(rs.getString("telefone"));
                return m;
            }
        }
    }

    /** INSERT — cadastra um médico e devolve o id gerado. */
    public int inserir(Medico m) throws SQLException {
        String sql = "INSERT INTO medicos (nome, especialidade, crm, telefone) VALUES (?, ?, ?, ?)";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            ps.setString(1, m.getNome());
            ps.setString(2, m.getEspecialidade());
            ps.setString(3, m.getCrm());
            ps.setString(4, m.getTelefone());
            ps.executeUpdate();

            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) {
                    m.setIdMedico(rs.getInt(1));
                }
            }
            return m.getIdMedico();
        }
    }

    /**
     * Busca o médico pelo CRM e, se não existir, cadastra com os dados
     * informados. Devolve sempre um médico com id preenchido.
     */
    public Medico buscarOuCriar(String nome, String especialidade, String crm) throws SQLException {
        Medico existente = buscarPorCrm(crm);
        if (existente != null) return existente;

        Medico novo = new Medico();
        novo.setNome(nome);
        novo.setEspecialidade(especialidade);
        novo.setCrm(crm);
        inserir(novo);
        return novo;
    }
}
