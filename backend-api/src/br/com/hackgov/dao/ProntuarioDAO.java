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
}
