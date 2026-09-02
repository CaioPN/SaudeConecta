package br.com.hackgov.modelos;

/**
 * Uma dose do Calendário Nacional de Vacinação (tabela "calendario_vacinal"),
 * já cruzada com o que a pessoa realmente tomou (tabela "vacinas_aplicadas").
 *
 * As três primeiras informações vêm do calendário e são iguais para todo mundo
 * da mesma faixa etária; {@link #getAplicadaEm()} e {@link #getStatus()} é que
 * são da pessoa.
 *
 * O status não é gravado em lugar nenhum: ele é calculado a cada consulta pelo
 * {@link br.com.hackgov.util.CarteiraVacinal}, porque depende da data de hoje —
 * uma dose "prevista" vira "atrasada" sozinha quando o dia passa.
 */
public class DoseVacina {

    /** Já registrada como aplicada. */
    public static final String STATUS_APLICADA = "aplicada";
    /** A data recomendada já passou e ninguém registrou a aplicação. */
    public static final String STATUS_ATRASADA = "atrasada";
    /** Ainda vai chegar. */
    public static final String STATUS_PREVISTA = "prevista";

    private int idDose;
    private String publico;      // 'crianca' | 'adulto'
    private String vacina;
    private String dose;
    /** Idade recomendada em meses; null nas doses do calendário adulto. */
    private Integer idadeMeses;
    private String periodo;
    private String protege;
    private int ordem;

    /** Data recomendada, calculada a partir do nascimento (ISO). Null no adulto. */
    private String prevista;
    /** Quando foi aplicada (ISO), ou null se ainda não foi registrada. */
    private String aplicadaEm;
    /** Quem registrou: 'paciente' ou 'medico'. */
    private String origem;
    private String status;

    public int getIdDose() {
        return idDose;
    }

    public void setIdDose(int idDose) {
        this.idDose = idDose;
    }

    public String getPublico() {
        return publico;
    }

    public void setPublico(String publico) {
        this.publico = publico;
    }

    public String getVacina() {
        return vacina;
    }

    public void setVacina(String vacina) {
        this.vacina = vacina;
    }

    public String getDose() {
        return dose;
    }

    public void setDose(String dose) {
        this.dose = dose;
    }

    public Integer getIdadeMeses() {
        return idadeMeses;
    }

    public void setIdadeMeses(Integer idadeMeses) {
        this.idadeMeses = idadeMeses;
    }

    public String getPeriodo() {
        return periodo;
    }

    public void setPeriodo(String periodo) {
        this.periodo = periodo;
    }

    public String getProtege() {
        return protege;
    }

    public void setProtege(String protege) {
        this.protege = protege;
    }

    public int getOrdem() {
        return ordem;
    }

    public void setOrdem(int ordem) {
        this.ordem = ordem;
    }

    public String getPrevista() {
        return prevista;
    }

    public void setPrevista(String prevista) {
        this.prevista = prevista;
    }

    public String getAplicadaEm() {
        return aplicadaEm;
    }

    public void setAplicadaEm(String aplicadaEm) {
        this.aplicadaEm = aplicadaEm;
    }

    public String getOrigem() {
        return origem;
    }

    public void setOrigem(String origem) {
        this.origem = origem;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
