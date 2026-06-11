package br.com.hackgov.util;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * Geração e validação de tokens JWT (JSON Web Token) com algoritmo HS256
 * (HMAC-SHA256), usando apenas a biblioteca padrão do Java.
 *
 * O token é assinado e validado por este mesmo backend, então o segredo só
 * precisa ser consistente. Em produção, mova-o para uma variável de ambiente.
 */
public final class Jwt {

    private Jwt() { }

    /** Segredo de assinatura. (Equivale ao JWT_SECRET do backend Node.) */
    private static final String SEGREDO =
        "saudeconecta-segredo-super-secreto-troque-em-producao";

    /** Validade padrão do token: 7 dias (em segundos). */
    private static final long EXPIRACAO_SEGUNDOS = 7L * 24 * 60 * 60;

    private static final Base64.Encoder B64 = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder B64DEC = Base64.getUrlDecoder();

    /**
     * Gera um token JWT para o paciente. As claims informadas são mescladas com
     * os campos padrão (iat/exp).
     */
    public static String gerar(Map<String, Object> claims) {
        Map<String, Object> header = new LinkedHashMap<>();
        header.put("alg", "HS256");
        header.put("typ", "JWT");

        long agora = System.currentTimeMillis() / 1000L;
        Map<String, Object> payload = new LinkedHashMap<>(claims);
        payload.put("iat", agora);
        payload.put("exp", agora + EXPIRACAO_SEGUNDOS);

        String h = B64.encodeToString(Json.escreverObjeto(header).getBytes(StandardCharsets.UTF_8));
        String p = B64.encodeToString(Json.escreverObjeto(payload).getBytes(StandardCharsets.UTF_8));
        String assinatura = assinar(h + "." + p);
        return h + "." + p + "." + assinatura;
    }

    /**
     * Valida o token e devolve suas claims. Retorna {@code null} se o token for
     * malformado, tiver assinatura inválida ou estiver expirado.
     */
    public static Map<String, Object> validar(String token) {
        if (token == null) return null;
        String[] partes = token.split("\\.");
        if (partes.length != 3) return null;

        String esperada = assinar(partes[0] + "." + partes[1]);
        if (!constantesIguais(esperada, partes[2])) return null;

        try {
            String payloadJson = new String(B64DEC.decode(partes[1]), StandardCharsets.UTF_8);
            Map<String, Object> claims = Json.parseObjeto(payloadJson);
            Object exp = claims.get("exp");
            if (exp instanceof Number) {
                long expSeg = ((Number) exp).longValue();
                long agora = System.currentTimeMillis() / 1000L;
                if (agora >= expSeg) return null; // expirado
            }
            return claims;
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static String assinar(String dados) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(SEGREDO.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] sig = mac.doFinal(dados.getBytes(StandardCharsets.UTF_8));
            return B64.encodeToString(sig);
        } catch (Exception e) {
            throw new RuntimeException("Falha ao assinar o token JWT.", e);
        }
    }

    /** Comparação em tempo constante para evitar timing attacks na assinatura. */
    private static boolean constantesIguais(String a, String b) {
        if (a == null || b == null || a.length() != b.length()) return false;
        int dif = 0;
        for (int i = 0; i < a.length(); i++) {
            dif |= a.charAt(i) ^ b.charAt(i);
        }
        return dif == 0;
    }
}
