package br.com.hackgov.modelos;

public class Prontuario {
    private int idProntuario;
    private String descricao;
    private String dataRegistro;
    private Paciente paciente;

    public int getIdProntuario() {
        return idProntuario;
    }

    public void setIdProntuario(int idProntuario) {
        this.idProntuario = idProntuario;
    }

    public String getDescricao() {
        return descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public String getDataRegistro() {
        return dataRegistro;
    }

    public void setDataRegistro(String dataRegistro) {
        this.dataRegistro = dataRegistro;
    }

    public Paciente getPaciente() {
        return paciente;
    }

    public void setPaciente(Paciente paciente) {
        this.paciente = paciente;
    }
}
