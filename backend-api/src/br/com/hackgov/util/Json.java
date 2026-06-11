package br.com.hackgov.util;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Utilitário JSON minimalista — leitura e escrita — usando APENAS a biblioteca
 * padrão do Java (sem Gson/Jackson). Cobre o necessário para a API da
 * SaúdeConecta: objetos, arrays, strings, números, true/false/null.
 *
 * - {@link #parse(String)} converte um texto JSON em objetos Java
 *   (Map&lt;String,Object&gt;, List&lt;Object&gt;, String, Double, Boolean, null).
 * - {@link #escreverObjeto(Map)} / {@link #escreverArray(List)} geram texto JSON
 *   com escape correto de strings.
 */
public final class Json {

    private Json() { }

    // ===================== ESCRITA =====================

    /** Serializa um mapa (objeto JSON). A ordem de inserção é preservada. */
    public static String escreverObjeto(Map<String, Object> obj) {
        StringBuilder sb = new StringBuilder();
        escreverValor(sb, obj);
        return sb.toString();
    }

    /** Serializa uma lista (array JSON). */
    public static String escreverArray(List<?> lista) {
        StringBuilder sb = new StringBuilder();
        escreverValor(sb, lista);
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private static void escreverValor(StringBuilder sb, Object valor) {
        if (valor == null) {
            sb.append("null");
        } else if (valor instanceof Map) {
            sb.append('{');
            boolean primeiro = true;
            for (Map.Entry<String, Object> e : ((Map<String, Object>) valor).entrySet()) {
                if (!primeiro) sb.append(',');
                primeiro = false;
                escreverString(sb, e.getKey());
                sb.append(':');
                escreverValor(sb, e.getValue());
            }
            sb.append('}');
        } else if (valor instanceof List) {
            sb.append('[');
            boolean primeiro = true;
            for (Object item : (List<?>) valor) {
                if (!primeiro) sb.append(',');
                primeiro = false;
                escreverValor(sb, item);
            }
            sb.append(']');
        } else if (valor instanceof Number || valor instanceof Boolean) {
            sb.append(valor.toString());
        } else {
            escreverString(sb, valor.toString());
        }
    }

    private static void escreverString(StringBuilder sb, String s) {
        sb.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"':  sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\n': sb.append("\\n");  break;
                case '\r': sb.append("\\r");  break;
                case '\t': sb.append("\\t");  break;
                case '\b': sb.append("\\b");  break;
                case '\f': sb.append("\\f");  break;
                default:
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
            }
        }
        sb.append('"');
    }

    // ===================== LEITURA =====================

    /**
     * Converte texto JSON em objetos Java. Devolve Map, List, String, Double,
     * Boolean ou null. Lança {@link IllegalArgumentException} se for inválido.
     */
    public static Object parse(String texto) {
        if (texto == null) throw new IllegalArgumentException("JSON nulo.");
        Parser p = new Parser(texto);
        p.pularEspacos();
        Object v = p.lerValor();
        p.pularEspacos();
        if (!p.fim()) {
            throw new IllegalArgumentException("Texto extra após o JSON.");
        }
        return v;
    }

    /** Conveniência: faz parse e garante que o resultado é um objeto (Map). */
    @SuppressWarnings("unchecked")
    public static Map<String, Object> parseObjeto(String texto) {
        Object v = parse(texto);
        if (!(v instanceof Map)) {
            throw new IllegalArgumentException("Esperava um objeto JSON.");
        }
        return (Map<String, Object>) v;
    }

    /** Parser recursivo descendente. */
    private static final class Parser {
        private final String s;
        private int i;

        Parser(String s) { this.s = s; }

        boolean fim() { return i >= s.length(); }

        void pularEspacos() {
            while (i < s.length()) {
                char c = s.charAt(i);
                if (c == ' ' || c == '\t' || c == '\n' || c == '\r') i++;
                else break;
            }
        }

        Object lerValor() {
            pularEspacos();
            if (fim()) throw new IllegalArgumentException("JSON incompleto.");
            char c = s.charAt(i);
            switch (c) {
                case '{': return lerObjeto();
                case '[': return lerArray();
                case '"': return lerString();
                case 't': case 'f': return lerBooleano();
                case 'n': return lerNulo();
                default:  return lerNumero();
            }
        }

        Map<String, Object> lerObjeto() {
            Map<String, Object> obj = new LinkedHashMap<>();
            i++; // {
            pularEspacos();
            if (!fim() && s.charAt(i) == '}') { i++; return obj; }
            while (true) {
                pularEspacos();
                if (fim() || s.charAt(i) != '"') {
                    throw new IllegalArgumentException("Esperava chave (string) no objeto.");
                }
                String chave = lerString();
                pularEspacos();
                if (fim() || s.charAt(i) != ':') {
                    throw new IllegalArgumentException("Esperava ':' após a chave.");
                }
                i++; // :
                Object valor = lerValor();
                obj.put(chave, valor);
                pularEspacos();
                if (fim()) throw new IllegalArgumentException("Objeto não fechado.");
                char d = s.charAt(i++);
                if (d == '}') break;
                if (d != ',') throw new IllegalArgumentException("Esperava ',' ou '}'.");
            }
            return obj;
        }

        List<Object> lerArray() {
            List<Object> lista = new ArrayList<>();
            i++; // [
            pularEspacos();
            if (!fim() && s.charAt(i) == ']') { i++; return lista; }
            while (true) {
                lista.add(lerValor());
                pularEspacos();
                if (fim()) throw new IllegalArgumentException("Array não fechado.");
                char d = s.charAt(i++);
                if (d == ']') break;
                if (d != ',') throw new IllegalArgumentException("Esperava ',' ou ']'.");
            }
            return lista;
        }

        String lerString() {
            StringBuilder sb = new StringBuilder();
            i++; // "
            while (i < s.length()) {
                char c = s.charAt(i++);
                if (c == '"') return sb.toString();
                if (c == '\\') {
                    if (i >= s.length()) break;
                    char e = s.charAt(i++);
                    switch (e) {
                        case '"':  sb.append('"');  break;
                        case '\\': sb.append('\\'); break;
                        case '/':  sb.append('/');  break;
                        case 'n':  sb.append('\n'); break;
                        case 'r':  sb.append('\r'); break;
                        case 't':  sb.append('\t'); break;
                        case 'b':  sb.append('\b'); break;
                        case 'f':  sb.append('\f'); break;
                        case 'u':
                            if (i + 4 > s.length()) {
                                throw new IllegalArgumentException("Escape unicode inválido.");
                            }
                            sb.append((char) Integer.parseInt(s.substring(i, i + 4), 16));
                            i += 4;
                            break;
                        default:
                            throw new IllegalArgumentException("Escape inválido: \\" + e);
                    }
                } else {
                    sb.append(c);
                }
            }
            throw new IllegalArgumentException("String não fechada.");
        }

        Boolean lerBooleano() {
            if (s.startsWith("true", i)) { i += 4; return Boolean.TRUE; }
            if (s.startsWith("false", i)) { i += 5; return Boolean.FALSE; }
            throw new IllegalArgumentException("Valor booleano inválido.");
        }

        Object lerNulo() {
            if (s.startsWith("null", i)) { i += 4; return null; }
            throw new IllegalArgumentException("Valor inválido (esperava null).");
        }

        Double lerNumero() {
            int inicio = i;
            if (!fim() && s.charAt(i) == '-') i++;
            while (!fim()) {
                char c = s.charAt(i);
                if ((c >= '0' && c <= '9') || c == '.' || c == 'e' || c == 'E'
                        || c == '+' || c == '-') {
                    i++;
                } else {
                    break;
                }
            }
            if (i == inicio) throw new IllegalArgumentException("Valor JSON inválido.");
            try {
                return Double.parseDouble(s.substring(inicio, i));
            } catch (NumberFormatException ex) {
                throw new IllegalArgumentException("Número inválido: " + s.substring(inicio, i));
            }
        }
    }
}
