package br.com.hackgov.modelos;

public class Paciente {
    private int idPaciente;
    private String nome;
    private String dataNascimento; // formato ISO: YYYY-MM-DD
    private String cpf;
    private String telefone;
    private String email;
    private String tipoSanguineo;
    private String genero;
    private String senhaHash;
    // Endereço
    private String cep;
    private String rua;
    private String numero;
    private String bairro;
    private String cidade;
    private String estado;

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
        System.out.println("Endereço: " + rua + ", " + numero + " - " + bairro
                + " - " + cidade + "/" + estado + " (CEP " + cep + ")");
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

    public String getSenhaHash() {
        return senhaHash;
    }

    public void setSenhaHash(String senhaHash) {
        this.senhaHash = senhaHash;
    }

    public String getCep() {
        return cep;
    }

    public void setCep(String cep) {
        this.cep = cep;
    }

    public String getRua() {
        return rua;
    }

    public void setRua(String rua) {
        this.rua = rua;
    }

    public String getNumero() {
        return numero;
    }

    public void setNumero(String numero) {
        this.numero = numero;
    }

    public String getBairro() {
        return bairro;
    }

    public void setBairro(String bairro) {
        this.bairro = bairro;
    }

    public String getCidade() {
        return cidade;
    }

    public void setCidade(String cidade) {
        this.cidade = cidade;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }
}
