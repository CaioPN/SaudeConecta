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
 * Chamada ao modelo de linguagem que responde as perguntas livres do chatbot.
 *
 * Usa a API do Google Gemini pelo nível gratuito. Não há biblioteca nova: o
 * HttpClient vem no próprio JDK (Java 11+) e o JSON é montado e lido pelo
 * {@link Json} do projeto.
 *
 * <h3>Duas IAs</h3>
 * Esta classe é a porta de entrada e a ordem: tenta o Gemini e, se ele não
 * responder, passa para a {@link IaReserva} — um provedor compatível com
 * OpenAI, configurável (Groq, NVIDIA NIM, Mistral...). Só quando as duas falham
 * é que quem chama cai no texto de fallback. A reserva é opcional: sem ela
 * configurada, tudo funciona como antes.
 *
 * LGPD — o nível gratuito do Gemini pode usar os prompts para treinar o modelo.
 * Por isso NADA de dado do paciente sai daqui: só a pergunta digitada e um
 * texto fixo explicando o app. Quem chama esta classe não passa nome, CPF,
 * cartão do SUS, exame nem diagnóstico.
 */
public final class ChatIA {

    /** Chave da API do Gemini (ou a variável de ambiente GEMINI_API_KEY). */
    private static final String CHAVE_GEMINI = "gemini.api.key";

    /** Tamanho máximo da pergunta aceita, para não gastar a cota à toa. */
    public static final int LIMITE_PERGUNTA = 500;

    /**
     * Teto de tokens da resposta. É alto para uma resposta de 4 frases porque
     * os modelos atuais "pensam" antes de escrever, e esses tokens de
     * raciocínio saem do MESMO orçamento — medindo aqui, o pensamento sozinho
     * gastou de 234 a 533. Com o teto de 300 que havia antes, o pensamento
     * consumia tudo e a resposta chegava cortada no meio da frase.
     */
    private static final int TETO_SAIDA = 1500;

    /** Espera pelo Gemini quando ele é a única IA configurada. */
    private static final Duration TEMPO_LIMITE = Duration.ofSeconds(20);

    /** Espera pelo Gemini quando há reserva — ver tempoLimiteGemini(). */
    private static final Duration TEMPO_LIMITE_COM_RESERVA = Duration.ofSeconds(6);

    /** Espera antes da segunda tentativa, quando o modelo responde 503. */
    private static final Duration PAUSA_NOVA_TENTATIVA = Duration.ofMillis(700);

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
          + "tipo sanguíneo, contatos de emergência, histórico de quem acessou os dados, a Rede de "
          + "Saúde (UBS, UPA e pronto-socorro perto do paciente, com telefone e rota) e um código "
          + "temporário que libera os dados para o médico no atendimento. Em \"Mais\" > \"Meu perfil\" "
          + "há uma seção de Acessibilidade, com o tamanho do texto (Padrão, Grande, Maior) e a opção "
          + "de texto mais escuro.\n\n"
          + "O QUE O APP NÃO FAZ (nunca prometa isso): ele não agenda consulta nem marca exame com "
          + "a unidade de saúde — o agendamento é feito direto com ela, por telefone ou no balcão. "
          + "O paciente pode ANOTAR no app, em \"Consultas\", uma consulta que ele já marcou, e o "
          + "app lembra da data; anotar não é agendar, e essa diferença precisa ficar clara. "
          + "Também não recebe arquivo nem foto de exame enviada pelo paciente: "
          + "quem registra consulta, exame, prontuário e dose de vacina é o médico, pelo código de "
          + "acesso. O paciente NÃO marca dose na carteira: para ele a carteira é só de leitura.\n\n"
          + "REGRAS OBRIGATÓRIAS:\n"
          + "1. Nunca dê diagnóstico, não indique remédio, não sugira dose e não interprete resultado "
          + "de exame. Se pedirem isso, explique que só um profissional de saúde pode avaliar e "
          + "oriente a procurar uma unidade de saúde — a tela Rede de Saúde mostra as mais próximas, "
          + "com telefone.\n"
          + "2. Em qualquer sinal de urgência (dor no peito, falta de ar, sangramento, desmaio, "
          + "pensamentos de se machucar), oriente imediatamente a ligar 192 (SAMU) ou ir ao "
          + "pronto-socorro mais próximo.\n"
          + "3. Você não tem acesso aos dados do paciente. Não invente exame, consulta ou resultado; "
          + "explique em que tela ele encontra a informação.\n"
          + "4. Nunca peça CPF, cartão do SUS, senha ou dado pessoal.\n"
          + "5. Responda em português do Brasil, direto, no máximo 4 frases curtas.";

