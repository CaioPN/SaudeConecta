package br.com.hackgov.dao;

import br.com.hackgov.db.Conexao;
import br.com.hackgov.modelos.Paciente;

import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

/**
 * DAO da entidade Paciente — SQL da tabela "pacientes".
 * A senha já chega aqui como hash (ver SenhaUtil); nunca gravamos texto puro.
 * Uso de PreparedStatement para evitar SQL Injection.
 */
public class PacienteDAO {

    /** INSERT — cadastra um novo paciente e devolve o id gerado. */
    public int inserir(Paciente p) throws SQLException {
        String sql = "INSERT INTO pacientes "
                + "(nome, email, telefone, cpf, genero, tipo_sanguineo, senha_hash, data_nascimento, "
                + " cep, rua, numero, bairro, cidade, estado) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            ps.setString(1, p.getNome());
            ps.setString(2, p.getEmail());
            ps.setString(3, p.getTelefone());
            ps.setString(4, p.getCpf());
            ps.setString(5, p.getGenero());
            ps.setString(6, p.getTipoSanguineo());
            ps.setString(7, p.getSenhaHash());
            ps.setDate(8, Date.valueOf(p.getDataNascimento()));
            ps.setString(9, p.getCep());
            ps.setString(10, p.getRua());
            ps.setString(11, p.getNumero());
            ps.setString(12, p.getBairro());
            ps.setString(13, p.getCidade());
            ps.setString(14, p.getEstado());
            ps.executeUpdate();

            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) {
                    p.setIdPaciente(rs.getInt(1));
                }
            }
            return p.getIdPaciente();
        }
    }

    /** SELECT — lista todos os pacientes (sem expor o hash de senha). */
    public List<Paciente> listarTodos() throws SQLException {
        String sql = "SELECT id, nome, email, telefone, cpf, genero, tipo_sanguineo, data_nascimento, "
                + "cep, rua, numero, bairro, cidade, estado FROM pacientes ORDER BY nome";
        List<Paciente> pacientes = new ArrayList<>();
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                pacientes.add(mapear(rs, false));
            }
        }
        return pacientes;
    }

    /** SELECT — busca um paciente pelo e-mail (ou null). Inclui o hash p/ login. */
    public Paciente buscarPorEmail(String email) throws SQLException {
        String sql = "SELECT * FROM pacientes WHERE email = ?";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setString(1, email);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return null;
                return mapear(rs, true);
            }
        }
    }

    /** SELECT — busca um paciente pelo id (sem expor o hash de senha). */
    public Paciente buscarPorId(int id) throws SQLException {
        String sql = "SELECT id, nome, email, telefone, cpf, genero, tipo_sanguineo, data_nascimento, "
                + "cep, rua, numero, bairro, cidade, estado FROM pacientes WHERE id = ?";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return null;
                return mapear(rs, false);
            }
        }
    }

    /** Verifica se já existe um paciente com o e-mail informado. */
    public boolean existeEmail(String email) throws SQLException {
        return buscarPorEmail(email) != null;
    }

    /** Verifica se já existe um paciente com o e-mail OU o CPF informado. */
    public boolean existeEmailOuCpf(String email, String cpf) throws SQLException {
        String sql = "SELECT id FROM pacientes WHERE email = ? OR cpf = ?";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setString(1, email);
            ps.setString(2, cpf);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    /**
     * DELETE — remove um paciente pelo id. Retorna true se removeu.
     * Pela regra ON DELETE CASCADE, os dependentes do paciente também são removidos.
     */
    public boolean excluir(int id) throws SQLException {
        String sql = "DELETE FROM pacientes WHERE id = ?";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, id);
            return ps.executeUpdate() > 0;
        }
    }

    /** Converte uma linha do ResultSet em objeto Paciente. */
    private Paciente mapear(ResultSet rs, boolean comHash) throws SQLException {
        Paciente p = new Paciente();
        p.setIdPaciente(rs.getInt("id"));
        p.setNome(rs.getString("nome"));
        p.setEmail(rs.getString("email"));
        p.setTelefone(rs.getString("telefone"));
        p.setCpf(rs.getString("cpf"));
        p.setGenero(rs.getString("genero"));
        p.setTipoSanguineo(rs.getString("tipo_sanguineo"));
        Date dn = rs.getDate("data_nascimento");
        p.setDataNascimento(dn != null ? dn.toString() : null);
        p.setCep(rs.getString("cep"));
        p.setRua(rs.getString("rua"));
        p.setNumero(rs.getString("numero"));
        p.setBairro(rs.getString("bairro"));
        p.setCidade(rs.getString("cidade"));
        p.setEstado(rs.getString("estado"));
        if (comHash) {
            p.setSenhaHash(rs.getString("senha_hash"));
        }
        return p;
    }
}
