package br.com.hackgov.dao;

import br.com.hackgov.db.Conexao;
import br.com.hackgov.modelos.AceiteTermos;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Direitos do titular (LGPD, art. 18) e aceite dos termos: tudo o que olha a
 * conta INTEIRA, e não um assunto só.
 *
 * <h3>Por que a exportação lê as tabelas "cruas"</h3>
 * A portabilidade pede TODOS os dados. Montar o arquivo pelos DAOs de cada
 * assunto deixaria de fora qualquer coluna que a tela não mostra, e cada
 * coluna nova exigiria lembrar de acrescentá-la aqui. Lendo as linhas com
 * ResultSetMetaData, o arquivo acompanha o schema sozinho; o que sai de
 * propósito é só o que não é dado do paciente (o hash da senha e o do código
 * de acesso, que não servem para nada fora do servidor).
 *
 * Os nomes de tabela são constantes desta classe — nada vem do cliente —, e
 * o único valor de fora (o id do paciente, tirado do JWT) vai sempre como
 * parâmetro do PreparedStatement.
 */
public class ContaDAO {

    /** Colunas que nunca saem do servidor, nem na exportação. */
    private static final Set<String> COLUNAS_FORA = Set.of("senha_hash", "codigo_hash");

    /**
     * O que entra no arquivo, na ordem em que aparece. Cada consulta filtra
     * pelo dono da conta; as duas tabelas sem paciente_id (itens de exame e
     * trilha dos acessos) chegam pelo JOIN com a tabela-mãe.
     */
    private static final String[][] CONSULTAS_EXPORTACAO = {
        { "cadastro", "SELECT * FROM pacientes WHERE id = ?" },
        { "dependentes", "SELECT * FROM dependentes WHERE paciente_id = ? ORDER BY id" },
        { "contatos_emergencia", "SELECT * FROM familiares WHERE paciente_id = ? ORDER BY id" },
        { "consultas", "SELECT * FROM consultas WHERE paciente_id = ? ORDER BY data, id" },
        { "exames", "SELECT * FROM exames WHERE paciente_id = ? ORDER BY data, id" },
        { "exame_itens", "SELECT i.* FROM exame_itens i JOIN exames e ON e.id = i.exame_id "
                + "WHERE e.paciente_id = ? ORDER BY i.exame_id, i.ordem, i.id" },
        { "alergias", "SELECT * FROM alergias WHERE paciente_id = ? ORDER BY id" },
        { "condicoes", "SELECT * FROM condicoes WHERE paciente_id = ? ORDER BY id" },
        { "medicacoes", "SELECT * FROM medicacoes WHERE paciente_id = ? ORDER BY id" },
        { "vacinas_aplicadas", "SELECT * FROM vacinas_aplicadas WHERE paciente_id = ? ORDER BY id" },
        { "notificacoes", "SELECT * FROM notificacoes WHERE paciente_id = ? ORDER BY id" },
        { "acessos_concedidos", "SELECT * FROM acessos_temporarios WHERE paciente_id = ? ORDER BY id" },
        { "acessos_trilha", "SELECT l.* FROM acessos_log l JOIN acessos_temporarios a ON a.id = l.acesso_id "
                + "WHERE a.paciente_id = ? ORDER BY l.id" },
        // Quem atendeu: sem isto, consultas e acessos trariam só um número.
        // Nome, especialidade e CRM — o telefone do profissional não é dado
        // do paciente.
        { "profissionais", "SELECT m.id, m.nome, m.especialidade, m.crm FROM medicos m "
                + "WHERE m.id IN (SELECT medico_id FROM consultas WHERE paciente_id = ?) "
                + "   OR m.id IN (SELECT medico_id FROM exames WHERE paciente_id = ?) "
                + "   OR m.id IN (SELECT medico_id FROM acessos_temporarios WHERE paciente_id = ?) "
                + "ORDER BY m.id" },
        { "auditoria", "SELECT * FROM auditoria WHERE paciente_id = ? ORDER BY id" },
        { "aceites_termos", "SELECT * FROM aceites_termos WHERE paciente_id = ? ORDER BY id" },
        { "relatos_glossario", "SELECT * FROM explicacoes_reportes WHERE paciente_id = ? ORDER BY id" },
    };

    /**
     * Todas as linhas da conta, agrupadas por assunto. Uma conexão só para o
     * arquivo inteiro: são 17 leituras seguidas.
     */
    public Map<String, Object> exportar(int idPaciente) throws SQLException {
        Map<String, Object> dados = new LinkedHashMap<>();
        try (Connection con = Conexao.abrir()) {
            for (String[] c : CONSULTAS_EXPORTACAO) {
                dados.put(c[0], linhas(con, c[1], idPaciente));
            }
        }
        return dados;
    }

    private static List<Map<String, Object>> linhas(Connection con, String sql, int idPaciente)
            throws SQLException {
        List<Map<String, Object>> lista = new ArrayList<>();
        try (PreparedStatement ps = con.prepareStatement(sql)) {
            // Toda "?" destas consultas é o mesmo id (a de profissionais tem três).
            int marcadores = marcadores(sql);
            for (int i = 1; i <= marcadores; i++) ps.setInt(i, idPaciente);

            try (ResultSet rs = ps.executeQuery()) {
                ResultSetMetaData meta = rs.getMetaData();
                while (rs.next()) {
                    Map<String, Object> linha = new LinkedHashMap<>();
                    for (int col = 1; col <= meta.getColumnCount(); col++) {
                        String nome = meta.getColumnLabel(col);
                        if (COLUNAS_FORA.contains(nome)) continue;
                        linha.put(nome, valorExportavel(rs.getObject(col)));
                    }
                    lista.add(linha);
                }
            }
        }
        return lista;
    }