    /**
     * Papel do glossário: explicar o que é um exame ou uma vacina, como quem
     * escreve um verbete — não como quem lê o resultado de alguém.
     *
     * O texto gerado aqui é gravado no banco e mostrado a TODOS os pacientes,
     * então ele não pode falar com um em particular. É essa a razão da regra 2:
     * o modelo não recebe resultado nenhum, mas, se o deixarmos escrever "o seu
     * valor está alto", o paciente lê aquilo como se fosse sobre ele.
     */
    private static final String INSTRUCAO_GLOSSARIO =
            "Você escreve verbetes de um glossário de saúde para pacientes do SUS, em português "
          + "do Brasil simples — quem vai ler não é da área da saúde.\n\n"
          + "REGRAS OBRIGATÓRIAS:\n"
          + "1. Explique o que o exame ou a vacina é, o que ele mede ou previne e por que o "
          + "profissional costuma pedi-lo ou aplicá-la.\n"
          + "2. Escreva sobre o exame em geral, NUNCA sobre o resultado de alguém. Você não "
          + "recebeu resultado nenhum. Não escreva \"o seu resultado\", não diga o que é valor "
          + "alto ou baixo, não dê faixa de referência e não cite números.\n"
          + "3. Nunca dê diagnóstico, não indique remédio e não sugira tratamento. Termine "
          + "lembrando que quem interpreta é o profissional de saúde.\n"
          + "4. Não invente: se não souber o que é o termo, responda apenas a palavra "
          + "DESCONHECIDO, sem mais nada.\n"
          + "5. No máximo 4 frases curtas. Não use título, lista nem marcação.";

    /**
     * Modelo usado quando o config.properties não diz outro. É um "lite" de
     * propósito: o bot responde dúvida sobre o app em 4 frases, e os modelos
     * maiores gastam vários segundos "pensando" antes de escrever — medindo
     * aqui, ~1 s contra 5 a 17 s, além de darem 503 em hora de pico.
     */
    private static final String MODELO_PADRAO = "gemini-3.5-flash-lite";

    private ChatIA() { }

    /**
     * Diz se há alguma IA configurada — o Gemini ou a reserva. Sem nenhuma das
     * duas o chatbot fica só nas regras locais.
     */
    public static boolean disponivel() {
        return Config.ler(CHAVE_GEMINI) != null || IaReserva.disponivel();
    }

    /**
     * Envia a pergunta ao modelo e devolve a resposta em texto.
     *
     * @return o texto da resposta, ou null se o modelo não respondeu (cota
     *         estourada, conteúdo bloqueado ou falha de rede). Quem chama trata
     *         o null como "cai no texto de fallback".
     */
    public static String responder(String pergunta) {
        if (pergunta == null || pergunta.isBlank()) return null;
        String texto = pergunta.length() > LIMITE_PERGUNTA
                ? pergunta.substring(0, LIMITE_PERGUNTA)
                : pergunta;
        return chamar(INSTRUCAO, texto);
    }

    /**
     * Escreve a explicação de um termo do glossário — o nome de um exame ou de
     * uma vacina — em linguagem de paciente.
     *
     * LGPD: o que entra aqui é VOCABULÁRIO, não dado de ninguém. Quem chama
     * passa "TGP" ou "Pentavalente", nunca o resultado, a data ou o nome do
     * paciente. Por isso o texto pode ser guardado no banco e reaproveitado
     * por todo mundo (ver ExplicacaoDAO).
     *
     * @param tipo   "exame" ou "vacina" — muda o enunciado.
     * @param rotulo o nome como aparece na tela.
     */
    public static Verbete explicarTermo(String tipo, String rotulo) {
        if (rotulo == null || rotulo.isBlank()) return null;
        String pedido = "vacina".equals(tipo)
                ? "Explique para que serve a vacina \"" + rotulo + "\"."
                : "Explique o que é o exame \"" + rotulo + "\" e para que o médico o pede.";

        String doGemini = chamarGemini(INSTRUCAO_GLOSSARIO, pedido);
        if (doGemini != null) return new Verbete(doGemini, modeloGemini());

        String daReserva = IaReserva.responder(INSTRUCAO_GLOSSARIO, pedido);
        return daReserva != null ? new Verbete(daReserva, IaReserva.modeloAtual()) : null;
    }

    /**
     * Um verbete recém-escrito e QUEM o escreveu.
     *
     * O modelo vem junto porque o texto vai ser gravado e mostrado a todos os
     * pacientes dali em diante: se um modelo se revelar ruim, a coluna permite
     * apagar em bloco só o que ele escreveu. Devolver "o modelo configurado"
     * em vez de "o modelo que respondeu" anularia isso — foi o que acontecia
     * quando o Gemini falhava e a reserva respondia.
     */
    public static final class Verbete {
        private final String texto;
        private final String modelo;

