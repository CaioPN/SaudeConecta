package br.com.hackgov.modelos;

public class Medicacao {
    private int idMedicacao;
    private String nome;
    private String dosagem;
    private String frequencia;
    private Paciente paciente;

    public int getIdMedicacao() {
        return idMedicacao;
    }

    public void setIdMedicacao(int idMedicacao) {
        this.idMedicacao = idMedicacao;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getDosagem() {
        return dosagem;
    }

    public void setDosagem(String dosagem) {
        this.dosagem = dosagem;
    }

    public String getFrequencia() {
        return frequencia;
    }

    public void setFrequencia(String frequencia) {
        this.frequencia = frequencia;
    }

    public Paciente getPaciente() {
        return paciente;
    }

    public void setPaciente(Paciente paciente) {
        this.paciente = paciente;
    }
}
