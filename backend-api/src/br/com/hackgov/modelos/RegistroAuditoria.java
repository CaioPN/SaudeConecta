package br.com.hackgov.modelos;

/**
 * Uma linha da trilha de auditoria do próprio paciente (tabela "auditoria").
 *
 * É o par do {@link AcessoLog}: lá fica o que o médico fez com um código
 * temporário, aqui fica o que o titular fez na própria conta — entrou, abriu
 * o prontuário, baixou o PDF de exames, cadastrou ou excluiu um dependente,
 * gerou um código de acesso.
 *
 * Auditoria e log técnico não se misturam: aqui só entra ação de negócio, com
 * quem, o quê, quando e de onde. Exceção de banco, erro de JSON e tempo de
 * resposta continuam no console, que ninguém guarda.
 */
public class RegistroAuditoria {

    private int idRegistro;
    private int idPaciente;
    /**
     * Sobre quem foi a ação: null quando é o próprio titular, preenchido
     * quando o dado aberto era de um dependente. A linha continua sendo do
     * titular — é ele quem responde pela conta e quem vê a trilha —, mas com
     * isto a tela consegue separar o que andaram fazendo com os dados de cada
     * pessoa da casa.
     */
    private Integer idDependente;
    private String nomeDependente;
    private String acao;
    private String recurso;
    private String detalhe;
    private String origemIp;
    private String criadoEm;

    /**
     * Marca a ação que se repete a cada vez que a tela é aberta (uma leitura,
     * por exemplo). O AuditoriaDAO agrupa essas dentro de uma janela curta,
     * senão a trilha vira uma lista de "abriu o prontuário" e o paciente não
     * enxerga mais o que importa.
     */
    private boolean agrupavel;

    public RegistroAuditoria() {
    }

    public RegistroAuditoria(int idPaciente, Integer idDependente, String acao, String recurso,
                             String detalhe, String origemIp, boolean agrupavel) {
        this.idPaciente = idPaciente;
        this.idDependente = idDependente;
        this.acao = acao;
        this.recurso = recurso;
        this.detalhe = detalhe;
        this.origemIp = origemIp;
        this.agrupavel = agrupavel;
    }

    public int getIdRegistro() {
        return idRegistro;
    }

    public void setIdRegistro(int idRegistro) {
        this.idRegistro = idRegistro;
    }

    public int getIdPaciente() {
        return idPaciente;
    }

    public Integer getIdDependente() {
        return idDependente;
    }

    public void setIdDependente(Integer idDependente) {
        this.idDependente = idDependente;
    }

    public String getNomeDependente() {
        return nomeDependente;
    }

    public void setNomeDependente(String nomeDependente) {
        this.nomeDependente = nomeDependente;
    }

    public void setIdPaciente(int idPaciente) {
        this.idPaciente = idPaciente;
    }

    /** "login", "consultou_prontuario", "exportou_exames", "gerou_codigo"... */
    public String getAcao() {
        return acao;
    }

    public void setAcao(String acao) {
        this.acao = acao;
    }

    /** Sobre o que foi a ação: "conta", "prontuario", "exames", "dependentes". */
    public String getRecurso() {
        return recurso;
    }

    public void setRecurso(String recurso) {
        this.recurso = recurso;
    }

    public String getDetalhe() {
        return detalhe;
    }

    public void setDetalhe(String detalhe) {
        this.detalhe = detalhe;
    }

    public String getOrigemIp() {
        return origemIp;
    }

    public void setOrigemIp(String origemIp) {
        this.origemIp = origemIp;
    }

    public String getCriadoEm() {
        return criadoEm;
    }

    public void setCriadoEm(String criadoEm) {
        this.criadoEm = criadoEm;
    }

    public boolean isAgrupavel() {
        return agrupavel;
    }

    public void setAgrupavel(boolean agrupavel) {
        this.agrupavel = agrupavel;
    }
}
