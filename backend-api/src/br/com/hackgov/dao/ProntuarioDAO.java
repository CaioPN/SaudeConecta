package br.com.hackgov.dao;

import br.com.hackgov.db.Conexao;
import br.com.hackgov.modelos.Alergia;
import br.com.hackgov.modelos.HistoricoMedico;
import br.com.hackgov.modelos.Medicacao;

import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Types;
import java.util.ArrayList;
import java.util.List;

/**
 * DAO do prontuário — SQL das tabelas "alergias", "condicoes" e "medicacoes".
 *
 * As três seguem a mesma convenção das demais tabelas clínicas: paciente_id é
 * o dono da conta e dependente_id NULL significa "registro do titular".
 */
public class ProntuarioDAO {

    /** Cláusula de filtro reutilizada pelas três consultas. */
    private static String filtro(Integer idDependente) {
        return "WHERE paciente_id = ? "
                + (idDependente == null ? "AND dependente_id IS NULL " : "AND dependente_id = ? ");
    }

    /** Preenche os parâmetros do filtro (paciente e, se houver, dependente). */
    private static void aplicarFiltro(PreparedStatement ps, int idPaciente, Integer idDependente)
            throws SQLException {
        ps.setInt(1, idPaciente);
        if (idDependente != null) {
            ps.setInt(2, idDependente);
        }
    }

