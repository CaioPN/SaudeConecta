package br.com.hackgov.util;

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

    /** Hash guardado no banco — o código em si nunca é persistido. */
    public static String hash(String codigo) {
        return SenhaUtil.hash(normalizar(codigo));
    }
}
