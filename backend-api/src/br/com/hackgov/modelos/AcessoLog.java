package br.com.hackgov.modelos;

/**
 * Uma linha da trilha de auditoria de um acesso temporário.
 *
 * Registra o que o médico fez enquanto esteve com o acesso do paciente:
 * entrou, leu o prontuário, registrou uma consulta ou um exame — e também a
 * revogação feita pelo próprio paciente. É o que a tela "Histórico de acessos"
 * mostra, respondendo à pergunta da LGPD "quem viu os meus dados e quando".
 *
 * O médico vem junto porque a trilha sozinha ("leu_prontuario") não diz nada
 * ao paciente sem o nome de quem leu.
 */
public class AcessoLog {
    private int idLog;
    private int idAcesso;
    private String acao;
    private String detalhe;
    private String criadoEm;
    private String escopo;
    private Medico medico;

    public int getIdLog() {
        return idLog;
    }

    public void setIdLog(int idLog) {
        this.idLog = idLog;
    }

    public int getIdAcesso() {
        return idAcesso;
    }

    public void setIdAcesso(int idAcesso) {
        this.idAcesso = idAcesso;
    }

    /** "entrou", "leu_prontuario", "registrou_consulta", "registrou_exame", "revogado". */
    public String getAcao() {
        return acao;
    }

    public void setAcao(String acao) {
        this.acao = acao;
    }

    public String getDetalhe() {
        return detalhe;
    }

    public void setDetalhe(String detalhe) {
        this.detalhe = detalhe;
    }

    public String getCriadoEm() {
        return criadoEm;
    }

    public void setCriadoEm(String criadoEm) {
        this.criadoEm = criadoEm;
    }

    /** Escopo do acesso em que a ação aconteceu ("leitura" ou "escrita"). */
    public String getEscopo() {
        return escopo;
    }

    public void setEscopo(String escopo) {
        this.escopo = escopo;
    }

    /** Médico que usou o acesso; null enquanto o código não foi utilizado. */
    public Medico getMedico() {
        return medico;
    }

    public void setMedico(Medico medico) {
        this.medico = medico;
    }
}