    /** SELECT — alergias registradas. */
    public List<Alergia> listarAlergias(int idPaciente, Integer idDependente) throws SQLException {
        String sql = "SELECT id, paciente_id, dependente_id, descricao FROM alergias "
                + filtro(idDependente) + "ORDER BY descricao";

        List<Alergia> lista = new ArrayList<>();
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            aplicarFiltro(ps, idPaciente, idDependente);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Alergia a = new Alergia();
                    a.setIdAlergia(rs.getInt("id"));
                    a.setIdPaciente(rs.getInt("paciente_id"));
                    a.setIdDependente(rs.getInt("dependente_id"));
                    a.setDescricao(rs.getString("descricao"));
                    lista.add(a);
                }
            }
        }
        return lista;
    }

    /** SELECT — condições de saúde acompanhadas (hipertensão, diabetes...). */
    public List<HistoricoMedico> listarCondicoes(int idPaciente, Integer idDependente) throws SQLException {
        String sql = "SELECT id, paciente_id, dependente_id, descricao, desde FROM condicoes "
                + filtro(idDependente) + "ORDER BY descricao";

        List<HistoricoMedico> lista = new ArrayList<>();
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            aplicarFiltro(ps, idPaciente, idDependente);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    HistoricoMedico h = new HistoricoMedico();
                    h.setIdHistorico(rs.getInt("id"));
                    h.setIdPaciente(rs.getInt("paciente_id"));
                    h.setIdDependente(rs.getInt("dependente_id"));
                    h.setDescricao(rs.getString("descricao"));
                    Date desde = rs.getDate("desde");
                    h.setData(desde != null ? desde.toString() : null);
                    lista.add(h);
                }
            }
        }
        return lista;
    }

    /** SELECT — medicações em uso. */
    public List<Medicacao> listarMedicacoes(int idPaciente, Integer idDependente) throws SQLException {
        String sql = "SELECT id, paciente_id, dependente_id, nome, dosagem, frequencia, desde "
                + "FROM medicacoes " + filtro(idDependente) + "ORDER BY nome";

        List<Medicacao> lista = new ArrayList<>();
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            aplicarFiltro(ps, idPaciente, idDependente);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Medicacao m = new Medicacao();
                    m.setIdMedicacao(rs.getInt("id"));
                    m.setIdPaciente(rs.getInt("paciente_id"));
                    m.setIdDependente(rs.getInt("dependente_id"));
                    m.setNome(rs.getString("nome"));
                    m.setDosagem(rs.getString("dosagem"));
                    m.setFrequencia(rs.getString("frequencia"));
                    Date desde = rs.getDate("desde");
                    m.setDesde(desde != null ? desde.toString() : null);
                    lista.add(m);
                }
            }
        }
        return lista;
    }

    // ===================== ESCRITA (PORTAL DO MÉDICO) =====================
    //
    // Quem chama estes métodos é o médico que entrou com um acesso temporário
    // de escopo "escrita". O paciente vem sempre do acesso reconferido no
    // banco, nunca do corpo da requisição, e dependente_id fica NULL porque o
    // acesso temporário é só do titular da conta.
    //
    // Não existe UPDATE aqui de propósito: no prontuário, corrigir é remover o
    // registro errado e lançar o certo, e as duas operações ficam separadas na
    // trilha do acesso. Um UPDATE apagaria o que estava escrito antes sem
    // deixar rastro de que existiu.

    /** Tabelas que o médico pode alimentar — a rota escolhe entre estas três. */
    public static final String TABELA_ALERGIA = "alergias";
    public static final String TABELA_CONDICAO = "condicoes";
    public static final String TABELA_MEDICACAO = "medicacoes";

    /** INSERT — registra uma alergia; devolve o id gerado. */
    public int inserirAlergia(int idPaciente, String descricao) throws SQLException {
        String sql = "INSERT INTO alergias (paciente_id, dependente_id, descricao) VALUES (?, NULL, ?)";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            ps.setInt(1, idPaciente);
            ps.setString(2, descricao);
            ps.executeUpdate();
            return idGerado(ps);
        }
    }

    /** INSERT — registra uma condição acompanhada; `desde` aceita null. */
    public int inserirCondicao(int idPaciente, String descricao, String desde) throws SQLException {
        String sql = "INSERT INTO condicoes (paciente_id, dependente_id, descricao, desde) "
                + "VALUES (?, NULL, ?, ?)";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            ps.setInt(1, idPaciente);
            ps.setString(2, descricao);
            aplicarData(ps, 3, desde);
            ps.executeUpdate();
            return idGerado(ps);
        }
    }

    /** INSERT — registra uma medicação em uso; `desde` aceita null. */
    public int inserirMedicacao(int idPaciente, String nome, String dosagem,
                                String frequencia, String desde) throws SQLException {
        String sql = "INSERT INTO medicacoes "
                + "(paciente_id, dependente_id, nome, dosagem, frequencia, desde) "
                + "VALUES (?, NULL, ?, ?, ?, ?)";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            ps.setInt(1, idPaciente);
            ps.setString(2, nome);
            ps.setString(3, dosagem);
            ps.setString(4, frequencia);
            aplicarData(ps, 5, desde);
            ps.executeUpdate();
            return idGerado(ps);
        }
    }

    /**
     * DELETE — remove um item do prontuário do paciente informado.
     *
     * O nome da tabela é concatenado no SQL, mas ele nunca vem do cliente: a
     * rota traduz o tipo recebido para uma das três constantes acima e passa a
     * constante. Os dois valores que vêm de fora (id e paciente) continuam em
     * PreparedStatement, como manda a regra do projeto.
     */
    public boolean excluir(String tabela, int id, int idPaciente) throws SQLException {
        String sql = "DELETE FROM " + tabela + " WHERE id = ? AND paciente_id = ?";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, id);
            ps.setInt(2, idPaciente);
            return ps.executeUpdate() > 0;
        }
    }

    /**
     * Texto que identifica um item, lido ANTES do DELETE — depois de excluir
     * não há de onde tirar o que escrever na trilha do acesso.
     * A coluna também é escolhida pela rota, nunca pelo cliente.
     */
    public String descricaoDe(String tabela, String coluna, int id, int idPaciente) throws SQLException {
        String sql = "SELECT " + coluna + " AS texto FROM " + tabela + " WHERE id = ? AND paciente_id = ?";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, id);
            ps.setInt(2, idPaciente);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? rs.getString("texto") : null;
            }
        }
    }

    /** Grava uma data ISO (YYYY-MM-DD) ou NULL quando ela não veio. */
    private static void aplicarData(PreparedStatement ps, int posicao, String iso) throws SQLException {
        if (iso == null || iso.isBlank()) {
            ps.setNull(posicao, Types.DATE);
            return;
        }
        try {
            ps.setDate(posicao, Date.valueOf(iso));
        } catch (IllegalArgumentException e) {
            // Data mal formatada vira "não informada" em vez de derrubar o registro.
            ps.setNull(posicao, Types.DATE);
        }
    }

    private static int idGerado(PreparedStatement ps) throws SQLException {
        try (ResultSet rs = ps.getGeneratedKeys()) {
            return rs.next() ? rs.getInt(1) : 0;
        }
    }
}
