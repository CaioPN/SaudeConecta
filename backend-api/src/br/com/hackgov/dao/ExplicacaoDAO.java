package br.com.hackgov.dao;

import br.com.hackgov.db.Conexao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.text.Normalizer;

/**
 * DAO do glossário — as explicações de exames e vacinas que as telas mostram.
 *
 * <h3>Por que isto é uma tabela, e não uma chamada de IA por vez</h3>
 * A explicação de "TGP" é a mesma para todos os pacientes e não muda. Gerar uma
 * vez serve o app inteiro: a segunda pessoa que tocar no botão recebe o texto
 * do banco, na hora, sem gastar a cota do nível gratuito e sem depender de
 * internet — o que também vale para a apresentação.
 *
 * <h3>LGPD</h3>
 * Nada aqui pertence a um paciente. Só entra VOCABULÁRIO: o nome do exame ou
 * da vacina, que é público. Nunca o resultado, a data ou de quem é. É por isso
 * que a tabela não tem paciente_id — e é por isso que o texto pode ser
 * compartilhado entre contas sem vazar coisa alguma.
 *
 * <h3>Quem pode virar linha aqui</h3>
 * Este DAO não decide isso. Quem chama (o ApiServer) confere antes que o termo
 * pedido existe de verdade nos exames do paciente ou no calendário vacinal —
 * sem essa trava, a rota seria um jeito de mandar texto qualquer para o modelo
 * e ainda encher a tabela com o que viesse.
 */
public class ExplicacaoDAO {

    /**
     * Devolve o texto já gravado, ou null se ninguém pediu esse termo ainda.
     *
     * @param tipo  "exame" ou "vacina".
     * @param termo o nome como veio da tela (a normalização é feita aqui).
     */
    public String buscar(String tipo, String termo) throws SQLException {
        String sql = "SELECT texto FROM explicacoes_ia WHERE tipo = ? AND termo = ?";
        try (Connection con = Conexao.abrir();
             PreparedStatement st = con.prepareStatement(sql)) {
            st.setString(1, tipo);
            st.setString(2, normalizar(termo));
            try (ResultSet rs = st.executeQuery()) {
                return rs.next() ? rs.getString("texto") : null;
            }
        }
    }

    /**
     * Grava a explicação recém-escrita pelo modelo.
     *
     * Usa INSERT ... ON DUPLICATE KEY UPDATE porque duas pessoas podem tocar no
     * botão do mesmo exame ao mesmo tempo: sem isso, a segunda gravação
     * estouraria na chave única (tipo, termo) e derrubaria uma requisição que
     * tinha dado certo.
     */
    public void gravar(String tipo, String termo, String rotulo, String texto, String modelo)
            throws SQLException {
        String sql = "INSERT INTO explicacoes_ia (tipo, termo, rotulo, texto, modelo) "
                   + "VALUES (?, ?, ?, ?, ?) "
                   + "ON DUPLICATE KEY UPDATE texto = VALUES(texto), modelo = VALUES(modelo)";
        try (Connection con = Conexao.abrir();
             PreparedStatement st = con.prepareStatement(sql)) {
            st.setString(1, tipo);
            st.setString(2, normalizar(termo));
            st.setString(3, rotulo);
            st.setString(4, texto);
            st.setString(5, modelo);
            st.executeUpdate();
        }
    }

    /**
     * Diz se o termo pedido existe mesmo — a trava que impede a rota de virar
     * um canal para mandar texto arbitrário ao modelo (e de encher a tabela
     * com lixo que ficaria lá para sempre).
     *
     * Exame: precisa ser um item de exame DO PRÓPRIO paciente (dele ou de um
     * dependente seu), ou o nome de um exame de imagem dele. Ou seja, só dá
     * para perguntar sobre exame que a pessoa tem.
     *
     * Vacina: precisa estar no calendário do PNI, que é público e igual para
     * todos — aqui não faz sentido amarrar ao paciente, porque a tela de
     * vacinas mostra o calendário inteiro, inclusive as doses ainda previstas.
     */
    public boolean termoConhecido(String tipo, String termo, int idPaciente) throws SQLException {
        // Compara o texto como ele veio: a tela manda de volta o mesmo rótulo
        // que a API entregou, então a igualdade é exata. Não uso aqui a versão
        // sem acento do normalizar() de propósito — ela é a chave do cache, e
        // depender dela nesta conferência amarraria a trava à collation do
        // banco (se um dia for "accent sensitive", nada mais casaria).
        String alvo = termo == null ? "" : termo.trim();
        if (alvo.isEmpty()) return false;

        String sql = "vacina".equals(tipo)
                ? "SELECT 1 FROM calendario_vacinal WHERE vacina = ? LIMIT 1"
                : "SELECT 1 FROM exame_itens i "
                + "  JOIN exames e ON e.id = i.exame_id "
                + " WHERE e.paciente_id = ? AND i.nome = ? "
                + " UNION ALL "
                + "SELECT 1 FROM exames WHERE paciente_id = ? AND nome = ? "
                + " LIMIT 1";

        try (Connection con = Conexao.abrir();
             PreparedStatement st = con.prepareStatement(sql)) {
            if ("vacina".equals(tipo)) {
                st.setString(1, alvo);
            } else {
                st.setInt(1, idPaciente);
                st.setString(2, alvo);
                st.setInt(3, idPaciente);
                st.setString(4, alvo);
            }
            try (ResultSet rs = st.executeQuery()) {
                return rs.next();
            }
        }
    }

    /**
     * Chave de busca do termo: minúsculas, sem acento e sem espaço sobrando.
     *
     * Existe porque o mesmo exame chega escrito de jeitos diferentes conforme
     * quem digitou — "Glicemia de Jejum", "glicemia de jejum", "Glicemia
     * Jejum". Sem normalizar, cada variante viraria uma linha e uma chamada
     * nova ao modelo, que é exatamente o que a tabela existe para evitar.
     */
    static String normalizar(String termo) {
        if (termo == null) return "";
        String semAcento = Normalizer.normalize(termo, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return semAcento.trim().toLowerCase().replaceAll("\\s+", " ");
    }
}
