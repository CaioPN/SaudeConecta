package br.com.hackgov.modelos;

/**
 * Modelo (POO) que representa um dependente (subusuário) de um paciente.
 * Espelha a tabela "dependentes" do banco. Não possui acesso próprio ao app.
 */
public class Dependente {

    private int id;
    private int idPaciente;
    private String nome;
    private String cpf;
    private String genero;
    private String tipoSanguineo;
    private String dataNascimento; // formato ISO: YYYY-MM-DD

    public Dependente() { }

    public Dependente(int idPaciente, String nome, String cpf, String genero,
                      String tipoSanguineo, String dataNascimento) {
        this.idPaciente = idPaciente;
        this.nome = nome;
        this.cpf = cpf;
        this.genero = genero;
        this.tipoSanguineo = tipoSanguineo;
        this.dataNascimento = dataNascimento;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public int getIdPaciente() { return idPaciente; }
    public void setIdPaciente(int idPaciente) { this.idPaciente = idPaciente; }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }

    public String getCpf() { return cpf; }
    public void setCpf(String cpf) { this.cpf = cpf; }

    public String getGenero() { return genero; }
    public void setGenero(String genero) { this.genero = genero; }

    public String getTipoSanguineo() { return tipoSanguineo; }
    public void setTipoSanguineo(String tipoSanguineo) { this.tipoSanguineo = tipoSanguineo; }

    public String getDataNascimento() { return dataNascimento; }
    public void setDataNascimento(String dataNascimento) { this.dataNascimento = dataNascimento; }

    @Override
    public String toString() {
        return String.format("[%d] %s — CPF %s — %s — %s — nasc. %s",
                id, nome, cpf, genero, tipoSanguineo, dataNascimento);
    }
}
