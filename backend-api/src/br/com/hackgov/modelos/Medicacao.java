package br.com.hackgov.modelos;

public class Medicacao {
    private int idMedicacao;
    private int idPaciente;
    private int idDependente;
    private String nome;
    private String dosagem;
    private String frequencia;
    private String desde;
    private Paciente paciente;

    public int getIdMedicacao() {
        return idMedicacao;
    }

    public void setIdMedicacao(int idMedicacao) {
        this.idMedicacao = idMedicacao;
    }

    public int getIdPaciente() {
        return idPaciente;
    }

    public void setIdPaciente(int idPaciente) {
        this.idPaciente = idPaciente;
    }

    /** 0 quando o registro é do titular da conta. */
    public int getIdDependente() {
        return idDependente;
    }

    public void setIdDependente(int idDependente) {
        this.idDependente = idDependente;
    }

    /** Data de início do uso (pode ser null). */
    public String getDesde() {
        return desde;
    }

    public void setDesde(String desde) {
        this.desde = desde;
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
