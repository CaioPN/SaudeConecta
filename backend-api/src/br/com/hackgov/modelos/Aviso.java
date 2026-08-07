package br.com.hackgov.modelos;

/**
 * Um aviso exibido no Dashboard do paciente.
 *
 * Não tem tabela própria: cada aviso é derivado dos dados que já existem
 * (exames, consultas e campanhas de vacinação) pelo AvisoDAO.
 */
public class Aviso {

    /** Severidades possíveis, da mais para a menos urgente. */
    public static final String ALTA = "alta";
    public static final String MEDIA = "media";
    public static final String BAIXA = "baixa";

    private String tipo;
    private String titulo;
    private String detalhe;
    private String severidade;

    public Aviso() {
    }

    public Aviso(String tipo, String titulo, String detalhe, String severidade) {
        this.tipo = tipo;
        this.titulo = titulo;
        this.detalhe = detalhe;
        this.severidade = severidade;
    }

    /** Origem do aviso: "exame", "consulta", "resultado" ou "campanha". */
    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    /** Frase principal, ex.: "1 ano desde o último exame". */
    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    /** Complemento opcional, ex.: o local ou o público-alvo da campanha. */
    public String getDetalhe() {
        return detalhe;
    }

    public void setDetalhe(String detalhe) {
        this.detalhe = detalhe;
    }

    public String getSeveridade() {
        return severidade;
    }

    public void setSeveridade(String severidade) {
        this.severidade = severidade;
    }
}
