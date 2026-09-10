package br.com.hackgov.util;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;

/**
 * Leitor do config.properties da pasta backend-api — o arquivo que fica fora do
 * Git e guarda as chaves de API (ver .gitignore e config.properties.example).
 *
 * <h3>Ordem de procura</h3>
 * Primeiro a variável de ambiente, depois o arquivo. A variável correspondente
 * é o nome da chave em maiúsculas com ponto virando sublinhado, então
 * <code>gemini.api.key</code> lê <code>GEMINI_API_KEY</code>. Isso deixa a
 * chave fora do disco em quem prefere assim, sem inventar um segundo nome.
 *
 * <h3>Por que existe</h3>
 * Antes o ChatIA lia o arquivo por conta própria. Com um segundo provedor de IA
 * (ver {@link IaReserva}), a leitura seria copiada — e com ela a regra sutil de
 * ignorar o texto de exemplo, que já custou uma sessão de depuração.
 */
public final class Config {

    /** Texto que vem no config.properties.example; não conta como valor. */
    private static final String PLACEHOLDER = "COLE_SUA_CHAVE_AQUI";

    private static final String ARQUIVO = "config.properties";

    private static Properties props;

    private Config() { }

    /**
     * Devolve o valor da chave, ou null quando ela não foi configurada.
     *
     * Trata como "não configurado" tanto o valor em branco quanto o texto de
     * exemplo: quem copia o .example e esquece de colar a chave tem um arquivo
     * preenchido, e sem esta conferência o app se diria pronto e só falharia
     * na hora de chamar a API.
     */
    public static synchronized String ler(String chave) {
        String doAmbiente = System.getenv(chave.toUpperCase().replace('.', '_'));
        if (valido(doAmbiente)) return doAmbiente.trim();

        carregar();
        String doArquivo = props.getProperty(chave);
        return valido(doArquivo) ? doArquivo.trim() : null;
    }

    private static boolean valido(String valor) {
        return valor != null && !valor.isBlank() && !PLACEHOLDER.equals(valor.trim());
    }

    /** Lê o arquivo uma única vez. Ausente, vale como arquivo vazio. */
    private static void carregar() {
        if (props != null) return;
        props = new Properties();

        Path arquivo = Path.of(ARQUIVO);
        if (!Files.isReadable(arquivo)) return;

        try (InputStream in = Files.newInputStream(arquivo)) {
            props.load(in);
        } catch (IOException e) {
            System.out.println("[ERRO config] não foi possível ler " + ARQUIVO);
        }
    }
}
