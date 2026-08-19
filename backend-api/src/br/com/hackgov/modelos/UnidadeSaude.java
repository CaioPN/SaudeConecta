package br.com.hackgov.modelos;

/**
 * Um estabelecimento da rede pública de saúde — UBS, pronto-socorro ou UPA.
 *
 * Os dados vêm do CNES (Cadastro Nacional de Estabelecimentos de Saúde) e
 * ficam guardados na tabela unidades_saude. A distância é a única informação
 * que não vem de lá: ela é calculada a cada consulta, a partir de onde o
 * paciente está (ver UnidadeSaudeDAO).
 */
public class UnidadeSaude {

    /** Tipos usados pelo app, traduzidos do codigo_tipo_unidade do CNES. */
    public static final String UBS = "ubs";
    public static final String PRONTO_SOCORRO = "pronto_socorro";
    public static final String UPA = "upa";

    private int codigoCnes;
    private int codigoMunicipio;
    private String nome;
    private String tipo;
    private String logradouro;
    private String numero;
    private String bairro;
    private String cep;
    private String telefone;
    private String turno;
    private Double latitude;
    private Double longitude;

    /** Distância até o paciente, em km. Calculada na consulta, não gravada. */
    private double distanciaKm;

    /** Código oficial do estabelecimento no CNES. */
    public int getCodigoCnes() {
        return codigoCnes;
    }

    public void setCodigoCnes(int codigoCnes) {
        this.codigoCnes = codigoCnes;
    }

    /** Código IBGE do município, sem o dígito verificador (6 dígitos). */
    public int getCodigoMunicipio() {
        return codigoMunicipio;
    }

    public void setCodigoMunicipio(int codigoMunicipio) {
        this.codigoMunicipio = codigoMunicipio;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    /** "ubs", "pronto_socorro" ou "upa". */
    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public String getLogradouro() {
        return logradouro;
    }

    public void setLogradouro(String logradouro) {
        this.logradouro = logradouro;
    }

    public String getNumero() {
        return numero;
    }

    public void setNumero(String numero) {
        this.numero = numero;
    }

    public String getBairro() {
        return bairro;
    }

    public void setBairro(String bairro) {
        this.bairro = bairro;
    }

    public String getCep() {
        return cep;
    }

    public void setCep(String cep) {
        this.cep = cep;
    }

    public String getTelefone() {
        return telefone;
    }

    public void setTelefone(String telefone) {
        this.telefone = telefone;
    }

    /** Turnos de atendimento, como o CNES informa (manhã, tarde, 24 horas...). */
    public String getTurno() {
        return turno;
    }

    public void setTurno(String turno) {
        this.turno = turno;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    /** Distância em km até o ponto de partida informado na consulta. */
    public double getDistanciaKm() {
        return distanciaKm;
    }

    public void setDistanciaKm(double distanciaKm) {
        this.distanciaKm = distanciaKm;
    }
}
