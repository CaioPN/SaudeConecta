package br.com.hackgov.modelos;

/**
 * Um aceite dos Termos de Uso e da Política de Privacidade: qual versão o
 * paciente aceitou e quando (tabela aceites_termos).
 */
public class AceiteTermos {

    private String versao;
    private String aceitoEm;

    public AceiteTermos() { }

    public AceiteTermos(String versao, String aceitoEm) {
        this.versao = versao;
        this.aceitoEm = aceitoEm;
    }

    public String getVersao() {
        return versao;
    }

    public void setVersao(String versao) {
        this.versao = versao;
    }

    public String getAceitoEm() {
        return aceitoEm;
    }

    public void setAceitoEm(String aceitoEm) {
        this.aceitoEm = aceitoEm;
    }
}
