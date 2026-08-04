package br.com.hackgov.modelos;

/**
 * Condição de saúde do paciente (ex.: hipertensão). O campo `data` guarda
 * desde quando a condição é acompanhada.
 */
public class HistoricoMedico {
    private int idHistorico;
    private int idPaciente;
    private int idDependente;
    private String descricao;
    private String data;
    private Paciente paciente;

    public int getIdHistorico() {
        return idHistorico;
    }

    public void setIdHistorico(int idHistorico) {
        this.idHistorico = idHistorico;
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

    public String getDescricao() {
        return descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public String getData() {
        return data;
    }

    public void setData(String data) {
        this.data = data;
    }

    public Paciente getPaciente() {
        return paciente;
    }

    public void setPaciente(Paciente paciente) {
        this.paciente = paciente;
    }
}