    /**
     * Quantos "?" a consulta tem. Contado no texto, e não pelo
     * getParameterMetaData: no Connector/J, com o prepared statement do lado
     * do cliente (o padrão), ele lança "Parameter metadata not available". As
     * consultas são constantes desta classe e nenhuma tem "?" dentro de texto.
     */
    private static int marcadores(String sql) {
        int total = 0;
        for (int i = 0; i < sql.length(); i++) {
            if (sql.charAt(i) == '?') total++;
        }
        return total;
    }

    /**
     * Data e hora viram texto ISO ("2026-10-20T21:40"): é o que qualquer
     * programa que receba o arquivo entende. Número e texto passam como estão.
     */
    private static Object valorExportavel(Object valor) {
        if (valor == null || valor instanceof Number || valor instanceof Boolean
                || valor instanceof String) {
            return valor;
        }
        if (valor instanceof Timestamp) return ((Timestamp) valor).toLocalDateTime().toString();
        // java.sql.Date, LocalDate e LocalDateTime já escrevem ISO no toString.
        return valor.toString();
    }

    /**
     * Quanto cada assunto tem, para o resumo da exclusão e para a tela mostrar
     * o que vai junto antes de a pessoa confirmar.
     */
    public Map<String, Integer> contar(int idPaciente) throws SQLException {
        String[][] contagens = {
            { "dependentes", "SELECT COUNT(*) FROM dependentes WHERE paciente_id = ?" },
            { "consultas", "SELECT COUNT(*) FROM consultas WHERE paciente_id = ?" },
            { "exames", "SELECT COUNT(*) FROM exames WHERE paciente_id = ?" },
            { "vacinas", "SELECT COUNT(*) FROM vacinas_aplicadas WHERE paciente_id = ?" },
            { "itens_prontuario", "SELECT (SELECT COUNT(*) FROM alergias WHERE paciente_id = ?)"
                    + " + (SELECT COUNT(*) FROM condicoes WHERE paciente_id = ?)"
                    + " + (SELECT COUNT(*) FROM medicacoes WHERE paciente_id = ?)" },
            { "contatos", "SELECT COUNT(*) FROM familiares WHERE paciente_id = ?" },
        };
        Map<String, Integer> totais = new LinkedHashMap<>();
        try (Connection con = Conexao.abrir()) {
            for (String[] c : contagens) {
                try (PreparedStatement ps = con.prepareStatement(c[1])) {
                    int marcadores = marcadores(c[1]);
                    for (int i = 1; i <= marcadores; i++) ps.setInt(i, idPaciente);
                    try (ResultSet rs = ps.executeQuery()) {
                        totais.put(c[0], rs.next() ? rs.getInt(1) : 0);
                    }
                }
            }
        }
        return totais;
    }

    /**
     * Exclui a conta: grava o registro da exclusão e apaga o paciente, numa
     * transação só. O resto (dependentes, consultas, exames, prontuário,
     * vacinas, contatos, acessos, auditoria, aceites) vai pelo ON DELETE
     * CASCADE do schema.
     *
     * A ordem importa: o registro é gravado ANTES do DELETE, na mesma
     * transação. Se o DELETE falhar, o registro volta junto (não fica "conta
     * excluída" de uma conta que existe); se o registro falhar, a conta não é
     * apagada sem deixar rastro.
     *
     * @return false se não havia paciente com esse id
     */
    public boolean excluirConta(int idPaciente, String origemIp, String resumo) throws SQLException {
        try (Connection con = Conexao.abrir()) {
            con.setAutoCommit(false);
            try {
                try (PreparedStatement ps = con.prepareStatement(
                        "INSERT INTO contas_excluidas (paciente_id, origem_ip, resumo) VALUES (?, ?, ?)")) {
                    ps.setInt(1, idPaciente);
                    ps.setString(2, origemIp);
                    ps.setString(3, resumo);
                    ps.executeUpdate();
                }
                int apagados;
                try (PreparedStatement ps = con.prepareStatement("DELETE FROM pacientes WHERE id = ?")) {
                    ps.setInt(1, idPaciente);
                    apagados = ps.executeUpdate();
                }
                if (apagados == 0) {
                    con.rollback();
                    return false;
                }
                con.commit();
                return true;
            } catch (SQLException e) {
                con.rollback();
                throw e;
            }
        }
    }

    // ===================== Termos de Uso =====================

    /** O aceite desta versão, ou null se a pessoa ainda não a aceitou. */
    public AceiteTermos buscarAceite(int idPaciente, String versao) throws SQLException {
        String sql = "SELECT versao, aceito_em FROM aceites_termos WHERE paciente_id = ? AND versao = ?";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setInt(1, idPaciente);
            ps.setString(2, versao);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return null;
                Timestamp quando = rs.getTimestamp("aceito_em");
                return new AceiteTermos(rs.getString("versao"),
                        quando == null ? null : quando.toLocalDateTime().toString());
            }
        }
    }

    /**
     * Registra o aceite. Aceitar de novo a mesma versão não cria linha nova
     * (chave única paciente + versão) e mantém a data do primeiro aceite —
     * é ela que demonstra quando o consentimento foi dado.
     */
    public void registrarAceite(int idPaciente, String versao, String origemIp) throws SQLException {
        String sql = "INSERT IGNORE INTO aceites_termos (paciente_id, versao, origem_ip) VALUES (?, ?, ?)";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setInt(1, idPaciente);
            ps.setString(2, versao);
            ps.setString(3, origemIp);
            ps.executeUpdate();
        }
    }
}
