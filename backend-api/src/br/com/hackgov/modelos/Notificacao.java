package br.com.hackgov.modelos;

/**
 * Uma notificação gravada para o paciente.
 *
 * Não confundir com os "avisos" do Dashboard: aviso é DERIVADO (o AvisoDAO
 * recalcula a partir dos exames e consultas a cada requisição, e nada fica
 * gravado), enquanto a notificação é um FATO que aconteceu uma vez — um médico
 * registrou uma consulta no prontuário — e por isso precisa de linha própria,
 * com marca de leitura.
 *
 * A mensagem nunca carrega diagnóstico, resultado ou conduta: diz o que
 * aconteceu e quem fez, e o paciente abre a tela para ver o resto.
 */
public class Notificacao {
    private int idNotificacao;
    private int idPaciente;
    private String mensagem;
    private String tipo;
    private String dataEnvio;
    private String lidaEm;

    public int getIdNotificacao() {
        return idNotificacao;
    }

    public void setIdNotificacao(int idNotificacao) {
        this.idNotificacao = idNotificacao;
    }

    public int getIdPaciente() {
        return idPaciente;
    }

    public void setIdPaciente(int idPaciente) {
        this.idPaciente = idPaciente;
    }

    public String getMensagem() {
        return mensagem;
    }

    public void setMensagem(String mensagem) {
        this.mensagem = mensagem;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public String getDataEnvio() {
        return dataEnvio;
    }

    public void setDataEnvio(String dataEnvio) {
        this.dataEnvio = dataEnvio;
    }

    /** Quando o paciente marcou como lida; null enquanto não leu. */
    public String getLidaEm() {
        return lidaEm;
    }

    public void setLidaEm(String lidaEm) {
        this.lidaEm = lidaEm;
    }

    public boolean isLida() {
        return lidaEm != null;
    }
}
