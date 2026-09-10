package br.com.hackgov.util;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * O segundo modelo — quem responde quando o Gemini não responde.
 *
 * <h3>Por que é "compatível com OpenAI" e não "o Groq"</h3>
 * Groq, NVIDIA NIM, Mistral e OpenRouter falam todos o mesmo formato de
 * requisição (<code>/chat/completions</code>). Escrevendo para o formato, e não
 * para a empresa, trocar de provedor é mexer em três linhas do
 * config.properties — sem recompilar e sem classe nova. Isso é a lição direta
 * do dia em que o modelo do Gemini foi aposentado e o app não tinha saída.
 *
 * <h3>LGPD</h3>
 * Vale aqui a mesma regra do {@link ChatIA}: só a pergunta digitada e o texto
 * fixo sobre o app. Nenhum dado do paciente passa por aqui. Ter dois provedores
 * significa dois lugares para onde a pergunta pode ir, então a regra não pode
 * ser afrouxada num deles.
 *
 * <h3>Quando não está configurado</h3>
 * Sem <code>ia.reserva.key</code> a classe fica inerte e {@link #disponivel()}
 * devolve false — o app continua funcionando exatamente como antes, com o
 * Gemini e o texto de fallback.
 */
public final class IaReserva {

    /** Teto de tokens da resposta. Ver a explicação em ChatIA.TETO_SAIDA. */
    private static final int TETO_SAIDA = 1500;

    /**
     * Tempo limite curto de propósito: a reserva só entra DEPOIS de o titular
     * falhar, então a espera dela soma à que o paciente já teve. Mais vale o
     * texto de fallback do que trinta segundos olhando os três pontinhos.
     */
    private static final Duration TEMPO_LIMITE = Duration.ofSeconds(12);

    private static final HttpClient CLIENTE = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .build();

    private IaReserva() { }

    /** Diz se há provedor de reserva configurado. */
    public static boolean disponivel() {
        return Config.ler("ia.reserva.key") != null
            && Config.ler("ia.reserva.url") != null
            && Config.ler("ia.reserva.modelo") != null;
    }

    /** Nome do modelo de reserva, para gravar junto com o texto do glossário. */
    public static String modeloAtual() {
        return Config.ler("ia.reserva.modelo");
    }

    /**
     * Manda a pergunta ao provedor de reserva.
     *
     * @return o texto da resposta, ou null se ele também não respondeu — aí
     *         quem chama cai no texto de fallback.
     */
    public static String responder(String instrucao, String pergunta) {
        if (!disponivel() || pergunta == null || pergunta.isBlank()) return null;

        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(Config.ler("ia.reserva.url")))
                    .timeout(TEMPO_LIMITE)
                    .header("Content-Type", "application/json; charset=UTF-8")
                    .header("Authorization", "Bearer " + Config.ler("ia.reserva.key"))
                    .POST(HttpRequest.BodyPublishers.ofString(
                            montarRequisicao(instrucao, pergunta), StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> resp = CLIENTE.send(
                    req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

            if (resp.statusCode() != 200) {
                // Como no ChatIA, o corpo não é logado: pode ecoar a pergunta.
                System.out.println("[ERRO ia-reserva] HTTP " + resp.statusCode());
                return null;
            }
            return extrairTexto(resp.body());

        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            System.out.println("[ERRO ia-reserva] " + e.getClass().getSimpleName());
            return null;
        }
    }

    /** Corpo do /chat/completions: a instrução como "system", a pergunta como "user". */
    private static String montarRequisicao(String instrucao, String pergunta) {
        Map<String, Object> sistema = new LinkedHashMap<>();
        sistema.put("role", "system");
        sistema.put("content", instrucao);

        Map<String, Object> usuario = new LinkedHashMap<>();
        usuario.put("role", "user");
        usuario.put("content", pergunta);

        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("model", Config.ler("ia.reserva.modelo"));
        corpo.put("messages", List.of(sistema, usuario));
        corpo.put("temperature", 0.3);
        corpo.put("max_tokens", TETO_SAIDA);
        return Json.escreverObjeto(corpo);
    }

    /**
     * Lê choices[0].message.content.
     *
     * Recusa resposta truncada pelo mesmo motivo do ChatIA: meia frase parece
     * resposta e some justamente onde estaria a orientação.
     */
    @SuppressWarnings("unchecked")
    private static String extrairTexto(String json) {
        try {
            Map<String, Object> raiz = Json.parseObjeto(json);
            Object escolhas = raiz.get("choices");
            if (!(escolhas instanceof List) || ((List<Object>) escolhas).isEmpty()) return null;

            Object primeira = ((List<Object>) escolhas).get(0);
            if (!(primeira instanceof Map)) return null;

            Object motivo = ((Map<String, Object>) primeira).get("finish_reason");
            if (motivo != null && !"stop".equals(motivo.toString())) {
                System.out.println("[ERRO ia-reserva] resposta interrompida: " + motivo);
                return null;
            }

            Object mensagem = ((Map<String, Object>) primeira).get("message");
            if (!(mensagem instanceof Map)) return null;

            Object texto = ((Map<String, Object>) mensagem).get("content");
            if (texto == null) return null;

            String limpo = texto.toString().trim();
            return limpo.isEmpty() ? null : limpo;

        } catch (IllegalArgumentException e) {
            System.out.println("[ERRO ia-reserva] resposta em formato inesperado.");
            return null;
        }
    }
}
