package br.com.hackgov.dao;

import br.com.hackgov.db.Conexao;
import br.com.hackgov.modelos.DoseVacina;

import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.ArrayList;
import java.util.List;

/**
 * DAO da carteira de vacinação — tabelas "calendario_vacinal" (o que o PNI
 * recomenda) e "vacinas_aplicadas" (o que a pessoa tomou).
 *
 * As duas são consultadas juntas: o calendário sozinho é igual para todo mundo
 * da mesma faixa etária, e a lista de aplicadas sozinha não diz o que falta.
 * O LEFT JOIN devolve as duas coisas de uma vez, e quem calcula data prevista e
 * atraso é o {@link br.com.hackgov.util.CarteiraVacinal} — aqui não entra
 * regra, só SQL.
 */
public class VacinaDAO {

    public static final String ORIGEM_PACIENTE = "paciente";
    public static final String ORIGEM_MEDICO = "medico";

    /**
     * SELECT — o calendário daquele público com as doses que a pessoa já tomou.
     *
     * O JOIN carrega o dependente no ON, e não no WHERE, porque a lista precisa
     * trazer TODAS as doses do calendário: as não aplicadas vêm com
     * aplicada_em nulo, e são exatamente elas que interessam ao alerta. Num
     * WHERE, a dose que ninguém tomou sumiria do resultado.
     *
     * O {@code <=>} compara tratando NULL como valor: o titular tem
     * dependente_id nulo dos dois lados, e com "=" comum nenhuma linha dele
     * casaria.
     */
    public List<DoseVacina> listarCarteira(int idPaciente, Integer idDependente, String publico)
            throws SQLException {
        String sql = "SELECT c.id, c.publico, c.vacina, c.dose, c.idade_meses, c.periodo, "
                + "       c.protege, c.ordem, v.data_aplicacao, v.origem "
                + "FROM calendario_vacinal c "
                + "LEFT JOIN vacinas_aplicadas v "
                + "       ON v.dose_id = c.id AND v.paciente_id = ? AND v.dependente_id <=> ? "
                + "WHERE c.publico = ? "
                + "ORDER BY c.ordem, c.id";

        List<DoseVacina> lista = new ArrayList<>();
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, idPaciente);
            aplicarDependente(ps, 2, idDependente);
            ps.setString(3, publico);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    DoseVacina d = new DoseVacina();
                    d.setIdDose(rs.getInt("id"));
                    d.setPublico(rs.getString("publico"));
                    d.setVacina(rs.getString("vacina"));
                    d.setDose(rs.getString("dose"));
                    int meses = rs.getInt("idade_meses");
                    d.setIdadeMeses(rs.wasNull() ? null : meses);
                    d.setPeriodo(rs.getString("periodo"));
                    d.setProtege(rs.getString("protege"));
                    d.setOrdem(rs.getInt("ordem"));

                    Date aplicada = rs.getDate("data_aplicacao");
                    d.setAplicadaEm(aplicada == null ? null : aplicada.toString());
                    d.setOrigem(rs.getString("origem"));
                    lista.add(d);
                }
            }
        }
        return lista;
    }

    /**
     * Registra uma dose como aplicada: apaga o registro anterior daquela dose
     * e grava o novo, numa transação só.
     *
     * O apagar-antes está no lugar de um ON DUPLICATE KEY porque a tabela não
     * tem chave única (ver o comentário em schema.sql: dependente_id é NULL no
     * titular, e no MySQL NULLs não colidem num índice único). Sem isso, dois
     * toques no botão — ou duas abas abertas — deixariam duas linhas da mesma
     * dose, e a carteira passaria a contar dose repetida.
     *
     * A transação é o que impede o caso pior: apagar e falhar no insert
     * deixaria a pessoa sem o registro que ela já tinha.
     */
    public void registrar(int idPaciente, Integer idDependente, int idDose,
                          String dataAplicacao, String origem) throws SQLException {
        String apagar = "DELETE FROM vacinas_aplicadas "
                + "WHERE paciente_id = ? AND dependente_id <=> ? AND dose_id = ?";
        String inserir = "INSERT INTO vacinas_aplicadas "
                + "(paciente_id, dependente_id, dose_id, data_aplicacao, origem) "
                + "VALUES (?, ?, ?, ?, ?)";

        Connection con = null;
        try {
            con = Conexao.abrir();
            con.setAutoCommit(false);

            try (PreparedStatement ps = con.prepareStatement(apagar)) {
                ps.setInt(1, idPaciente);
                aplicarDependente(ps, 2, idDependente);
                ps.setInt(3, idDose);
                ps.executeUpdate();
            }
            try (PreparedStatement ps = con.prepareStatement(inserir)) {
                ps.setInt(1, idPaciente);
                aplicarDependente(ps, 2, idDependente);
                ps.setInt(3, idDose);
                ps.setDate(4, Date.valueOf(dataAplicacao));
                ps.setString(5, origem);
                ps.executeUpdate();
            }
            con.commit();

        } catch (SQLException e) {
            if (con != null) con.rollback();
            throw e;
        } finally {
            if (con != null) {
                con.setAutoCommit(true);
                con.close();
            }
        }
    }

    /**
     * DELETE — desmarca uma dose. Retorna true se havia registro.
     *
     * O paciente sempre entra no WHERE: é o que impede desmarcar dose de outra
     * conta mandando um id qualquer.
     */
    public boolean remover(int idPaciente, Integer idDependente, int idDose) throws SQLException {
        String sql = "DELETE FROM vacinas_aplicadas "
                + "WHERE paciente_id = ? AND dependente_id <=> ? AND dose_id = ?";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, idPaciente);
            aplicarDependente(ps, 2, idDependente);
            ps.setInt(3, idDose);
            return ps.executeUpdate() > 0;
        }
    }

    /** SELECT — nome e dose de uma linha do calendário, para a trilha e o aviso. */
    public String descricaoDaDose(int idDose) throws SQLException {
        String sql = "SELECT vacina, dose FROM calendario_vacinal WHERE id = ?";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, idDose);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? rs.getString("vacina") + " · " + rs.getString("dose") : null;
            }
        }
    }

    private static void aplicarDependente(PreparedStatement ps, int posicao, Integer idDependente)
            throws SQLException {
        if (idDependente == null || idDependente <= 0) {
            ps.setNull(posicao, Types.INTEGER);
        } else {
            ps.setInt(posicao, idDependente);
        }
    }
}
