package br.com.hackgov.modelos;

/**
 * Consulta de um paciente (ou de um dependente, quando idDependente > 0).
 * O médico vem preenchido pelo JOIN feito no ConsultaDAO.
 */
public class Consulta {
    private int idConsulta;
    private int idPaciente;
    private int idDependente;
    private String data;
    private String hora;
    private String local;
    private String motivo;
    private String status;
    private String resumo;
    private String conduta;
    private Paciente paciente;
    private Medico medico;
    private Prontuario prontuario;

    public int getIdConsulta() {
        return idConsulta;
    }

    public void setIdConsulta(int idConsulta) {
        this.idConsulta = idConsulta;
    }

    public int getIdPaciente() {
        return idPaciente;
    }

    public void setIdPaciente(int idPaciente) {
        this.idPaciente = idPaciente;
    }

    /** 0 quando a consulta é do titular da conta. */
    public int getIdDependente() {
        return idDependente;
    }

    public void setIdDependente(int idDependente) {
        this.idDependente = idDependente;
    }

    public String getData() {
        return data;
    }

    public void setData(String data) {
        this.data = data;
    }

    public String getHora() {
        return hora;
    }

    public void setHora(String hora) {
        this.hora = hora;
    }

    public String getLocal() {
        return local;
    }

    public void setLocal(String local) {
        this.local = local;
    }

    public String getMotivo() {
        return motivo;
    }

    public void setMotivo(String motivo) {
        this.motivo = motivo;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    /** Resumo do atendimento — preenchido apenas em consultas realizadas. */
    public String getResumo() {
        return resumo;
    }

    public void setResumo(String resumo) {
        this.resumo = resumo;
    }

    /** Conduta / orientações — preenchido apenas em consultas realizadas. */
    public String getConduta() {
        return conduta;
    }

    public void setConduta(String conduta) {
        this.conduta = conduta;
    }

    public Paciente getPaciente() {
        return paciente;
    }

    public void setPaciente(Paciente paciente) {
        this.paciente = paciente;
    }

    public Medico getMedico() {
        return medico;
    }

    public void setMedico(Medico medico) {
        this.medico = medico;
    }

    public Prontuario getProntuario() {
        return prontuario;
    }

    public void setProntuario(Prontuario prontuario) {
        this.prontuario = prontuario;
    }

    public void cancelarConsulta() {
        status = "Cancelada";
    }
}
