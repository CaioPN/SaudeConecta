package br.com.hackgov.util;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;

/**
 * Chamada ao modelo de linguagem que responde as perguntas livres do chatbot.
 *
 * Usa a API do Google Gemini pelo nível gratuito. Não há biblioteca nova: o
 * HttpClient vem no próprio JDK (Java 11+) e o JSON é montado e lido pelo
 * {@link Json} do projeto.
 *
 * LGPD — o nível gratuito do Gemini pode usar os prompts para treinar o modelo.
 * Por isso NADA de dado do paciente sai daqui: só a pergunta digitada e um
 * texto fixo explicando o app. Quem chama esta classe não passa nome, CPF,
 * cartão do SUS, exame nem diagnóstico.
 */
public final class ChatIA {

    /** Onde procurar a chave, na ordem: variável de ambiente e depois arquivo. */
    private static final String VAR_AMBIENTE = "GEMINI_API_KEY";
    private static final String ARQUIVO_CONFIG = "config.properties";

    /** Tamanho máximo da pergunta aceita, para não gastar a cota à toa. */
    public static final int LIMITE_PERGUNTA = 500;

    private static final Duration TEMPO_LIMITE = Duration.ofSeconds(20);

    private static final HttpClient CLIENTE = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    /**
     * Papel do assistente. Mantém o bot dentro do escopo do app e fora de
     * qualquer conduta clínica — ele orienta e encaminha, nunca diagnostica.
     */
    private static final String INSTRUCAO =
            "Você é o assistente virtual do SaúdeConecta, um aplicativo brasileiro que centraliza "
          + "os dados de saúde do paciente como extensão do SUS.\n\n"
          + "O app tem: carteira de vacinação pelo calendário do PNI, consultas, exames de sangue e "
          + "de imagem, prontuário (alergias, condições e medicações), cadastro de dependentes, "
          + "tipo sanguíneo e um código temporário que libera os dados para o médico no atendimento.\n\n"
          + "REGRAS OBRIGATÓRIAS:\n"
          + "1. Nunca dê diagnóstico, não indique remédio, não sugira dose e não interprete resultado "
          + "de exame. Se pedirem isso, explique que só um profissional de saúde pode avaliar e "
          + "oriente a procurar uma UBS ou agendar consulta pelo app.\n"
          + "2. Em qualquer sinal de urgência (dor no peito, falta de ar, sangramento, desmaio, "
          + "pensamentos de se machucar), oriente imediatamente a ligar 192 (SAMU) ou ir ao "
          + "pronto-socorro mais próximo.\n"
          + "3. Você não tem acesso aos dados do paciente. Não invente exame, consulta ou resultado; "
          + "explique em que tela ele encontra a informação.\n"
          + "4. Nunca peça CPF, cartão do SUS, senha ou dado pessoal.\n"
          + "5. Responda em português do Brasil, direto, no máximo 4 frases curtas.";

    private static String chave;
    private static String modelo = "gemini-2.0-flash";
    private static boolean configurado;

    private ChatIA() { }

    /** Diz se há chave configurada — sem ela o chatbot fica só nas regras locais. */
    public static synchronized boolean disponivel() {
        carregarConfig();
        return chave != null && !chave.isBlank();
    }

