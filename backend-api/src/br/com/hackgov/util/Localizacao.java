package br.com.hackgov.util;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * De onde o paciente está: converte um CEP em município e coordenadas, e
 * calcula a distância entre dois pontos.
 *
 * Serve à tela "Rede de Saúde": para listar as unidades da cidade certa é
 * preciso o código IBGE do município, e para ordená-las por proximidade é
 * preciso um ponto de partida.
 *
 * São três APIs públicas, sem chave, tentadas nesta ordem:
 *
 *   1. AwesomeAPI — a única que devolve a coordenada DA RUA. É dela que sai
 *      o ponto usado para medir distância.
 *   2. BrasilAPI  — reserva; dá o município.
 *   3. ViaCEP     — reserva da reserva; também dá o município.
 *
 * Só a AwesomeAPI informa coordenada aqui, e isso é proposital: a BrasilAPI
 * responde com o CENTROIDE DO MUNICÍPIO, igual para todos os CEPs da cidade
 * (01310-100, da Avenida Paulista, e 02238-090, da zona norte, devolvem os
 * mesmos -23.5475, -46.63611). Ordenar por essa coordenada colocaria a mesma
 * UBS em primeiro lugar para a cidade inteira, então é melhor ficar sem
 * distância — a tela avisa quando não deu para calcular.
 *
 * Nenhuma biblioteca nova: HttpClient do JDK e o {@link Json} do projeto,
 * como no {@link ChatIA}.
 *
 * LGPD — daqui só sai o CEP, nunca nome, CPF ou dado clínico. O CEP é a
 * informação mínima para achar a UBS da região do paciente. O UnidadeSaudeDAO
 * também usa esta classe para o CEP das próprias unidades de saúde, que é
 * dado público do CNES.
 */
public final class Localizacao {

    /** Raio médio da Terra em km, usado na fórmula de Haversine. */
    private static final double RAIO_TERRA_KM = 6371.0;

    private static final Duration TEMPO_LIMITE = Duration.ofSeconds(10);

    private static final HttpClient CLIENTE = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    /**
     * CEPs já consultados nesta execução. O CEP de um paciente não muda no meio
     * do uso, então guardar evita bater na API externa a cada abertura da tela.
     *
     * O acesso é sincronizado no próprio mapa — e só nele, nunca durante a
     * chamada HTTP: a thread que atualiza a rede de saúde consulta centenas de
     * CEPs seguidos, e travar o método inteiro deixaria o paciente esperando.
     */
    private static final Map<String, Lugar> CACHE = new HashMap<>();

    private Localizacao() { }

    /** Resultado da consulta de um CEP. */
    public static final class Lugar {
        private final int codigoMunicipio;
        private final String cidade;
        private final String estado;
        private final Double latitude;
        private final Double longitude;

        Lugar(int codigoMunicipio, String cidade, String estado, Double latitude, Double longitude) {
            this.codigoMunicipio = codigoMunicipio;
            this.cidade = cidade;
            this.estado = estado;
            this.latitude = latitude;
            this.longitude = longitude;
        }

        /** Código IBGE do município SEM o dígito verificador — é o que o CNES usa. */
        public int getCodigoMunicipio() {
            return codigoMunicipio;
        }

        public String getCidade() {
            return cidade;
        }

        public String getEstado() {
            return estado;
        }

        /**
         * Coordenada da rua do CEP. Pode ser null: quando só as APIs de
         * reserva respondem, sabemos o município mas não o ponto exato.
         */
        public Double getLatitude() {
            return latitude;
        }

        public Double getLongitude() {
            return longitude;
        }
    }

    /**
     * Descobre município e coordenadas de um CEP.
     *
     * @return o lugar encontrado, ou null se o CEP for inválido ou nenhuma das
     *         duas APIs responder. Quem chama trata o null como "não deu para
     *         localizar o paciente".
     */
    public static Lugar buscarPorCep(String cep) {
        String limpo = apenasDigitos(cep);
        if (limpo.length() != 8) return null;

        synchronized (CACHE) {
            if (CACHE.containsKey(limpo)) {
                return CACHE.get(limpo);
            }
        }

        Lugar lugar = pelaAwesomeApi(limpo);
        if (lugar == null) {
            lugar = pelaBrasilApi(limpo);
        }
        if (lugar == null) {
            lugar = peloViaCep(limpo);
        }

        synchronized (CACHE) {
            // Guarda até o null: um CEP que não existe não vai passar a existir
            // no meio da execução, e assim não repetimos a chamada à toa.
            CACHE.put(limpo, lugar);
        }
        return lugar;
    }

