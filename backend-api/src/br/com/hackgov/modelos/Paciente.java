package br.com.hackgov.modelos;

public class Paciente {
    private int idPaciente;
    private String nome;
    private String dataNascimento;
    private String cpf;
    private String telefone;
    private String email;
    private String tipoSanguineo;
    private String genero;

    public void exibirFichaPaciente() {
        System.out.println("----- FICHA DO PACIENTE -----");
        System.out.println("ID: " + idPaciente);
        System.out.println("Nome: " + nome);
        System.out.println("Data de nascimento: " + dataNascimento);
        System.out.println("CPF: " + cpf);
        System.out.println("Telefone: " + telefone);
        System.out.println("Email: " + email);
        System.out.println("Tipo sanguíneo: " + tipoSanguineo);
        System.out.println("Gênero: " + genero);
        System.out.println("-----------------------------");
    }

    public int getIdPaciente() {
        return idPaciente;
    }

    public void setIdPaciente(int idPaciente) {
        this.idPaciente = idPaciente;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getDataNascimento() {
        return dataNascimento;
    }

    public void setDataNascimento(String dataNascimento) {
        this.dataNascimento = dataNascimento;
    }

    public String getCpf() {
        return cpf;
    }

    public void setCpf(String cpf) {
        this.cpf = cpf;
    }

    public String getTelefone() {
        return telefone;
    }

    public void setTelefone(String telefone) {
        this.telefone = telefone;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getTipoSanguineo() {
        return tipoSanguineo;
    }

    public void setTipoSanguineo(String tipoSanguineo) {
        this.tipoSanguineo = tipoSanguineo;
    }

    public String getGenero() {
        return genero;
    }

    public void setGenero(String genero) {
        this.genero = genero;
    }
}