        Verbete(String texto, String modelo) {
            this.texto = texto;
            this.modelo = modelo;
        }

        public String getTexto() { return texto; }
        public String getModelo() { return modelo; }
    }

    /**
     * A cadeia: tenta o Gemini e, se ele não responder, passa a bola para a
     * reserva. Só depois das duas é que quem chama cai no texto de fallback.
     *
     * O "não respondeu" do titular cobre tudo o que o {@link #chamarGemini}
     * transforma em null — 404 de modelo aposentado, 429 de cota do dia, 503
     * depois da segunda tentativa, timeout e resposta truncada.
     */
    private static String chamar(String instrucao, String pergunta) {
        String doGemini = chamarGemini(instrucao, pergunta);
        if (doGemini != null) return doGemini;

        return IaReserva.responder(instrucao, pergunta);
    }

    /** Monta, envia ao Gemini, trata o 503 e lê a resposta. */
    private static String chamarGemini(String instrucao, String pergunta) {
        String chave = Config.ler(CHAVE_GEMINI);
        if (chave == null) return null;

        try {
            String corpo = montarRequisicao(instrucao, pergunta);
            String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                    + modeloGemini() + ":generateContent";

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(tempoLimiteGemini())
                    .header("Content-Type", "application/json; charset=UTF-8")
                    .header("x-goog-api-key", chave) // chave no header, nunca na URL
                    .POST(HttpRequest.BodyPublishers.ofString(corpo, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> resp = CLIENTE.send(
                    req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

            // 503 é fila do modelo, não erro nosso: o próprio Google responde
            // "high demand, try again later". Uma segunda tentativa resolve, e
            // sem ela o bot cai no fallback com a pergunta perfeitamente boa.
            // Só o 503 é repetido: 429 é cota do dia e 4xx não muda sozinho.
            if (resp.statusCode() == 503) {
                Thread.sleep(PAUSA_NOVA_TENTATIVA.toMillis());
                resp = CLIENTE.send(
                        req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            }

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
    private static String montarRequisicao(String instrucao, String pergunta) {
        Map<String, Object> parteInstrucao = new LinkedHashMap<>();
        parteInstrucao.put("text", instrucao);
        Map<String, Object> blocoInstrucao = new LinkedHashMap<>();
        blocoInstrucao.put("parts", List.of(parteInstrucao));

        Map<String, Object> partePergunta = new LinkedHashMap<>();
        partePergunta.put("text", pergunta);
        Map<String, Object> turno = new LinkedHashMap<>();
        turno.put("role", "user");
        turno.put("parts", List.of(partePergunta));

        Map<String, Object> config = new LinkedHashMap<>();
        config.put("temperature", 0.3);
        config.put("maxOutputTokens", TETO_SAIDA);

        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("system_instruction", blocoInstrucao);
        corpo.put("contents", List.of(turno));
        corpo.put("generationConfig", config);
        return Json.escreverObjeto(corpo);
    }

    /**
     * Percorre candidates[0].content.parts[] e junta os textos.
     * Devolve null quando a resposta veio vazia (ex.: bloqueada por segurança)
     * ou truncada — meia frase é pior que o texto de fallback, porque parece
     * resposta e some justamente onde estaria a orientação.
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

            Object motivo = ((Map<String, Object>) primeiro).get("finishReason");
            if (motivo != null && !"STOP".equals(motivo.toString())) {
                // MAX_TOKENS (teto estourado), SAFETY, RECITATION...
                System.out.println("[ERRO chat-ia] resposta interrompida: " + motivo);
                return null;
            }

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
     * Modelo do Gemini em uso. Sai do config.properties (ou de GEMINI_MODELO),
     * e só cai no embutido quando ninguém configurou nada — trocar o modelo
     * precisa continuar sendo uma linha de arquivo, porque é assim que se
     * conserta o 404 do dia em que o Google aposenta o modelo atual.
     */
    private static String modeloGemini() {
        if (Config.ler(CHAVE_GEMINI) == null) return null;
        String m = Config.ler("gemini.modelo");
        return m != null ? m : MODELO_PADRAO;
    }

    /**
     * Quanto esperar pelo Gemini. Com uma reserva configurada a espera dela
     * soma à daqui, então o titular perde a paciência mais cedo: mais vale
     * trocar de modelo do que deixar o paciente vinte segundos nos pontinhos.
     */
    private static Duration tempoLimiteGemini() {
        return IaReserva.disponivel() ? TEMPO_LIMITE_COM_RESERVA : TEMPO_LIMITE;
    }
}
