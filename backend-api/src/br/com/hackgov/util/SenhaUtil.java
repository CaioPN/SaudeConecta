package br.com.hackgov.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.spec.InvalidKeySpecException;
import java.util.Base64;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

/**
 * Tratamento da senha do paciente: ela NUNCA é armazenada em texto puro.
 *
 * <h3>Por que não é mais SHA-256 puro</h3>
 * A primeira versão gravava o SHA-256 da senha, sem salt. Isso tem dois
 * problemas conhecidos: o SHA-256 é rápido de propósito (uma placa de vídeo
 * testa bilhões de combinações por segundo, então uma senha comum cai em
 * minutos) e, sem salt, senhas iguais viram hashes iguais — quem vazasse a
 * tabela veria de imediato quais pacientes usam a mesma senha, e uma
 * <i>rainbow table</i> pronta resolveria todas as senhas comuns de uma vez.
 *
 * Agora usamos PBKDF2 com HMAC-SHA-256: cada senha ganha um salt aleatório e
 * o cálculo é repetido {@link #ITERACOES} vezes, o que torna cada tentativa de
 * quebra milhares de vezes mais cara sem pesar no login (um cálculo só).
 * O PBKDF2 vem na biblioteca padrão do Java — nenhuma dependência nova, como
 * manda a regra do backend.
 *
 * <h3>Formato gravado</h3>
 * <pre>pbkdf2$&lt;iterações&gt;$&lt;salt em Base64&gt;$&lt;hash em Base64&gt;</pre>
 * O número de iterações vai junto para que aumentá-lo no futuro não invalide
 * as senhas já gravadas: cada hash sabe com quantas voltas foi feito.
 *
 * <h3>Contas antigas</h3>
 * {@link #verificar} ainda aceita o formato antigo (64 caracteres em
 * hexadecimal), senão todo mundo que já tinha conta ficaria trancado do lado
 * de fora. {@link #precisaAtualizar} avisa que aquele hash é do formato velho,
 * e o login regrava a senha no formato novo — a migração acontece sozinha, na
 * primeira vez que a pessoa entra, sem ninguém precisar trocar de senha.
 */
public class SenhaUtil {

    /** Custo do PBKDF2. Referência do OWASP para PBKDF2-HMAC-SHA256 (2023). */
    private static final int ITERACOES = 210_000;

    /** 16 bytes de salt — o tamanho recomendado; mais que isso não agrega. */
    private static final int BYTES_SALT = 16;

    /** 32 bytes = 256 bits, o tamanho natural da saída do HMAC-SHA-256. */
    private static final int BYTES_HASH = 32;

    private static final String ALGORITMO = "PBKDF2WithHmacSHA256";
    private static final String PREFIXO = "pbkdf2";

    private static final SecureRandom ALEATORIO = new SecureRandom();

    /** Gera o hash de uma senha nova, já no formato com salt. */
    public static String hash(String senha) {
        byte[] salt = new byte[BYTES_SALT];
        ALEATORIO.nextBytes(salt);
        byte[] derivado = derivar(senha, salt, ITERACOES);

        Base64.Encoder b64 = Base64.getEncoder();
        return PREFIXO + "$" + ITERACOES + "$" + b64.encodeToString(salt) + "$" + b64.encodeToString(derivado);
    }

    /**
     * Confere se a senha digitada corresponde ao hash armazenado.
     *
     * Aceita os dois formatos: o novo (PBKDF2 com salt) e o antigo (SHA-256 em
     * hexadecimal), para não trancar quem se cadastrou antes da mudança.
     */
    public static boolean verificar(String senha, String hashArmazenado) {
        if (senha == null || hashArmazenado == null) return false;

        if (hashArmazenado.startsWith(PREFIXO + "$")) {
            String[] partes = hashArmazenado.split("\\$");
            if (partes.length != 4) return false;
            try {
                int iteracoes = Integer.parseInt(partes[1]);
                byte[] salt = Base64.getDecoder().decode(partes[2]);
                byte[] esperado = Base64.getDecoder().decode(partes[3]);
                return iguais(derivar(senha, salt, iteracoes), esperado);
            } catch (IllegalArgumentException e) {
                return false;   // hash corrompido no banco
            }
        }

        return iguais(hashLegado(senha).getBytes(StandardCharsets.UTF_8),
                      hashArmazenado.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Diz se o hash gravado é do formato antigo e merece ser regravado.
     *
     * Só o login sabe a senha em texto puro, então é lá que a troca acontece —
     * o resto do sistema nunca tem como recalcular o hash novo sozinho.
     */
    public static boolean precisaAtualizar(String hashArmazenado) {
        return hashArmazenado == null || !hashArmazenado.startsWith(PREFIXO + "$");
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

    private static byte[] derivar(String senha, byte[] salt, int iteracoes) {
        try {
            PBEKeySpec spec = new PBEKeySpec(senha.toCharArray(), salt, iteracoes, BYTES_HASH * 8);
            return SecretKeyFactory.getInstance(ALGORITMO).generateSecret(spec).getEncoded();
        } catch (NoSuchAlgorithmException | InvalidKeySpecException e) {
            throw new RuntimeException("Algoritmo " + ALGORITMO + " indisponível.", e);
        }
    }

    /**
     * Comparação em tempo constante.
     *
     * O {@code equals} normal para na primeira diferença, e o tempo que ele
     * leva conta quantos caracteres iniciais estavam certos. Num endpoint de
     * login isso é medível de fora, então a comparação percorre sempre os dois
     * vetores inteiros.
     */
    private static boolean iguais(byte[] a, byte[] b) {
        return MessageDigest.isEqual(a, b);
    }

    /** Formato antigo: SHA-256 sem salt, mantido só para conferir contas velhas. */
    private static String hashLegado(String senha) {
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

    private SenhaUtil() { }
}
