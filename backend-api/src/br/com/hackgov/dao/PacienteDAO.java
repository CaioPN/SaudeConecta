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

    // ===================== RECUPERAÇÃO DE SENHA =====================

    /**
     * SELECT — confere a identidade de quem esqueceu a senha.
     *
     * Só devolve o paciente quando e-mail, CPF e data de nascimento batem os
     * três. Não existe serviço de e-mail no projeto (seria uma dependência
     * nova, e o backend é Java puro de propósito), então o que substitui o
     * link enviado por e-mail é a conferência de dados que só o titular tem
     * junto — é mais fraco que um link, e a rota que chama este método aplica
     * limite de tentativas por IP por causa disso.
     *
     * A comparação da data é feita no SQL, com a coluna DATE do banco, para
     * não depender do formato do texto que chegou na requisição.
     */
    public Paciente buscarParaRecuperacao(String email, String cpf, String dataNascimento)
            throws SQLException {
        String sql = "SELECT id, nome, email, telefone, cpf, genero, tipo_sanguineo, data_nascimento, "
                + "cep, rua, numero, bairro, cidade, estado FROM pacientes "
                + "WHERE email = ? AND cpf = ? AND data_nascimento = ?";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setString(1, email);
            ps.setString(2, cpf);
            try {
                ps.setDate(3, Date.valueOf(dataNascimento));
            } catch (IllegalArgumentException e) {
                return null; // data mal formatada não casa com ninguém
            }
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return null;
                return mapear(rs, false);
            }
        }
    }

    /**
     * UPDATE — troca o hash da senha. A senha chega aqui já com hash
     * (ver SenhaUtil); texto puro nunca passa por este método.
     */
    /**
     * UPDATE — dados que o paciente pode corrigir sozinho: telefone e endereço.
     *
     * Nome, CPF, data de nascimento, gênero e tipo sanguíneo NÃO entram aqui.
     * São dados de identificação e de saúde que o atendimento usa para
     * reconhecer a pessoa: mudá-los pela tela transformaria a conta em outra
     * pessoa sem nenhuma conferência, e o tipo sanguíneo errado num pronto-
     * socorro é o pior erro possível neste app. O e-mail também fica de fora,
     * porque é a chave do login e da recuperação de senha.
     *
     * Devolve true se alguma linha foi alterada.
     */
    public boolean atualizarContato(int id, String telefone, String cep, String rua,
                                    String numero, String bairro, String cidade, String estado)
            throws SQLException {
        String sql = "UPDATE pacientes SET telefone = ?, cep = ?, rua = ?, numero = ?, "
                + "       bairro = ?, cidade = ?, estado = ? WHERE id = ?";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setString(1, telefone);
            ps.setString(2, cep);
            ps.setString(3, rua);
            ps.setString(4, numero);
            ps.setString(5, bairro);
            ps.setString(6, cidade);
            ps.setString(7, estado);
            ps.setInt(8, id);
            return ps.executeUpdate() > 0;
        }
    }

    /** UPDATE — UBS que o paciente escolheu como referência (null para tirar). */
    public boolean atualizarUnidadeReferencia(int id, Integer codigoCnes) throws SQLException {
        String sql = "UPDATE pacientes SET unidade_referencia = ? WHERE id = ?";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            if (codigoCnes == null) {
                ps.setNull(1, java.sql.Types.INTEGER);
            } else {
                ps.setInt(1, codigoCnes);
            }
            ps.setInt(2, id);
            return ps.executeUpdate() > 0;
        }
    }

    /** SELECT — o código CNES da UBS de referência, ou null se não escolheu. */
    public Integer unidadeReferencia(int id) throws SQLException {
        String sql = "SELECT unidade_referencia FROM pacientes WHERE id = ?";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return null;
                int codigo = rs.getInt(1);
                return rs.wasNull() ? null : codigo;
            }
        }
    }

    public boolean atualizarSenha(int id, String senhaHash) throws SQLException {
        String sql = "UPDATE pacientes SET senha_hash = ? WHERE id = ?";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setString(1, senhaHash);
            ps.setInt(2, id);
            return ps.executeUpdate() > 0;
        }
    }
}
