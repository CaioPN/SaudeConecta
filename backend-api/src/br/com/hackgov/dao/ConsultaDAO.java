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

    /** Consulta anotada pelo próprio paciente; não tem CRM nem linha em medicos. */
    public static final String ORIGEM_PACIENTE = "paciente";
    /** Consulta registrada pelo profissional, com acesso temporário. */
    public static final String ORIGEM_MEDICO = "medico";

    /*
     * LEFT JOIN, e não JOIN: a consulta anotada pelo paciente tem medico_id
     * NULL, e com o JOIN de antes ela simplesmente sumiria da lista. O COALESCE
     * faz as duas origens chegarem à tela com os mesmos campos — quem separa
     * uma da outra é a coluna `origem`, não a ausência do nome.
     */
    private static final String SELECT_BASE =
            "SELECT c.id, c.paciente_id, c.dependente_id, c.data, c.hora, c.local, c.motivo, c.unidade_cnes, "
            + "       c.status, c.resumo, c.conduta, c.origem, "
            + "       m.id AS medico_id, COALESCE(m.nome, c.profissional) AS medico_nome, "
            + "       COALESCE(m.especialidade, c.especialidade) AS especialidade, m.crm "
            + "FROM consultas c "
            + "LEFT JOIN medicos m ON m.id = c.medico_id ";

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
        String sql = "SELECT c.id, c.data, c.hora, "
                + "       COALESCE(m.nome, c.profissional) AS medico, d.nome AS dependente "
                + "FROM consultas c "
                + "LEFT JOIN medicos m ON m.id = c.medico_id "
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

    public int inserir(Consulta c, Integer idAcesso) throws SQLException {
        String sql = "INSERT INTO consultas "
                + "(paciente_id, dependente_id, medico_id, profissional, especialidade, origem, "
                + " data, hora, local, motivo, status, resumo, conduta, unidade_cnes, acesso_id) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            ps.setInt(1, c.getIdPaciente());
            if (c.getIdDependente() > 0) {
                ps.setInt(2, c.getIdDependente());
            } else {
                ps.setNull(2, Types.INTEGER);
            }

            // O médico do acesso temporário tem id (veio do CRM); o que o
            // paciente digitou não tem, e vai como texto nas duas colunas
            // seguintes. Uma coisa ou outra, nunca as duas.
            Medico med = c.getMedico();
            if (med != null && med.getIdMedico() > 0) {
                ps.setInt(3, med.getIdMedico());
                ps.setNull(4, Types.VARCHAR);
                ps.setNull(5, Types.VARCHAR);
            } else {
                ps.setNull(3, Types.INTEGER);
                ps.setString(4, med == null ? null : med.getNome());
                ps.setString(5, med == null ? null : med.getEspecialidade());
            }
            ps.setString(6, c.getOrigem() == null ? ORIGEM_MEDICO : c.getOrigem());

            ps.setDate(7, Date.valueOf(c.getData()));
            ps.setTime(8, Time.valueOf(c.getHora().length() == 5 ? c.getHora() + ":00" : c.getHora()));
            ps.setString(9, c.getLocal());
            ps.setString(10, c.getMotivo());
            ps.setString(11, c.getStatus());
            ps.setString(12, c.getResumo());
            ps.setString(13, c.getConduta());
            if (c.getUnidadeCnes() == null) {
                ps.setNull(14, Types.INTEGER);
            } else {
                ps.setInt(14, c.getUnidadeCnes());
            }
            if (idAcesso == null) {
                ps.setNull(15, Types.INTEGER);
            } else {
                ps.setInt(15, idAcesso);
            }
            ps.executeUpdate();

            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) {
                    c.setIdConsulta(rs.getInt(1));
                }
            }
            return c.getIdConsulta();
        }
    }

    /**
     * UPDATE — corrige uma consulta que o PACIENTE anotou.
     *
     * O `origem = 'paciente'` no WHERE é a trava: o atendimento registrado pelo
     * profissional é prontuário, e o paciente não reescreve prontuário. Sem
     * ele, bastaria mandar o id de uma consulta antiga para mudar o que o
     * médico escreveu.
     */
    public boolean atualizarDoPaciente(Consulta c) throws SQLException {
        String sql = "UPDATE consultas SET profissional = ?, especialidade = ?, data = ?, hora = ?, "
                + "       local = ?, motivo = ?, unidade_cnes = ? "
                + "WHERE id = ? AND paciente_id = ? AND origem = '" + ORIGEM_PACIENTE + "'";

        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            Medico med = c.getMedico();
            ps.setString(1, med == null ? null : med.getNome());
            ps.setString(2, med == null ? null : med.getEspecialidade());
            ps.setDate(3, Date.valueOf(c.getData()));
            ps.setTime(4, Time.valueOf(c.getHora().length() == 5 ? c.getHora() + ":00" : c.getHora()));
            ps.setString(5, c.getLocal());
            ps.setString(6, c.getMotivo());
            if (c.getUnidadeCnes() == null) {
                ps.setNull(7, Types.INTEGER);
            } else {
                ps.setInt(7, c.getUnidadeCnes());
            }
            ps.setInt(8, c.getIdConsulta());
            ps.setInt(9, c.getIdPaciente());
            return ps.executeUpdate() > 0;
        }
    }

    /**
     * UPDATE — troca a SITUAÇÃO de uma consulta agendada (realizada/cancelada).
     *
     * Ao contrário do UPDATE acima, este vale para as duas origens: a consulta
     * que o profissional agendou também é desmarcada na vida real, e quem sabe
     * disso é o paciente. O que a trava garante é o resto:
     * - só sai de `agendada` (uma consulta realizada não volta atrás por aqui);
     * - só entra o status que o ApiServer autorizou;
     * - resumo e conduta não são tocados — o registro clínico continua sendo
     *   escrito por quem atendeu.
     */
    public boolean atualizarStatus(int id, int idPaciente, String status) throws SQLException {
        String sql = "UPDATE consultas SET status = ? "
                + "WHERE id = ? AND paciente_id = ? AND status = 'agendada'";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setString(1, status);
            ps.setInt(2, id);
            ps.setInt(3, idPaciente);
            return ps.executeUpdate() > 0;
        }
    }

    /** DELETE — apaga uma consulta anotada pelo paciente. Mesma trava do UPDATE. */
    public boolean excluirDoPaciente(int id, int idPaciente) throws SQLException {
        String sql = "DELETE FROM consultas WHERE id = ? AND paciente_id = ? "
                + "AND origem = '" + ORIGEM_PACIENTE + "'";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, id);
            ps.setInt(2, idPaciente);
            return ps.executeUpdate() > 0;
        }
    }

    /**
     * SELECT — profissionais e locais que já apareceram nas consultas desta
     * conta, do mais recente para o mais antigo.
     *
     * É o que o formulário usa para não fazer o paciente digitar tudo de novo:
     * consulta quase sempre é retorno com quem já atendeu, no mesmo lugar.
     * Sai daqui, e não de uma tabela de "meus médicos", porque esse dado já
     * existe — cadastrar um médico à parte seria uma tela a mais para manter.
     */
    public List<String[]> sugestoes(int idPaciente, int limite) throws SQLException {
        String sql = "SELECT COALESCE(m.nome, c.profissional) AS nome, "
                + "       COALESCE(m.especialidade, c.especialidade) AS especialidade, "
                + "       c.local, c.unidade_cnes, MAX(c.data) AS ultima "
                + "FROM consultas c "
                + "LEFT JOIN medicos m ON m.id = c.medico_id "
                + "WHERE c.paciente_id = ? "
                // As expressões inteiras, e não os apelidos: com
                // only_full_group_by ligado (padrão do MySQL 8), agrupar pelo
                // apelido do COALESCE é recusado.
                + "GROUP BY COALESCE(m.nome, c.profissional), "
                + "         COALESCE(m.especialidade, c.especialidade), c.local, c.unidade_cnes "
                + "ORDER BY ultima DESC "
                + "LIMIT ?";

        List<String[]> lista = new ArrayList<>();
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, idPaciente);
            ps.setInt(2, limite);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    // wasNull() fala da ÚLTIMA coluna lida, então ele tem de ser
                    // consultado aqui, colado no getInt. Lido depois dos
                    // getString abaixo, ele responderia sobre o `local`.
                    int cnes = rs.getInt("unidade_cnes");
                    String cnesTexto = rs.wasNull() ? null : String.valueOf(cnes);
                    lista.add(new String[] {
                        rs.getString("nome"),
                        rs.getString("especialidade"),
                        rs.getString("local"),
                        cnesTexto,
                    });
                }
            }
        }
        return lista;
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
        c.setOrigem(rs.getString("origem"));
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
