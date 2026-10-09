package br.com.hackgov.modelos;

/**
 * Um verbete do glossário (tabela "explicacoes_ia"): o que é um exame ou uma
 * vacina, em linguagem de paciente.
 *
 * Antes o DAO devolvia só o texto. Com os relatos de erro, a rota passou a
 * precisar também do id (para ligar o relato ao verbete), do status (um
 * verbete suspenso não pode ser mostrado nem reescrito pelo modelo) e de
 * quando ele foi revisado (a tela diz se uma pessoa já conferiu o texto).
 */
public class Explicacao {

    /** Aparece para todos os pacientes. */
    public static final String STATUS_PUBLICADA = "publicada";
    /** Saiu do ar depois de relatos de erro e espera revisão. */
    public static final String STATUS_SUSPENSA = "suspensa";

    private int id;
    private String tipo;
    private String texto;
    private String modelo;
    private String status;
    /** Quando uma pessoa conferiu o texto (ISO), ou null se ninguém conferiu. */
    private String revisadoEm;

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public String getTexto() {
        return texto;
    }

    public void setTexto(String texto) {
        this.texto = texto;
    }

    public String getModelo() {
        return modelo;
    }

    public void setModelo(String modelo) {
        this.modelo = modelo;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getRevisadoEm() {
        return revisadoEm;
    }

    public void setRevisadoEm(String revisadoEm) {
        this.revisadoEm = revisadoEm;
    }
}
