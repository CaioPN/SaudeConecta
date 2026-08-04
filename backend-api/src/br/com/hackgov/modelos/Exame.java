package br.com.hackgov.modelos;

import java.util.ArrayList;
import java.util.List;

/**
 * Um exame do paciente. Uma linha da tabela "exames" representa:
 *  - tipo "sangue": uma coleta, cujos resultados ficam em {@link #getItens()};
 *  - tipo "imagem": um exame único, com nome e laudo próprios.
 *
 * O médico solicitante vem preenchido pelo JOIN feito no ExameDAO.
 */
public class Exame {
    public static final String TIPO_SANGUE = "sangue";
    public static final String TIPO_IMAGEM = "imagem";

    private int idExame;
    private int idPaciente;
    private int idDependente;
    private int idConsulta;
    private String tipo;
    private String data;
    private String local;
    private String nome;
    private String laudo;
    private Medico solicitante;
    private List<ItemExame> itens = new ArrayList<>();

    public int getIdExame() {
        return idExame;
    }

    public void setIdExame(int idExame) {
        this.idExame = idExame;
    }

    public int getIdPaciente() {
        return idPaciente;
    }

    public void setIdPaciente(int idPaciente) {
        this.idPaciente = idPaciente;
    }

    /** 0 quando o exame é do titular da conta. */
    public int getIdDependente() {
        return idDependente;
    }

    public void setIdDependente(int idDependente) {
        this.idDependente = idDependente;
    }

    /** 0 quando o exame não veio de uma consulta registrada. */
    public int getIdConsulta() {
        return idConsulta;
    }

    public void setIdConsulta(int idConsulta) {
        this.idConsulta = idConsulta;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public String getData() {
        return data;
    }

    public void setData(String data) {
        this.data = data;
    }

    /** Laboratório (sangue) ou setor de imagem. */
    public String getLocal() {
        return local;
    }

    public void setLocal(String local) {
        this.local = local;
    }

    /** Nome do exame de imagem (null para coletas de sangue). */
    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getLaudo() {
        return laudo;
    }

    public void setLaudo(String laudo) {
        this.laudo = laudo;
    }

    public Medico getSolicitante() {
        return solicitante;
    }

    public void setSolicitante(Medico solicitante) {
        this.solicitante = solicitante;
    }

    public List<ItemExame> getItens() {
        return itens;
    }

    public void setItens(List<ItemExame> itens) {
        this.itens = itens;
    }
}
