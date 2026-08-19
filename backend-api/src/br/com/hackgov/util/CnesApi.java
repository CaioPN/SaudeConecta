package br.com.hackgov.util;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import br.com.hackgov.modelos.UnidadeSaude;

/**
 * Leitura do CNES (Cadastro Nacional de Estabelecimentos de Saúde) pelos dados
 * abertos do Ministério da Saúde:
 * https://apidadosabertos.saude.gov.br/cnes/estabelecimentos
 *
 * É uma API pública, sem chave e sem cadastro — por isso nada aqui vai para o
 * config.properties. Ela devolve no máximo 20 registros por requisição, então
 * uma cidade grande exige dezenas de chamadas; quem chama esta classe é o
 * UnidadeSaudeDAO, que faz isso uma vez e guarda o resultado no banco.
 *
 * Como no {@link ChatIA}, nenhuma biblioteca nova: HttpClient do JDK e o
 * {@link Json} do projeto.
 *
 * LGPD — a consulta é por município, não por paciente. Nada do paciente sai
 * daqui: o CNES é uma base de estabelecimentos, não de pessoas.
 */
public final class CnesApi {

    private static final String URL_BASE =
            "https://apidadosabertos.saude.gov.br/cnes/estabelecimentos";

    /** Máximo de itens que a API entrega por requisição (limite dela, não nosso). */
    private static final int ITENS_POR_PAGINA = 20;

    /** Trava de segurança: no pior caso são 2000 unidades por tipo. */
    private static final int PAGINAS_MAXIMAS = 100;

    private static final Duration TEMPO_LIMITE = Duration.ofSeconds(15);

    private static final HttpClient CLIENTE = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    /**
     * Tipos de estabelecimento que interessam à tela, com o nome que o app usa.
     * Cada par é { codigo_tipo_unidade do CNES, tipo do app }.
     *
     * Ficam de fora os consultórios particulares (22), as clínicas (36) e os
     * hospitais, além do tipo 1 — que na prática são as supervisões técnicas
     * das prefeituras, e não locais de atendimento.
     */
    private static final String[][] TIPOS = {
        { "2",  UnidadeSaude.UBS },            // centro de saúde / unidade básica
        { "73", UnidadeSaude.UPA },            // pronto atendimento (UPA e AMA)
        { "20", UnidadeSaude.PRONTO_SOCORRO }, // pronto-socorro geral
    };

    private CnesApi() { }

    /**
     * Baixa todas as unidades públicas de um município.
     *
     * Descarta o que não serve ao paciente: estabelecimento desabilitado, que
     * não atende pelo SUS ou sem coordenada (sem ela não dá para calcular a
     * distância, que é a razão da tela existir).
     *
     * @return a lista encontrada — vazia se a API não responder. Nunca null.
     */
    public static List<UnidadeSaude> buscarPorMunicipio(int codigoMunicipio) {
        List<UnidadeSaude> unidades = new ArrayList<>();

        for (String[] par : TIPOS) {
            String codigoTipo = par[0];
            String tipoApp = par[1];

            for (int pagina = 0; pagina < PAGINAS_MAXIMAS; pagina++) {
                String url = URL_BASE
                        + "?codigo_municipio=" + codigoMunicipio
                        + "&codigo_tipo_unidade=" + codigoTipo
                        + "&limit=" + ITENS_POR_PAGINA
                        + "&offset=" + (pagina * ITENS_POR_PAGINA);

                List<Object> pagina20 = lerPagina(url);
                if (pagina20 == null || pagina20.isEmpty()) {
                    break; // acabaram os registros deste tipo (ou a API falhou)
                }
                for (Object item : pagina20) {
                    if (!(item instanceof Map)) continue;
                    UnidadeSaude u = converter((Map<?, ?>) item, tipoApp);
                    if (u != null) {
                        unidades.add(u);
                    }
                }
                if (pagina20.size() < ITENS_POR_PAGINA) {
                    break; // última página
                }
            }
        }

        return unidades;
    }

