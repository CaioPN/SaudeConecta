package br.com.hackgov.modelos;

/**
 * Um resultado dentro de uma coleta de sangue (ex.: Hemoglobina 13,5 g/dL,
 * referência de 12 a 16). A classificação em normal/limite/alterado é feita
 * no front a partir do valor e da faixa.
 */
public class ItemExame {
    private int idItem;
    private int idExame;
    private String nome;
    private double valor;
    private String unidade;
    private double refMin;
    private double refMax;
    private int ordem;

    public int getIdItem() {
        return idItem;
    }

    public void setIdItem(int idItem) {
        this.idItem = idItem;
    }

    public int getIdExame() {
        return idExame;
    }

    public void setIdExame(int idExame) {
        this.idExame = idExame;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public double getValor() {
        return valor;
    }

    public void setValor(double valor) {
        this.valor = valor;
    }

    public String getUnidade() {
        return unidade;
    }

    public void setUnidade(String unidade) {
        this.unidade = unidade;
    }

    public double getRefMin() {
        return refMin;
    }

    public void setRefMin(double refMin) {
        this.refMin = refMin;
    }

    public double getRefMax() {
        return refMax;
    }

    public void setRefMax(double refMax) {
        this.refMax = refMax;
    }

    public int getOrdem() {
        return ordem;
    }

    public void setOrdem(int ordem) {
        this.ordem = ordem;
    }
}
