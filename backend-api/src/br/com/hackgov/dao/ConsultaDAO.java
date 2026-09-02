package br.com.hackgov.dao;

import br.com.hackgov.db.Conexao;
import br.com.hackgov.modelos.Consulta;
import br.com.hackgov.modelos.Medico;

import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Time;
import java.sql.Types;
import java.util.ArrayList;
import java.util.List;

/**
 * DAO da entidade Consulta — SQL da tabela "consultas".
 *
 * Toda consulta pertence a um paciente (paciente_id). Quando dependente_id
 * está preenchido, a consulta é de um dependente daquele paciente; quando é
 * NULL, é do titular da conta.
 */
public class ConsultaDAO {

    private static final String SELECT_BASE =
            "SELECT c.id, c.paciente_id, c.dependente_id, c.data, c.hora, c.local, c.motivo, c.unidade_cnes, "
            + "       c.status, c.resumo, c.conduta, "
            + "       m.id AS medico_id, m.nome AS medico_nome, m.especialidade, m.crm "
            + "FROM consultas c "
            + "JOIN medicos m ON m.id = c.medico_id ";

    /**
     * SELECT — lista as consultas de um paciente.
     *
     * @param idDependente null para trazer as consultas do titular; um id para
     *                     trazer as do dependente informado.
     */
    public List<Consulta> listarPorPaciente(int idPaciente, Integer idDependente) throws SQLException {
        String sql = SELECT_BASE
                + "WHERE c.paciente_id = ? "
                + (idDependente == null ? "AND c.dependente_id IS NULL " : "AND c.dependente_id = ? ")
                + "ORDER BY c.data DESC, c.hora DESC";

        List<Consulta> lista = new ArrayList<>();
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, idPaciente);
            if (idDependente != null) {
                ps.setInt(2, idDependente);
            }
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    lista.add(montar(rs));
                }
            }
        }
        return lista;
    }

    /**
     * SELECT — busca uma consulta garantindo que ela pertence ao paciente
     * informado (evita que um paciente leia a consulta de outro).
     * Retorna null se não encontrar.
     */
    public Consulta buscarDoPaciente(int id, int idPaciente) throws SQLException {
        String sql = SELECT_BASE + "WHERE c.id = ? AND c.paciente_id = ?";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, id);
            ps.setInt(2, idPaciente);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? montar(rs) : null;
            }
        }
    }

    /**
     * INSERT — registra uma consulta. Usado pelo médico que entrou com um
     * acesso temporário; `idAcesso` fica gravado como autoria do registro.
     */
    /**
     * SELECT — consultas agendadas que acontecem nos próximos dias, do titular
     * e dos dependentes, para o gerador de lembretes.
     *
     * Devolve linhas cruas ({id, data, hora, médico, dependente}) em vez de
     * objetos Consulta porque quem chama só monta uma frase: carregar o modelo
     * inteiro seria buscar resumo e conduta que ninguém vai ler.
     */
    public List<String[]> listarParaLembrete(int idPaciente, int dias) throws SQLException {
        String sql = "SELECT c.id, c.data, c.hora, m.nome AS medico, d.nome AS dependente "
                + "FROM consultas c "
                + "JOIN medicos m ON m.id = c.medico_id "
                + "LEFT JOIN dependentes d ON d.id = c.dependente_id "
                + "WHERE c.paciente_id = ? AND c.status = 'agendada' "
                + "  AND c.data BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY) "
                + "ORDER BY c.data, c.hora";

        List<String[]> lista = new ArrayList<>();
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, idPaciente);
            ps.setInt(2, dias);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    lista.add(new String[] {
                        String.valueOf(rs.getInt("id")),
                        rs.getString("data"),
                        rs.getString("hora"),
                        rs.getString("medico"),
                        rs.getString("dependente"),
                    });
                }
            }
        }
        return lista;
    }

    public int inserir(Consulta c, int idAcesso) throws SQLException {
        String sql = "INSERT INTO consultas "
                + "(paciente_id, dependente_id, medico_id, data, hora, local, motivo, status, "
                + " resumo, conduta, unidade_cnes, acesso_id) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            ps.setInt(1, c.getIdPaciente());
            if (c.getIdDependente() > 0) {
                ps.setInt(2, c.getIdDependente());
            } else {
                ps.setNull(2, Types.INTEGER);
            }
            ps.setInt(3, c.getMedico().getIdMedico());
            ps.setDate(4, Date.valueOf(c.getData()));
            ps.setTime(5, Time.valueOf(c.getHora().length() == 5 ? c.getHora() + ":00" : c.getHora()));
            ps.setString(6, c.getLocal());
            ps.setString(7, c.getMotivo());
            ps.setString(8, c.getStatus());
            ps.setString(9, c.getResumo());
            ps.setString(10, c.getConduta());
            if (c.getUnidadeCnes() == null) {
                ps.setNull(11, Types.INTEGER);
            } else {
                ps.setInt(11, c.getUnidadeCnes());
            }
            ps.setInt(12, idAcesso);
            ps.executeUpdate();

            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) {
                    c.setIdConsulta(rs.getInt(1));
                }
            }
            return c.getIdConsulta();
        }
    }

    /** Converte a linha atual do ResultSet em um objeto Consulta. */
    private Consulta montar(ResultSet rs) throws SQLException {
        Consulta c = new Consulta();
        c.setIdConsulta(rs.getInt("id"));
        c.setIdPaciente(rs.getInt("paciente_id"));
        c.setIdDependente(rs.getInt("dependente_id")); // 0 quando NULL

        Date data = rs.getDate("data");
        c.setData(data != null ? data.toString() : null);

        Time hora = rs.getTime("hora");
        // Guarda como HH:mm — o segundo do banco não interessa para a tela.
        c.setHora(hora != null ? hora.toString().substring(0, 5) : null);

        c.setLocal(rs.getString("local"));
        c.setMotivo(rs.getString("motivo"));
        c.setStatus(rs.getString("status"));
        c.setResumo(rs.getString("resumo"));
        c.setConduta(rs.getString("conduta"));

        int cnes = rs.getInt("unidade_cnes");
        c.setUnidadeCnes(rs.wasNull() ? null : cnes);

        Medico m = new Medico();
        m.setIdMedico(rs.getInt("medico_id"));
        m.setNome(rs.getString("medico_nome"));
        m.setEspecialidade(rs.getString("especialidade"));
        m.setCrm(rs.getString("crm"));
        c.setMedico(m);

        return c;
    }
}
