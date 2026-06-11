package br.com.hackgov.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * Tratamento de dados sensíveis: a senha do paciente NUNCA é armazenada em
 * texto puro. Antes de gravar no banco, geramos um hash SHA-256.
 *
 * (Usa apenas a biblioteca padrão do Java — sem dependências externas.)
 */
public class SenhaUtil {

    /** Gera o hash SHA-256 (em hexadecimal) de uma senha. */
    public static String hash(String senha) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] bytes = md.digest(senha.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Algoritmo SHA-256 indisponível.", e);
        }
    }

    /** Confere se a senha digitada corresponde ao hash armazenado. */
    public static boolean verificar(String senha, String hashArmazenado) {
        return hash(senha).equals(hashArmazenado);
    }

    /**
     * Valida a força da senha: ao menos 8 caracteres, com letra maiúscula,
     * minúscula, número e caractere especial. Devolve null se estiver ok,
     * ou a mensagem de erro correspondente.
     */
    public static String validarForca(String senha) {
        if (senha == null || senha.length() < 8) {
            return "A senha deve ter ao menos 8 caracteres.";
        }
        if (!senha.matches(".*[a-z].*")) {
            return "A senha deve conter ao menos uma letra minúscula.";
        }
        if (!senha.matches(".*[A-Z].*")) {
            return "A senha deve conter ao menos uma letra maiúscula.";
        }
        if (!senha.matches(".*\\d.*")) {
            return "A senha deve conter ao menos um número.";
        }
        if (!senha.matches(".*[^A-Za-z0-9].*")) {
            return "A senha deve conter ao menos um caractere especial.";
        }
        return null;
    }

    private SenhaUtil() { }
}
