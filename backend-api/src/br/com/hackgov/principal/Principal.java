package br.com.hackgov.principal;

import br.com.hackgov.dao.DependenteDAO;
import br.com.hackgov.dao.PacienteDAO;
import br.com.hackgov.modelos.Dependente;
import br.com.hackgov.modelos.Paciente;
import br.com.hackgov.util.SenhaUtil;

import java.sql.SQLException;
import java.util.List;
import java.util.Scanner;

/**
 * Aplicação Java de console da SaúdeConecta (parte acadêmica / JDBC).
 *
 * Conecta-se ao MESMO banco MySQL "saudeconecta" usado pelo app React/Node
 * e demonstra: POO (modelos), DAO, conexão JDBC, CRUD, PreparedStatement
 * (anti SQL Injection) e tratamento de senha com hash SHA-256.
 */
public class Principal {

    private static final Scanner sc = new Scanner(System.in);
    private static final PacienteDAO pacienteDAO = new PacienteDAO();
    private static final DependenteDAO dependenteDAO = new DependenteDAO();

    public static void main(String[] args) {
        System.out.println("=========================================");
        System.out.println("   SaúdeConecta — Aplicação Java (JDBC)   ");
        System.out.println("=========================================");

        boolean rodando = true;
        while (rodando) {
            exibirMenu();
            String opcao = sc.nextLine().trim();
            try {
                switch (opcao) {
                    case "1": cadastrarPaciente(); break;
                    case "2": listarPacientes(); break;
                    case "3": cadastrarDependente(); break;
                    case "4": listarDependentes(); break;
                    case "5": fazerLogin(); break;
                    case "6": excluirPaciente(); break;
                    case "0": rodando = false; break;
                    default: System.out.println("Opção inválida.\n");
                }
            } catch (SQLException e) {
                System.out.println("[ERRO de banco] " + e.getMessage() + "\n");
            }
        }
        System.out.println("Até logo!");
    }

    private static void exibirMenu() {
        System.out.println("--------- MENU ---------");
        System.out.println("1 - Cadastrar paciente");
        System.out.println("2 - Listar pacientes");
        System.out.println("3 - Cadastrar dependente");
        System.out.println("4 - Listar dependentes de um paciente");
        System.out.println("5 - Login (verificar senha)");
        System.out.println("6 - Excluir paciente");
        System.out.println("0 - Sair");
        System.out.print("Escolha uma opção: ");
    }

    private static void cadastrarPaciente() throws SQLException {
        System.out.println("\n--- Novo Paciente ---");
        Paciente p = new Paciente();
        p.setNome(ler("Nome"));
        p.setEmail(ler("E-mail"));

        if (pacienteDAO.existeEmail(p.getEmail())) {
            System.out.println("Já existe um paciente com este e-mail.\n");
            return;
        }

        p.setTelefone(ler("Telefone (DDD + número)"));
        p.setCpf(ler("CPF (11 dígitos)"));
        p.setGenero(ler("Gênero"));
        p.setTipoSanguineo(ler("Tipo sanguíneo (ex: O+)"));
        p.setDataNascimento(ler("Data de nascimento (AAAA-MM-DD)"));
        p.setCep(ler("CEP"));
        p.setRua(ler("Rua"));
        p.setNumero(ler("Número"));
        p.setBairro(ler("Bairro"));
        p.setCidade(ler("Cidade"));
        p.setEstado(ler("Estado (UF)"));

        String senha;
        while (true) {
            senha = ler("Senha");
            String erro = SenhaUtil.validarForca(senha);
            if (erro == null) break;
            System.out.println("  " + erro);
        }
        p.setSenhaHash(SenhaUtil.hash(senha));

        int id = pacienteDAO.inserir(p);
        System.out.println("Paciente cadastrado com sucesso! ID = " + id + "\n");
    }

    private static void listarPacientes() throws SQLException {
        System.out.println("\n--- Pacientes Cadastrados ---");
        List<Paciente> pacientes = pacienteDAO.listarTodos();
        if (pacientes.isEmpty()) {
            System.out.println("Nenhum paciente cadastrado.\n");
            return;
        }
        for (Paciente p : pacientes) {
            System.out.printf("[%d] %s <%s> — CPF %s — %s — nasc. %s%n",
                    p.getIdPaciente(), p.getNome(), p.getEmail(), p.getCpf(),
                    p.getTipoSanguineo(), p.getDataNascimento());
        }
        System.out.println();
    }

    private static void cadastrarDependente() throws SQLException {
        System.out.println("\n--- Novo Dependente ---");
        int idPaciente = lerInt("ID do paciente responsável");

        Dependente d = new Dependente();
        d.setIdPaciente(idPaciente);
        d.setNome(ler("Nome do dependente"));
        d.setCpf(ler("CPF (11 dígitos)"));
        d.setGenero(ler("Gênero"));
        d.setTipoSanguineo(ler("Tipo sanguíneo (ex: A+)"));
        d.setDataNascimento(ler("Data de nascimento (AAAA-MM-DD)"));

        int id = dependenteDAO.inserir(d);
        System.out.println("Dependente cadastrado com sucesso! ID = " + id + "\n");
    }

    private static void listarDependentes() throws SQLException {
        int idPaciente = lerInt("\nID do paciente");
        List<Dependente> deps = dependenteDAO.listarPorPaciente(idPaciente);
        if (deps.isEmpty()) {
            System.out.println("Este paciente não possui dependentes.\n");
            return;
        }
        System.out.println("--- Dependentes ---");
        for (Dependente d : deps) {
            System.out.println(d);
        }
        System.out.println();
    }

    private static void fazerLogin() throws SQLException {
        System.out.println("\n--- Login ---");
        String email = ler("E-mail");
        String senha = ler("Senha");

        Paciente p = pacienteDAO.buscarPorEmail(email);
        if (p == null) {
            System.out.println("E-mail ou senha inválidos.\n");
            return;
        }
        // Nota: o app Node usa bcrypt; este Java usa SHA-256. O login só confere
        // para pacientes cadastrados por esta aplicação Java.
        if (SenhaUtil.verificar(senha, p.getSenhaHash())) {
            System.out.println("Login OK! Bem-vindo(a), " + p.getNome() + ".\n");
            p.exibirFichaPaciente();
            System.out.println();
        } else {
            System.out.println("E-mail ou senha inválidos.\n");
        }
    }

    private static void excluirPaciente() throws SQLException {
        int id = lerInt("\nID do paciente a excluir");
        if (pacienteDAO.excluir(id)) {
            System.out.println("Paciente (e seus dependentes) removido(s).\n");
        } else {
            System.out.println("Nenhum paciente encontrado com esse ID.\n");
        }
    }

    // ---------- utilitários de leitura ----------

    private static String ler(String rotulo) {
        System.out.print(rotulo + ": ");
        return sc.nextLine().trim();
    }

    private static int lerInt(String rotulo) {
        while (true) {
            System.out.print(rotulo + ": ");
            try {
                return Integer.parseInt(sc.nextLine().trim());
            } catch (NumberFormatException e) {
                System.out.println("  Digite um número válido.");
            }
        }
    }
}
