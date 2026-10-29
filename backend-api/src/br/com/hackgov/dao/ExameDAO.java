package br.com.hackgov.dao;

import br.com.hackgov.db.Conexao;
import br.com.hackgov.modelos.DocumentoExame;
import br.com.hackgov.modelos.Exame;
import br.com.hackgov.modelos.ItemExame;
import br.com.hackgov.modelos.Medico;

import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Types;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * DAO da entidade Exame — SQL das tabelas "exames" e "exame_itens".
 *
 * Um exame de sangue é uma coleta com vários itens (um resultado por linha);
 * um exame de imagem é uma linha única com nome e laudo.
 */
public class ExameDAO {

    /** Exame trazido de outro lugar pelo próprio paciente (importado do PDF). */
    public static final String ORIGEM_PACIENTE = "paciente";
    /** Exame registrado por um profissional, pelo portal do médico. */
    public static final String ORIGEM_MEDICO = "medico";

    /**
     * SELECT — lista os exames de um paciente, já com os itens carregados.
     *
     * @param idDependente null para os exames do titular; um id para os de um dependente.
     */
    public List<Exame> listarPorPaciente(int idPaciente, Integer idDependente) throws SQLException {
        String sql = "SELECT e.id, e.paciente_id, e.dependente_id, e.consulta_id, e.tipo, e.data, "
                + "       e.local, e.nome, e.laudo, e.origem, "
                // Só se o documento existe, nunca o conteúdo: o PDF é lido à
                // parte, quando alguém pede (buscarDocumento).
                + "       EXISTS (SELECT 1 FROM exames_documentos d WHERE d.exame_id = e.id) AS tem_documento, "
                + "       m.id AS medico_id, m.nome AS medico_nome, m.especialidade, m.crm "
                + "FROM exames e "
                + "LEFT JOIN medicos m ON m.id = e.medico_id "
                + "WHERE e.paciente_id = ? "
                + (idDependente == null ? "AND e.dependente_id IS NULL " : "AND e.dependente_id = ? ")
                + "ORDER BY e.data DESC";

        List<Exame> lista = new ArrayList<>();
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

        carregarItens(lista);
        return lista;
    }

