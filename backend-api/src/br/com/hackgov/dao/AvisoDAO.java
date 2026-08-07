package br.com.hackgov.dao;

import br.com.hackgov.db.Conexao;
import br.com.hackgov.modelos.Aviso;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

/**
 * DAO dos avisos do Dashboard.
 *
 * Não existe tabela "avisos": cada regra abaixo é uma consulta sobre os dados
 * que o paciente já tem (exames, consultas) mais as campanhas de vacinação em
 * cartaz. O texto é montado aqui para a tela apenas exibir o que recebe.
 *
 * Todas as consultas usam dependente_id IS NULL — por enquanto o Dashboard
 * mostra só os avisos do titular da conta.
 */
public class AvisoDAO {

    /** A partir de quantos dias sem exame o aviso aparece. */
    private static final int DIAS_EXAME_ALERTA = 180;
    /** A partir de quantos dias sem consulta o aviso aparece. */
    private static final int DIAS_CONSULTA_ALERTA = 365;
    /** Janela para avisar de uma consulta que está chegando. */
    private static final int DIAS_CONSULTA_PROXIMA = 30;

    /** Monta a lista de avisos do paciente, da mais para a menos urgente. */
    public List<Aviso> listarPorPaciente(int idPaciente) throws SQLException {
        List<Aviso> avisos = new ArrayList<>();

        try (Connection con = Conexao.abrir()) {
            adicionarProximaConsulta(con, idPaciente, avisos);
            adicionarResultadosAlterados(con, idPaciente, avisos);
            adicionarUltimoExame(con, idPaciente, avisos);
            adicionarUltimaConsulta(con, idPaciente, avisos);
            adicionarCampanhas(con, avisos);
        }

        ordenarPorSeveridade(avisos);
        return avisos;
    }