    /** Faz o GET e devolve o array "estabelecimentos", ou null se algo falhar. */
    private static List<Object> lerPagina(String url) {
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(TEMPO_LIMITE)
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> resp = CLIENTE.send(
                    req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

            if (resp.statusCode() != 200) {
                System.out.println("[ERRO cnes] HTTP " + resp.statusCode());
                return null;
            }

            Map<String, Object> raiz = Json.parseObjeto(resp.body());
            Object lista = raiz.get("estabelecimentos");
            if (!(lista instanceof List)) return null;

            List<Object> itens = new ArrayList<>();
            for (Object o : (List<?>) lista) {
                itens.add(o);
            }
            return itens;

        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            System.out.println("[ERRO cnes] " + e.getClass().getSimpleName());
            return null;
        } catch (IllegalArgumentException e) {
            System.out.println("[ERRO cnes] resposta em formato inesperado.");
            return null;
        }
    }

    /**
     * Transforma um estabelecimento do CNES em {@link UnidadeSaude}.
     *
     * @return null quando o registro deve ser descartado.
     */
    private static UnidadeSaude converter(Map<?, ?> item, String tipoApp) {
        // Desabilitado (fechado, mudou de tipo, cadastro cancelado...).
        if (item.get("codigo_motivo_desabilitacao_estabelecimento") != null) {
            return null;
        }
        // Sem atendimento ambulatorial pelo SUS não interessa: o app é a
        // extensão do SUS, não um buscador de clínica particular.
        if (!"SIM".equalsIgnoreCase(texto(item.get("estabelecimento_faz_atendimento_ambulatorial_sus")))) {
            return null;
        }

        Double lat = numero(item.get("latitude_estabelecimento_decimo_grau"));
        Double lon = numero(item.get("longitude_estabelecimento_decimo_grau"));
        if (!Localizacao.coordenadaValida(lat, lon)) {
            return null;
        }

        Integer cnes = inteiro(item.get("codigo_cnes"));
        Integer municipio = inteiro(item.get("codigo_municipio"));
        if (cnes == null || municipio == null) {
            return null;
        }

        // O CNES tem nome_fantasia e razão social; o fantasia é o que a
        // população reconhece ("UBS Jardim São Carlos").
        String nome = texto(item.get("nome_fantasia"));
        if (nome == null || nome.isBlank()) {
            nome = texto(item.get("nome_razao_social"));
        }
        if (nome == null || nome.isBlank()) {
            return null;
        }

        UnidadeSaude u = new UnidadeSaude();
        u.setCodigoCnes(cnes);
        u.setCodigoMunicipio(municipio);
        u.setNome(capitalizar(nome));
        u.setTipo(tipoApp);
        u.setLogradouro(capitalizar(texto(item.get("endereco_estabelecimento"))));
        u.setNumero(texto(item.get("numero_estabelecimento")));
        u.setBairro(capitalizar(texto(item.get("bairro_estabelecimento"))));
        u.setCep(apenasDigitos(texto(item.get("codigo_cep_estabelecimento"))));
        u.setTelefone(formatarTelefone(texto(item.get("numero_telefone_estabelecimento"))));
        u.setTurno(traduzirTurno(texto(item.get("descricao_turno_atendimento"))));
        u.setLatitude(lat);
        u.setLongitude(lon);
        return u;
    }

    /**
     * Deixa legível o turno de atendimento, que no CNES vem em caixa alta e sem
     * acento ("ATENDIMENTO NOS TURNOS DA MANHA, TARDE E NOITE").
     *
     * A leitura é por palavra-chave, não pelo código do turno: assim continua
     * funcionando se o Ministério acrescentar uma variação nova do texto.
     */
    private static String traduzirTurno(String descricao) {
        if (descricao == null || descricao.isBlank()) {
            return "Horário não informado";
        }
        String d = descricao.toUpperCase();

        if (d.contains("24 HORAS")) {
            return "24 horas, todos os dias";
        }

        List<String> turnos = new ArrayList<>();
        if (d.contains("MANHA")) turnos.add("manhã");
        if (d.contains("TARDE")) turnos.add("tarde");
        if (d.contains("NOITE")) turnos.add("noite");

        if (turnos.isEmpty()) {
            return "Horário não informado";
        }

        StringBuilder sb = new StringBuilder("Atende de segunda a sexta: ");
        for (int i = 0; i < turnos.size(); i++) {
            if (i > 0) {
                sb.append(i == turnos.size() - 1 ? " e " : ", ");
            }
            sb.append(turnos.get(i));
        }
        return sb.toString();
    }