    /**
     * Envia a pergunta ao modelo e devolve a resposta em texto.
     *
     * @return o texto da resposta, ou null se o modelo não respondeu (cota
     *         estourada, conteúdo bloqueado ou falha de rede). Quem chama trata
     *         o null como "cai no texto de fallback".
     */
    public static String responder(String pergunta) {
        if (!disponivel() || pergunta == null || pergunta.isBlank()) {
            return null;
        }
        String texto = pergunta.length() > LIMITE_PERGUNTA
                ? pergunta.substring(0, LIMITE_PERGUNTA)
                : pergunta;

        try {
            String corpo = montarRequisicao(texto);
            String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                    + modelo + ":generateContent";

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(TEMPO_LIMITE)
                    .header("Content-Type", "application/json; charset=UTF-8")
                    .header("x-goog-api-key", chave) // chave no header, nunca na URL
                    .POST(HttpRequest.BodyPublishers.ofString(corpo, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> resp = CLIENTE.send(
                    req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

            if (resp.statusCode() != 200) {
                // Não logamos o corpo: ele pode ecoar a pergunta do paciente.
                System.out.println("[ERRO chat-ia] HTTP " + resp.statusCode());
                return null;
            }
            return extrairTexto(resp.body());

        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            System.out.println("[ERRO chat-ia] " + e.getClass().getSimpleName());
            return null;
        }
    }

    /** Monta o corpo esperado pelo endpoint generateContent. */
    private static String montarRequisicao(String pergunta) {
        Map<String, Object> parteInstrucao = new LinkedHashMap<>();
        parteInstrucao.put("text", INSTRUCAO);
        Map<String, Object> instrucao = new LinkedHashMap<>();
        instrucao.put("parts", List.of(parteInstrucao));

        Map<String, Object> partePergunta = new LinkedHashMap<>();
        partePergunta.put("text", pergunta);
        Map<String, Object> turno = new LinkedHashMap<>();
        turno.put("role", "user");
        turno.put("parts", List.of(partePergunta));

        Map<String, Object> config = new LinkedHashMap<>();
        config.put("temperature", 0.3);
        config.put("maxOutputTokens", 300);

        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("system_instruction", instrucao);
        corpo.put("contents", List.of(turno));
        corpo.put("generationConfig", config);
        return Json.escreverObjeto(corpo);
    }

    /**
     * Percorre candidates[0].content.parts[] e junta os textos.
     * Devolve null quando a resposta veio vazia (ex.: bloqueada por segurança).
     */
    @SuppressWarnings("unchecked")
    private static String extrairTexto(String json) {
        try {
            Map<String, Object> raiz = Json.parseObjeto(json);
            Object candidatos = raiz.get("candidates");
            if (!(candidatos instanceof List) || ((List<Object>) candidatos).isEmpty()) {
                return null;
            }
            Object primeiro = ((List<Object>) candidatos).get(0);
            if (!(primeiro instanceof Map)) return null;

            Object conteudo = ((Map<String, Object>) primeiro).get("content");
            if (!(conteudo instanceof Map)) return null;

            Object partes = ((Map<String, Object>) conteudo).get("parts");
            if (!(partes instanceof List)) return null;

            StringBuilder sb = new StringBuilder();
            for (Object parte : (List<Object>) partes) {
                if (parte instanceof Map) {
                    Object t = ((Map<String, Object>) parte).get("text");
                    if (t != null) sb.append(t);
                }
            }
            String texto = sb.toString().trim();
            return texto.isEmpty() ? null : texto;

        } catch (IllegalArgumentException e) {
            System.out.println("[ERRO chat-ia] resposta em formato inesperado.");
            return null;
        }
    }

    /**
     * Lê a chave uma única vez. Procura primeiro na variável de ambiente
     * GEMINI_API_KEY e depois no config.properties da pasta backend-api
     * (arquivo fora do Git — ver .gitignore).
     */
    private static void carregarConfig() {
        if (configurado) return;
        configurado = true;

        String doAmbiente = System.getenv(VAR_AMBIENTE);
        if (doAmbiente != null && !doAmbiente.isBlank()) {
            chave = doAmbiente.trim();
            return;
        }

        Path arquivo = Path.of(ARQUIVO_CONFIG);
        if (!Files.isReadable(arquivo)) return;

        Properties props = new Properties();
        try (InputStream in = Files.newInputStream(arquivo)) {
            props.load(in);
        } catch (IOException e) {
            System.out.println("[ERRO chat-ia] não foi possível ler " + ARQUIVO_CONFIG);
            return;
        }

        String valor = props.getProperty("gemini.api.key");
        if (valor != null && !valor.isBlank()) {
            chave = valor.trim();
        }
        String m = props.getProperty("gemini.modelo");
        if (m != null && !m.isBlank()) {
            modelo = m.trim();
        }
    }
}
