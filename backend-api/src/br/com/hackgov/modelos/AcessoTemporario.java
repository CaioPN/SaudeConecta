package br.com.hackgov.modelos;

/**
 * Acesso temporário concedido pelo paciente a um médico.
 *
 * O paciente gera um código de curta duração no app e mostra ao médico durante
 * o atendimento. O código em si não fica no banco — apenas o hash SHA-256 —,
 * de modo que nem quem lê a tabela consegue reutilizá-lo.
 */
public class AcessoTemporario {
    public static final String ESCOPO_LEITURA = "leitura";
    public static final String ESCOPO_ESCRITA = "escrita";

    private int idAcesso;
    private int idPaciente;
    private String escopo;
    private String criadoEm;
    private String expiraEm;
    private String usadoEm;
    private String revogadoEm;
    private Medico medico;

    public int getIdAcesso() {
        return idAcesso;
    }

    public void setIdAcesso(int idAcesso) {
        this.idAcesso = idAcesso;
    }

    public int getIdPaciente() {
        return idPaciente;
    }

    public void setIdPaciente(int idPaciente) {
        this.idPaciente = idPaciente;
    }

    /** "leitura" (só consulta) ou "escrita" (também registra consultas e exames). */
    public String getEscopo() {
        return escopo;
    }

    public void setEscopo(String escopo) {
        this.escopo = escopo;
    }

    public boolean permiteEscrita() {
        return ESCOPO_ESCRITA.equals(escopo);
    }

    public String getCriadoEm() {
        return criadoEm;
    }

    public void setCriadoEm(String criadoEm) {
        this.criadoEm = criadoEm;
    }

    public String getExpiraEm() {
        return expiraEm;
    }

    public void setExpiraEm(String expiraEm) {
        this.expiraEm = expiraEm;
    }

    /** Quando o médico trocou o código pelo token; null se ainda não foi usado. */
    public String getUsadoEm() {
        return usadoEm;
    }

    public void setUsadoEm(String usadoEm) {
        this.usadoEm = usadoEm;
    }

    /** Preenchido quando o paciente revoga o acesso manualmente. */
    public String getRevogadoEm() {
        return revogadoEm;
    }

    public void setRevogadoEm(String revogadoEm) {
        this.revogadoEm = revogadoEm;
    }

    /** Médico que usou o código; null enquanto ninguém o usou. */
    public Medico getMedico() {
        return medico;
    }

    public void setMedico(Medico medico) {
        this.medico = medico;
    }
}