    /** Consulta agendada dentro dos próximos dias. */
    private void adicionarProximaConsulta(Connection con, int idPaciente, List<Aviso> avisos)
            throws SQLException {
        String sql = "SELECT c.data, c.local, m.nome AS medico, "
                + "       DATEDIFF(c.data, CURDATE()) AS dias "
                + "FROM consultas c "
                + "JOIN medicos m ON m.id = c.medico_id "
                + "WHERE c.paciente_id = ? AND c.dependente_id IS NULL "
                + "  AND c.status = 'agendada' "
                + "  AND c.data BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY) "
                + "ORDER BY c.data "
                + "LIMIT 1";

        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setInt(1, idPaciente);
            ps.setInt(2, DIAS_CONSULTA_PROXIMA);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    int dias = rs.getInt("dias");
                    String quando;
                    if (dias == 0) {
                        quando = "Consulta hoje";
                    } else if (dias == 1) {
                        quando = "Consulta amanhã";
                    } else {
                        quando = "Consulta em " + dias + " dias";
                    }
                    avisos.add(new Aviso(
                            "consulta",
                            quando + " com " + rs.getString("medico"),
                            rs.getString("local"),
                            dias <= 2 ? Aviso.ALTA : Aviso.MEDIA));
                }
            }
        }
    }

    /** Resultados fora da faixa de referência na coleta de sangue mais recente. */
    private void adicionarResultadosAlterados(Connection con, int idPaciente, List<Aviso> avisos)
            throws SQLException {
        String sql = "SELECT COUNT(*) AS fora, MAX(e.data) AS data "
                + "FROM exame_itens i "
                + "JOIN exames e ON e.id = i.exame_id "
                + "WHERE e.paciente_id = ? AND e.dependente_id IS NULL AND e.tipo = 'sangue' "
                + "  AND e.data = ( "
                + "      SELECT MAX(data) FROM exames "
                + "      WHERE paciente_id = ? AND dependente_id IS NULL AND tipo = 'sangue') "
                + "  AND (i.valor < i.ref_min OR i.valor > i.ref_max)";

        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setInt(1, idPaciente);
            ps.setInt(2, idPaciente);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    int fora = rs.getInt("fora");
                    if (fora > 0) {
                        avisos.add(new Aviso(
                                "resultado",
                                fora == 1
                                        ? "1 resultado fora da faixa no último exame de sangue"
                                        : fora + " resultados fora da faixa no último exame de sangue",
                                "Coleta de " + formatarData(rs.getString("data")),
                                Aviso.ALTA));
                    }
                }
            }
        }
    }

    /** Tempo desde o último exame de qualquer tipo. */
    private void adicionarUltimoExame(Connection con, int idPaciente, List<Aviso> avisos)
            throws SQLException {
        String sql = "SELECT MAX(data) AS ultima, DATEDIFF(CURDATE(), MAX(data)) AS dias "
                + "FROM exames "
                + "WHERE paciente_id = ? AND dependente_id IS NULL";

        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setInt(1, idPaciente);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    String ultima = rs.getString("ultima");
                    if (ultima == null) {
                        avisos.add(new Aviso(
                                "exame",
                                "Nenhum exame registrado ainda",
                                "Guarde seus resultados para acompanhar sua saúde ao longo do tempo.",
                                Aviso.MEDIA));
                        return;
                    }
                    int dias = rs.getInt("dias");
                    if (dias >= DIAS_EXAME_ALERTA) {
                        avisos.add(new Aviso(
                                "exame",
                                humanizar(dias) + " desde o último exame",
                                "Último registro em " + formatarData(ultima) + ".",
                                dias >= 365 ? Aviso.ALTA : Aviso.MEDIA));
                    }
                }
            }
        }
    }

    /** Tempo desde a última consulta já realizada (o "check-up"). */
    private void adicionarUltimaConsulta(Connection con, int idPaciente, List<Aviso> avisos)
            throws SQLException {
        String sql = "SELECT MAX(data) AS ultima, DATEDIFF(CURDATE(), MAX(data)) AS dias "
                + "FROM consultas "
                + "WHERE paciente_id = ? AND dependente_id IS NULL AND status = 'realizada'";

        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setInt(1, idPaciente);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    String ultima = rs.getString("ultima");
                    if (ultima != null && rs.getInt("dias") >= DIAS_CONSULTA_ALERTA) {
                        avisos.add(new Aviso(
                                "consulta",
                                humanizar(rs.getInt("dias")) + " desde a última consulta",
                                "Vale agendar um check-up de rotina.",
                                Aviso.MEDIA));
                    }
                }
            }
        }
    }

    /** Campanhas de vacinação em cartaz hoje. */
    private void adicionarCampanhas(Connection con, List<Aviso> avisos) throws SQLException {
        String sql = "SELECT nome, vacina, publico_alvo, DATEDIFF(fim, CURDATE()) AS dias "
                + "FROM campanhas_vacinacao "
                + "WHERE CURDATE() BETWEEN inicio AND fim "
                + "ORDER BY fim";

        try (PreparedStatement ps = con.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                int dias = rs.getInt("dias");
                String prazo;
                if (dias == 0) {
                    prazo = "Último dia da campanha de " + rs.getString("vacina");
                } else if (dias == 1) {
                    prazo = "1 dia para o fim da campanha de " + rs.getString("vacina");
                } else {
                    prazo = dias + " dias para o fim da campanha de " + rs.getString("vacina");
                }
                avisos.add(new Aviso(
                        "campanha",
                        prazo,
                        rs.getString("publico_alvo"),
                        dias <= 7 ? Aviso.ALTA : Aviso.BAIXA));
            }
        }
    }

    /** Coloca os avisos de severidade alta primeiro, preservando a ordem interna. */
    private void ordenarPorSeveridade(List<Aviso> avisos) {
        List<Aviso> ordenados = new ArrayList<>(avisos.size());
        for (String nivel : new String[] { Aviso.ALTA, Aviso.MEDIA, Aviso.BAIXA }) {
            for (Aviso a : avisos) {
                if (nivel.equals(a.getSeveridade())) {
                    ordenados.add(a);
                }
            }
        }
        avisos.clear();
        avisos.addAll(ordenados);
    }

    /** Transforma uma quantidade de dias em "20 dias", "8 meses" ou "1 ano". */
    private String humanizar(int dias) {
        if (dias >= 365) {
            int anos = dias / 365;
            return anos == 1 ? "1 ano" : anos + " anos";
        }
        if (dias >= 60) {
            return (dias / 30) + " meses";
        }
        return dias + " dias";
    }

    /** Converte "2026-01-12" (formato do banco) em "12/01/2026". */
    private String formatarData(String iso) {
        if (iso == null || iso.length() < 10) return iso;
        return iso.substring(8, 10) + "/" + iso.substring(5, 7) + "/" + iso.substring(0, 4);
    }
}