    /**
     * Padroniza o telefone, que vem de tudo quanto é jeito no CNES:
     * "(11) 4810-0660", "11 21418838", "011 4210-6122" ou só "983885274".
     *
     * Sem DDD (ou com formato estranho) devolve o que veio, apenas aparado —
     * é melhor mostrar um número imperfeito do que esconder o contato.
     */
    private static String formatarTelefone(String bruto) {
        if (bruto == null || bruto.isBlank()) return null;

        String d = apenasDigitos(bruto);

        // Cadastro antigo escrevia o DDD com zero na frente ("011 4210-6122").
        // Nenhum DDD começa com zero, então ele sobra e empurra o número todo:
        // sem tirar, o formatador leria 11 dígitos e devolveria "(01) 14210-6122".
        if (d.length() > 10 && d.startsWith("0")) {
            d = d.substring(1);
        }

        if (d.length() == 10) {
            return "(" + d.substring(0, 2) + ") " + d.substring(2, 6) + "-" + d.substring(6);
        }
        if (d.length() == 11) {
            return "(" + d.substring(0, 2) + ") " + d.substring(2, 7) + "-" + d.substring(7);
        }
        return bruto.trim();
    }

    /**
     * Converte "UBS JARDIM SAO CARLOS" em "UBS Jardim Sao Carlos".
     *
     * Só ficam em caixa alta as siglas conhecidas e os numerais romanos; as
     * preposições ficam em minúscula. A lista é explícita de propósito: a
     * primeira versão promovia qualquer palavra de até três letras, e o CNES
     * está cheio de "SAO", "RUA" e "DUX" — que viravam sigla sem ser.
     */
    private static String capitalizar(String texto) {
        if (texto == null || texto.isBlank()) return texto;

        String[] palavras = texto.trim().toLowerCase().split("\\s+");
        StringBuilder sb = new StringBuilder();

        for (int i = 0; i < palavras.length; i++) {
            String p = palavras[i];
            if (p.isEmpty()) continue;
            if (i > 0) sb.append(' ');

            if (ehSigla(p) || ehNumeralRomano(p)) {
                sb.append(p.toUpperCase());
            } else if (i > 0 && ehPreposicao(p)) {
                sb.append(p);
            } else {
                sb.append(Character.toUpperCase(p.charAt(0))).append(p.substring(1));
            }
        }
        return sb.toString();
    }

    /** Siglas da rede pública que o paciente reconhece em caixa alta. */
    private static boolean ehSigla(String p) {
        switch (p) {
            case "ubs":  case "ubsf": case "usf":  case "upa":  case "upae":
            case "ama":  case "ame":  case "pa":   case "ps":   case "psf":
            case "esf":  case "cs":   case "cse":  case "csf":  case "cms":
            case "caps": case "ceo":  case "cta":  case "sae":  case "cer":
            case "crst": case "uti":  case "sus":  case "pam":  case "ame's":
                return true;
            default:
                return false;
        }
    }

    /** "UBS Vila Nova II" — o numeral não pode virar "Ii". */
    private static boolean ehNumeralRomano(String p) {
        switch (p) {
            case "ii": case "iii": case "iv": case "vi":
            case "vii": case "viii": case "ix":
                return true;
            default:
                return false;
        }
    }

    private static boolean ehPreposicao(String p) {
        switch (p) {
            case "da": case "de": case "do": case "das": case "dos":
            case "e":  case "em": case "a":  case "o":   case "no":
            case "na": case "para":
                return true;
            default:
                return false;
        }
    }

    // ===================== LEITURA DEFENSIVA DO JSON =====================

    private static String texto(Object valor) {
        return valor == null ? null : valor.toString().trim();
    }

    private static Double numero(Object valor) {
        if (valor instanceof Number) return ((Number) valor).doubleValue();
        if (valor instanceof String) {
            try {
                return Double.valueOf(((String) valor).trim());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    private static Integer inteiro(Object valor) {
        Double d = numero(valor);
        return d == null ? null : Integer.valueOf(d.intValue());
    }

    private static String apenasDigitos(String s) {
        return s == null ? null : s.replaceAll("\\D", "");
    }
}
