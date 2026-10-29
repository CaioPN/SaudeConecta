package br.com.hackgov.modelos;

/**
 * O PDF original de um exame importado pelo paciente (tabela
 * exames_documentos). Mora numa classe à parte do Exame porque só é lido
 * quando alguém pede o arquivo — a lista de exames nunca o carrega.
 */
public class DocumentoExame {

    private int idExame;
    private int idDependente;
    private String nomeArquivo;
    private byte[] conteudo;

    public int getIdExame() {
        return idExame;
    }

    public void setIdExame(int idExame) {
        this.idExame = idExame;
    }

    /** 0 quando o exame é do titular da conta. */
    public int getIdDependente() {
        return idDependente;
    }

    public void setIdDependente(int idDependente) {
        this.idDependente = idDependente;
    }

    public String getNomeArquivo() {
        return nomeArquivo;
    }

    public void setNomeArquivo(String nomeArquivo) {
        this.nomeArquivo = nomeArquivo;
    }

    public byte[] getConteudo() {
        return conteudo;
    }

    public void setConteudo(byte[] conteudo) {
        this.conteudo = conteudo;
    }
}
