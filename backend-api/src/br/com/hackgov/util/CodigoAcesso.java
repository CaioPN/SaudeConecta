package br.com.hackgov.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;

/**
 * Geração dos códigos de acesso temporário que o paciente mostra ao médico.
 *
 * O alfabeto não tem os caracteres que se confundem ao ler em voz alta ou numa
 * tela (0/O, 1/I/L), porque o código costuma ser ditado durante a consulta.
 * São 8 caracteres em 32 símbolos, ou seja 32^8 (~1 trilhão) de combinações —
 * o que, somado à validade de minutos, torna a tentativa por força bruta
 * inviável.
 */
public final class CodigoAcesso {

    private static final String ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private static final int TAMANHO = 8;
    private static final SecureRandom RANDOM = new SecureRandom();

    private CodigoAcesso() { }

    /** Gera um código no formato "K7QP-2XM9" (o hífen é só visual). */
    public static String gerar() {
        StringBuilder sb = new StringBuilder(TAMANHO + 1);
        for (int i = 0; i < TAMANHO; i++) {
            if (i == TAMANHO / 2) sb.append('-');
            sb.append(ALFABETO.charAt(RANDOM.nextInt(ALFABETO.length())));
        }
        return sb.toString();
    }

    /**
     * Normaliza o que o médico digitou antes de gerar o hash: tira hífens e
     * espaços e passa para maiúsculas, para que "k7qp2xm9" e "K7QP-2XM9"
     * cheguem ao mesmo hash.
     */
    public static String normalizar(String codigo) {
        if (codigo == null) return "";
        return codigo.replaceAll("[^A-Za-z0-9]", "").toUpperCase();
    }

    /**
     * Hash guardado no banco — o código em si nunca é persistido.
     *
     * <h3>Por que aqui é SHA-256 puro, e não o PBKDF2 do SenhaUtil</h3>
     * O hash da senha é salgado de propósito: cada conta tem um salt próprio,
     * então a mesma senha vira hashes diferentes e ninguém consegue procurar
     * por igualdade — a conferência é feita contra a linha do dono, que já se
     * conhece pelo e-mail.
     *
     * Com o código do médico é o contrário: quem digita não diz de quem é o
     * código, então a única maneira de encontrá-lo é procurar pelo hash
     * ({@code WHERE codigo_hash = ?}). Isso exige um hash determinístico, e um
     * salt por linha tornaria a busca impossível.
     *
     * O que compensa a ausência de salt é a natureza do segredo: 8 caracteres
     * sorteados em 32 símbolos (~10^12 combinações), válidos por 30 minutos e
     * de uso único. Não é uma senha escolhida por pessoa, que é o caso em que
     * a tabela pré-computada faz estrago.
     */
    public static String hash(String codigo) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] bytes = md.digest(normalizar(codigo).getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(64);
            for (byte b : bytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Algoritmo SHA-256 indisponível.", e);
        }
    }
}