    /**
     * Busca os itens de todos os exames da lista em uma única consulta e
     * distribui cada item no seu exame (evita uma query por exame).
     */
    private void carregarItens(List<Exame> exames) throws SQLException {
        List<Exame> comItens = new ArrayList<>();
        for (Exame e : exames) {
            if (Exame.TIPO_SANGUE.equals(e.getTipo())) {
                comItens.add(e);
            }
        }
        if (comItens.isEmpty()) return;

        // Monta um "IN (?, ?, ...)" com um placeholder por exame.
        StringBuilder marcadores = new StringBuilder();
        for (int i = 0; i < comItens.size(); i++) {
            marcadores.append(i == 0 ? "?" : ", ?");
        }
        String sql = "SELECT id, exame_id, nome, valor, unidade, ref_min, ref_max, ordem "
                + "FROM exame_itens WHERE exame_id IN (" + marcadores + ") "
                + "ORDER BY exame_id, ordem";

        Map<Integer, Exame> porId = new HashMap<>();
        for (Exame e : comItens) {
            porId.put(e.getIdExame(), e);
        }

        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {

            for (int i = 0; i < comItens.size(); i++) {
                ps.setInt(i + 1, comItens.get(i).getIdExame());
            }
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    ItemExame item = new ItemExame();
                    item.setIdItem(rs.getInt("id"));
                    item.setIdExame(rs.getInt("exame_id"));
                    item.setNome(rs.getString("nome"));
                    item.setValor(rs.getDouble("valor"));
                    item.setUnidade(rs.getString("unidade"));
                    item.setRefMin(rs.getDouble("ref_min"));
                    item.setRefMax(rs.getDouble("ref_max"));
                    item.setOrdem(rs.getInt("ordem"));

                    Exame dono = porId.get(item.getIdExame());
                    if (dono != null) {
                        dono.getItens().add(item);
                    }
                }
            }
        }
    }

    /**
     * INSERT — registra um exame lançado pelo médico que entrou com um acesso
     * temporário; `idAcesso` fica gravado como autoria do registro.
     */
    public int inserir(Exame e, int idAcesso) throws SQLException {
        e.setOrigem(ORIGEM_MEDICO);
        return inserir(e, idAcesso, null);
    }

    /**
     * INSERT — o exame que o paciente trouxe de outro lugar, com o PDF
     * original. Sem acesso_id (não houve médico) e com origem "paciente".
     */
    public int inserirImportado(Exame e, DocumentoExame documento) throws SQLException {
        e.setOrigem(ORIGEM_PACIENTE);
        return inserir(e, null, documento);
    }

    /**
     * Roda em transação: um exame de sangue nunca fica gravado sem os
     * resultados que o acompanham, nem um importado sem o documento dele.
     */
    private int inserir(Exame e, Integer idAcesso, DocumentoExame documento) throws SQLException {
        String sqlExame = "INSERT INTO exames "
                + "(paciente_id, dependente_id, medico_id, consulta_id, tipo, data, local, "
                + " nome, laudo, acesso_id, origem) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        String sqlDocumento = "INSERT INTO exames_documentos "
                + "(exame_id, nome_arquivo, tamanho, conteudo) VALUES (?, ?, ?, ?)";
        String sqlItem = "INSERT INTO exame_itens "
                + "(exame_id, nome, valor, unidade, ref_min, ref_max, ordem) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?)";

        Connection con = null;
        try {
            con = Conexao.abrir();
            con.setAutoCommit(false);

            try (PreparedStatement ps = con.prepareStatement(sqlExame, Statement.RETURN_GENERATED_KEYS)) {
                ps.setInt(1, e.getIdPaciente());
                if (e.getIdDependente() > 0) {
                    ps.setInt(2, e.getIdDependente());
                } else {
                    ps.setNull(2, Types.INTEGER);
                }
                if (e.getSolicitante() != null) {
                    ps.setInt(3, e.getSolicitante().getIdMedico());
                } else {
                    ps.setNull(3, Types.INTEGER);
                }
                if (e.getIdConsulta() > 0) {
                    ps.setInt(4, e.getIdConsulta());
                } else {
                    ps.setNull(4, Types.INTEGER);
                }
                ps.setString(5, e.getTipo());
                ps.setDate(6, Date.valueOf(e.getData()));
                ps.setString(7, e.getLocal());
                ps.setString(8, e.getNome());
                ps.setString(9, e.getLaudo());
                if (idAcesso != null) {
                    ps.setInt(10, idAcesso);
                } else {
                    ps.setNull(10, Types.INTEGER);
                }
                ps.setString(11, e.getOrigem());
                ps.executeUpdate();

                try (ResultSet rs = ps.getGeneratedKeys()) {
                    if (rs.next()) {
                        e.setIdExame(rs.getInt(1));
                    }
                }
            }

            if (!e.getItens().isEmpty()) {
                try (PreparedStatement ps = con.prepareStatement(sqlItem)) {
                    int ordem = 1;
                    for (ItemExame item : e.getItens()) {
                        ps.setInt(1, e.getIdExame());
                        ps.setString(2, item.getNome());
                        ps.setDouble(3, item.getValor());
                        ps.setString(4, item.getUnidade());
                        ps.setDouble(5, item.getRefMin());
                        ps.setDouble(6, item.getRefMax());
                        ps.setInt(7, ordem++);
                        ps.addBatch();
                    }
                    ps.executeBatch();
                }
            }

            if (documento != null) {
                try (PreparedStatement ps = con.prepareStatement(sqlDocumento)) {
                    ps.setInt(1, e.getIdExame());
                    ps.setString(2, documento.getNomeArquivo());
                    ps.setInt(3, documento.getConteudo().length);
                    ps.setBytes(4, documento.getConteudo());
                    ps.executeUpdate();
                }
                e.setTemDocumento(true);
            }

            con.commit();
            return e.getIdExame();

        } catch (SQLException erro) {
            if (con != null) con.rollback();
            throw erro;
        } finally {
            if (con != null) {
                con.setAutoCommit(true);
                con.close();
            }
        }
    }

    /**
     * SELECT — o PDF original de um exame, só se o exame for deste paciente.
     * O id vem da URL; quem garante que o arquivo é da conta é o paciente_id
     * do JWT no WHERE. Devolve null quando não existe ou é de outra conta.
     */
    public DocumentoExame buscarDocumento(int idExame, int idPaciente) throws SQLException {
        String sql = "SELECT d.exame_id, d.nome_arquivo, d.conteudo, e.dependente_id "
                + "FROM exames_documentos d JOIN exames e ON e.id = d.exame_id "
                + "WHERE d.exame_id = ? AND e.paciente_id = ?";
        try (Connection con = Conexao.abrir();
             PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setInt(1, idExame);
            ps.setInt(2, idPaciente);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return null;
                DocumentoExame d = new DocumentoExame();
                d.setIdExame(rs.getInt("exame_id"));
                d.setNomeArquivo(rs.getString("nome_arquivo"));
                d.setConteudo(rs.getBytes("conteudo"));
                d.setIdDependente(rs.getInt("dependente_id")); // 0 quando NULL
                return d;
            }
        }
    }

    /**
     * DELETE — o paciente apaga um exame que ELE importou. Itens e documento
     * vão junto pelo ON DELETE CASCADE. A origem está no WHERE: o id de um
     * exame lançado pelo médico não apaga nada (devolve 0 linhas, a rota
     * responde 404), como na consulta e na alergia informadas pelo paciente.
     *
     * @return o dependente do exame apagado (0 = titular), ou -1 se nada foi apagado
     */
    public int excluirImportado(int idExame, int idPaciente) throws SQLException {
        String sqlDono = "SELECT dependente_id FROM exames "
                + "WHERE id = ? AND paciente_id = ? AND origem = '" + ORIGEM_PACIENTE + "'";
        String sqlApagar = "DELETE FROM exames "
                + "WHERE id = ? AND paciente_id = ? AND origem = '" + ORIGEM_PACIENTE + "'";
        try (Connection con = Conexao.abrir()) {
            int dependente;
            try (PreparedStatement ps = con.prepareStatement(sqlDono)) {
                ps.setInt(1, idExame);
                ps.setInt(2, idPaciente);
                try (ResultSet rs = ps.executeQuery()) {
                    if (!rs.next()) return -1;
                    dependente = rs.getInt(1);
                }
            }
            try (PreparedStatement ps = con.prepareStatement(sqlApagar)) {
                ps.setInt(1, idExame);
                ps.setInt(2, idPaciente);
                return ps.executeUpdate() > 0 ? dependente : -1;
            }
        }
    }

    /** Converte a linha atual do ResultSet em um objeto Exame (sem os itens). */
    private Exame montar(ResultSet rs) throws SQLException {
        Exame e = new Exame();
        e.setIdExame(rs.getInt("id"));
        e.setIdPaciente(rs.getInt("paciente_id"));
        e.setIdDependente(rs.getInt("dependente_id")); // 0 quando NULL
        e.setIdConsulta(rs.getInt("consulta_id"));     // 0 quando NULL
        e.setTipo(rs.getString("tipo"));

        Date data = rs.getDate("data");
        e.setData(data != null ? data.toString() : null);

        e.setLocal(rs.getString("local"));
        e.setNome(rs.getString("nome"));
        e.setLaudo(rs.getString("laudo"));
        e.setOrigem(rs.getString("origem"));
        e.setTemDocumento(rs.getBoolean("tem_documento"));

        int idMedico = rs.getInt("medico_id");
        if (!rs.wasNull()) {
            Medico m = new Medico();
            m.setIdMedico(idMedico);
            m.setNome(rs.getString("medico_nome"));
            m.setEspecialidade(rs.getString("especialidade"));
            m.setCrm(rs.getString("crm"));
            e.setSolicitante(m);
        }
        return e;
    }
}