    /**
     * Distância em linha reta entre dois pontos, em km (fórmula de Haversine).
     *
     * É a distância "de pássaro", não a do trajeto de rua — suficiente para
     * ordenar as unidades da mais para a menos próxima.
     */
    public static double distanciaKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                 + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                 * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return RAIO_TERRA_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    /** Diz se o par de coordenadas cai dentro dos limites válidos. */
    public static boolean coordenadaValida(Double latitude, Double longitude) {
        return latitude != null && longitude != null
                && latitude >= -90 && latitude <= 90
                && longitude >= -180 && longitude <= 180;
    }

    // ===================== APIS DE CEP =====================

    /**
     * AwesomeAPI — a fonte da coordenada.
     *
     * Devolve lat/lng do logradouro (em texto) e o código IBGE em "city_ibge",
     * tudo na mesma requisição. É a única das três que distingue um CEP do
     * outro dentro da mesma cidade, e por isso é a primeira a ser tentada.
     */
    private static Lugar pelaAwesomeApi(String cep) {
        String corpo = obter("https://cep.awesomeapi.com.br/json/" + cep);
        if (corpo == null) return null;

        try {
            Map<String, Object> raiz = Json.parseObjeto(corpo);

            int municipio = municipioSemDigito(texto(raiz.get("city_ibge")));
            if (municipio == 0) return null;

            Double lat = numero(raiz.get("lat"));
            Double lon = numero(raiz.get("lng"));
            if (!coordenadaValida(lat, lon)) {
                lat = null;
                lon = null;
            }

            return new Lugar(municipio, texto(raiz.get("city")), texto(raiz.get("state")), lat, lon);

        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /**
     * BrasilAPI v2 — reserva. Dá o município.
     *
     * A coordenada dela existe na resposta, mas é ignorada de propósito: é o
     * centroide do município, igual para a cidade inteira (ver o comentário
     * da classe).
     */
    private static Lugar pelaBrasilApi(String cep) {
        String corpo = obter("https://brasilapi.com.br/api/cep/v2/" + cep);
        if (corpo == null) return null;

        try {
            Map<String, Object> raiz = Json.parseObjeto(corpo);

            // "ibge" vem aninhado: { "ibge": { "city": "3550308" } }
            Object ibge = raiz.get("ibge");
            String codigo = (ibge instanceof Map) ? texto(((Map<?, ?>) ibge).get("city")) : null;
            int municipio = municipioSemDigito(codigo);
            if (municipio == 0) return null;

            return new Lugar(municipio, texto(raiz.get("city")), texto(raiz.get("state")), null, null);

        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /** ViaCEP — última reserva. Dá o município, mas não tem coordenadas. */
    private static Lugar peloViaCep(String cep) {
        String corpo = obter("https://viacep.com.br/ws/" + cep + "/json/");
        if (corpo == null) return null;

        try {
            Map<String, Object> raiz = Json.parseObjeto(corpo);
            if (raiz.get("erro") != null) return null;

            int municipio = municipioSemDigito(texto(raiz.get("ibge")));
            if (municipio == 0) return null;

            return new Lugar(municipio, texto(raiz.get("localidade")), texto(raiz.get("uf")), null, null);

        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /** GET simples: devolve o corpo em texto, ou null em qualquer falha. */
    private static String obter(String url) {
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(TEMPO_LIMITE)
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> resp = CLIENTE.send(
                    req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

            return resp.statusCode() == 200 ? resp.body() : null;

        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            return null;
        }
    }

    // ===================== APOIO =====================

    /**
     * O IBGE identifica o município com 7 dígitos (o último é verificador);
     * o CNES usa os 6 primeiros. Ex.: 3550308 (São Paulo) vira 355030.
     *
     * @return o código de 6 dígitos, ou 0 se a entrada não servir.
     */
    private static int municipioSemDigito(String codigoIbge) {
        String digitos = apenasDigitos(codigoIbge);
        if (digitos.length() != 7) return 0;
        try {
            return Integer.parseInt(digitos.substring(0, 6));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private static String apenasDigitos(String s) {
        return s == null ? "" : s.replaceAll("\\D", "");
    }

    private static String texto(Object valor) {
        return valor == null ? null : valor.toString();
    }

    /** Lê um número que pode ter vindo como texto (é o caso da BrasilAPI). */
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
}
