package br.com.hackgov.api;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import br.com.hackgov.dao.DependenteDAO;
import br.com.hackgov.dao.PacienteDAO;
import br.com.hackgov.modelos.Dependente;
import br.com.hackgov.modelos.Paciente;
import br.com.hackgov.util.Json;
import br.com.hackgov.util.Jwt;
import br.com.hackgov.util.SenhaUtil;

/**
 * Servidor HTTP REST da SaúdeConecta — 100% Java, usando o HttpServer embutido
 * no JDK (com.sun.net.httpserver), sem frameworks externos.
 *
 * Substitui o antigo backend Node/Express: expõe os MESMOS endpoints na porta
 * 3001 e os MESMOS formatos de JSON que o app React (medical-app) consome:
 *
 *   POST   /api/auth/register
 *   POST   /api/auth/login
 *   GET    /api/auth/me           (protegido por JWT)
 *   GET    /api/dependentes       (protegido por JWT)
 *   POST   /api/dependentes       (protegido por JWT)
 *   DELETE /api/dependentes/{id}  (protegido por JWT)
 *
 * Senhas são tratadas com SHA-256 (ver SenhaUtil) e a sessão usa JWT (ver Jwt).
 */
public class ApiServer {

    private static final int PORTA = 3001;

    private static final PacienteDAO pacienteDAO = new PacienteDAO();
    private static final DependenteDAO dependenteDAO = new DependenteDAO();

    public static void main(String[] args) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(PORTA), 0);

        server.createContext("/api/auth/register", comCors(ApiServer::registrar));
        server.createContext("/api/auth/login", comCors(ApiServer::login));
        server.createContext("/api/auth/me", comCors(ApiServer::me));
        server.createContext("/api/dependentes", comCors(ApiServer::dependentes));
        server.createContext("/", comCors(ApiServer::raiz));

        server.setExecutor(null); // executor padrão
        server.start();

        System.out.println("=========================================");
        System.out.println("  API SaudeConecta (Java) rodando em");
        System.out.println("  http://localhost:" + PORTA);
        System.out.println("=========================================");
    }

    // ===================== ROTAS =====================

    /** GET / — rota de saúde (verifica se a API está no ar). */
    private static void raiz(HttpExchange ex) throws IOException {
        if (!"/".equals(ex.getRequestURI().getPath())) {
            enviarErro(ex, 404, "Rota não encontrada.");
            return;
        }
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("api", "SaudeConecta");
        resp.put("status", "online");
        enviarJson(ex, 200, resp);
    }

    /** POST /api/auth/register — cadastra um novo paciente. */
    private static void registrar(HttpExchange ex) throws IOException {
        if (!"POST".equals(ex.getRequestMethod())) { enviarErro(ex, 405, "Método não permitido."); return; }
        try {
            Map<String, Object> body = lerCorpo(ex);

            String nome = campo(body, "nome");
            String email = campo(body, "email");
            String senha = campo(body, "senha");
            String telefone = campo(body, "telefone");
            String cpf = campo(body, "cpf");
            String genero = campo(body, "genero");
            String tipoSanguineo = campo(body, "tipoSanguineo");
            String dataNascimento = campo(body, "dataNascimento");
            String cep = campo(body, "cep");
            String rua = campo(body, "rua");
            String numero = campo(body, "numero");
            String bairro = campo(body, "bairro");
            String cidade = campo(body, "cidade");
            String estado = campo(body, "estado");

            if (nome == null || email == null || senha == null || telefone == null || cpf == null
                    || genero == null || tipoSanguineo == null || dataNascimento == null) {
                enviarErro(ex, 400, "Preencha todos os dados pessoais obrigatórios.");
                return;
            }
            if (!cpf.matches("\\d{11}")) {
                enviarErro(ex, 400, "O CPF deve ter exatamente 11 dígitos numéricos.");
                return;
            }
            if (apenasDigitos(telefone).length() < 10) {
                enviarErro(ex, 400, "Informe um telefone válido (com DDD).");
                return;
            }
            String erroSenha = SenhaUtil.validarForca(senha);
            if (erroSenha != null) {
                enviarErro(ex, 400, erroSenha);
                return;
            }
            if (pacienteDAO.existeEmailOuCpf(email, cpf)) {
                enviarErro(ex, 409, "Já existe um paciente com este email ou CPF.");
                return;
            }

            Paciente p = new Paciente();
            p.setNome(nome);
            p.setEmail(email);
            p.setTelefone(telefone);
            p.setCpf(cpf);
            p.setGenero(genero);
            p.setTipoSanguineo(tipoSanguineo);
            p.setSenhaHash(SenhaUtil.hash(senha));
            p.setDataNascimento(dataNascimento);
            p.setCep(cep);
            p.setRua(rua);
            p.setNumero(numero);
            p.setBairro(bairro);
            p.setCidade(cidade);
            p.setEstado(estado);

            int id = pacienteDAO.inserir(p);
            Paciente salvo = pacienteDAO.buscarPorId(id);

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("paciente", pacienteJson(salvo));
            resp.put("token", gerarToken(salvo));
            enviarJson(ex, 201, resp);

        } catch (IllegalArgumentException e) {
            enviarErro(ex, 400, "Corpo da requisição inválido (JSON).");
        } catch (SQLException e) {
            System.out.println("[ERRO register] " + e.getMessage());
            enviarErro(ex, 500, "Erro ao cadastrar paciente.");
        }
    }

    /** POST /api/auth/login — autentica um paciente existente. */
    private static void login(HttpExchange ex) throws IOException {
        if (!"POST".equals(ex.getRequestMethod())) { enviarErro(ex, 405, "Método não permitido."); return; }
        try {
            Map<String, Object> body = lerCorpo(ex);
            String email = campo(body, "email");
            String senha = campo(body, "senha");

            if (email == null || senha == null) {
                enviarErro(ex, 400, "Email e senha são obrigatórios.");
                return;
            }

            Paciente p = pacienteDAO.buscarPorEmail(email);
            if (p == null || !SenhaUtil.verificar(senha, p.getSenhaHash())) {
                enviarErro(ex, 401, "Email ou senha inválidos.");
                return;
            }

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("paciente", pacienteJson(p));
            resp.put("token", gerarToken(p));
            enviarJson(ex, 200, resp);

        } catch (IllegalArgumentException e) {
            enviarErro(ex, 400, "Corpo da requisição inválido (JSON).");
        } catch (SQLException e) {
            System.out.println("[ERRO login] " + e.getMessage());
            enviarErro(ex, 500, "Erro ao fazer login.");
        }
    }

    /** GET /api/auth/me — dados do paciente logado (rota protegida). */
    private static void me(HttpExchange ex) throws IOException {
        if (!"GET".equals(ex.getRequestMethod())) { enviarErro(ex, 405, "Método não permitido."); return; }
        Integer userId = autenticar(ex);
        if (userId == null) return;
        try {
            Paciente p = pacienteDAO.buscarPorId(userId);
            if (p == null) {
                enviarErro(ex, 404, "Paciente não encontrado.");
                return;
            }
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("paciente", pacienteJson(p));
            enviarJson(ex, 200, resp);
        } catch (SQLException e) {
            System.out.println("[ERRO /me] " + e.getMessage());
            enviarErro(ex, 500, "Erro ao buscar paciente.");
        }
    }

    /** /api/dependentes — lista (GET), cadastra (POST) ou remove (DELETE /{id}). */
    private static void dependentes(HttpExchange ex) throws IOException {
        Integer userId = autenticar(ex);
        if (userId == null) return;

        String metodo = ex.getRequestMethod();
        String path = ex.getRequestURI().getPath();

        try {
            if ("GET".equals(metodo) && "/api/dependentes".equals(path)) {
                listarDependentes(ex, userId);
            } else if ("POST".equals(metodo) && "/api/dependentes".equals(path)) {
                criarDependente(ex, userId);
            } else if ("DELETE".equals(metodo) && path.startsWith("/api/dependentes/")) {
                removerDependente(ex, userId, path.substring("/api/dependentes/".length()));
            } else {
                enviarErro(ex, 405, "Método não permitido.");
            }
        } catch (IllegalArgumentException e) {
            enviarErro(ex, 400, "Corpo da requisição inválido (JSON).");
        } catch (SQLException e) {
            System.out.println("[ERRO dependentes] " + e.getMessage());
            enviarErro(ex, 500, "Erro ao processar dependentes.");
        }
    }

    private static void listarDependentes(HttpExchange ex, int userId) throws IOException, SQLException {
        List<Dependente> lista = dependenteDAO.listarPorPaciente(userId);
        List<Object> arr = new ArrayList<>();
        for (Dependente d : lista) {
            arr.add(dependenteJson(d));
        }
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("dependentes", arr);
        enviarJson(ex, 200, resp);
    }

    private static void criarDependente(HttpExchange ex, int userId) throws IOException, SQLException {
        Map<String, Object> body = lerCorpo(ex);
        String nome = campo(body, "nome");
        String cpf = campo(body, "cpf");
        String genero = campo(body, "genero");
        String tipoSanguineo = campo(body, "tipoSanguineo");
        String dataNascimento = campo(body, "dataNascimento");

        if (nome == null || cpf == null || genero == null || tipoSanguineo == null || dataNascimento == null) {
            enviarErro(ex, 400, "Preencha todos os dados do dependente.");
            return;
        }
        if (!cpf.matches("\\d{11}")) {
            enviarErro(ex, 400, "O CPF deve ter exatamente 11 dígitos numéricos.");
            return;
        }

        Dependente d = new Dependente(userId, nome, cpf, genero, tipoSanguineo, dataNascimento);
        dependenteDAO.inserir(d);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("dependente", dependenteJson(d));
        enviarJson(ex, 201, resp);
    }

    private static void removerDependente(HttpExchange ex, int userId, String idTexto)
            throws IOException, SQLException {
        int id;
        try {
            id = Integer.parseInt(idTexto.trim());
        } catch (NumberFormatException e) {
            enviarErro(ex, 400, "Id de dependente inválido.");
            return;
        }
        boolean removido = dependenteDAO.excluirDoPaciente(id, userId);
        if (!removido) {
            enviarErro(ex, 404, "Dependente não encontrado.");
            return;
        }
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("sucesso", Boolean.TRUE);
        enviarJson(ex, 200, resp);
    }

    // ===================== AUTENTICAÇÃO =====================

    /**
     * Lê o header Authorization (Bearer token), valida o JWT e devolve o id do
     * paciente. Se faltar/for inválido, JÁ responde 401 e devolve null.
     */
    private static Integer autenticar(HttpExchange ex) throws IOException {
        String header = ex.getRequestHeaders().getFirst("Authorization");
        if (header == null) header = "";
        String[] partes = header.split(" ");
        if (partes.length != 2 || !"Bearer".equals(partes[0]) || partes[1].isEmpty()) {
            enviarErro(ex, 401, "Token não fornecido.");
            return null;
        }
        Map<String, Object> claims = Jwt.validar(partes[1]);
        if (claims == null || !(claims.get("id") instanceof Number)) {
            enviarErro(ex, 401, "Token inválido ou expirado.");
            return null;
        }
        return ((Number) claims.get("id")).intValue();
    }

    private static String gerarToken(Paciente p) {
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("id", p.getIdPaciente());
        claims.put("nome", p.getNome());
        claims.put("email", p.getEmail());
        return Jwt.gerar(claims);
    }

    // ===================== SERIALIZAÇÃO (snake_case, igual ao Node) =====================

    private static Map<String, Object> pacienteJson(Paciente p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getIdPaciente());
        m.put("nome", p.getNome());
        m.put("email", p.getEmail());
        m.put("telefone", p.getTelefone());
        m.put("cpf", p.getCpf());
        m.put("genero", p.getGenero());
        m.put("tipo_sanguineo", p.getTipoSanguineo());
        m.put("data_nascimento", p.getDataNascimento());
        m.put("cep", p.getCep());
        m.put("rua", p.getRua());
        m.put("numero", p.getNumero());
        m.put("bairro", p.getBairro());
        m.put("cidade", p.getCidade());
        m.put("estado", p.getEstado());
        return m;
    }

    private static Map<String, Object> dependenteJson(Dependente d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", d.getId());
        m.put("nome", d.getNome());
        m.put("cpf", d.getCpf());
        m.put("genero", d.getGenero());
        m.put("tipo_sanguineo", d.getTipoSanguineo());
        m.put("data_nascimento", d.getDataNascimento());
        return m;
    }

    // ===================== INFRAESTRUTURA HTTP =====================

    /**
     * Envolve um handler aplicando CORS, respondendo o preflight (OPTIONS) e
     * convertendo exceções não tratadas em 500.
     */
    private static HttpHandler comCors(HttpHandler interno) {
        return ex -> {
            Headers h = ex.getResponseHeaders();
            h.set("Access-Control-Allow-Origin", "*");
            h.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            h.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
            if ("OPTIONS".equals(ex.getRequestMethod())) {
                ex.sendResponseHeaders(204, -1);
                ex.close();
                return;
            }
            try {
                interno.handle(ex);
            } catch (Exception e) {
                System.out.println("[ERRO interno] " + e);
                try {
                    enviarErro(ex, 500, "Erro interno do servidor.");
                } catch (IOException ignored) { }
            } finally {
                ex.close();
            }
        };
    }

    /** Lê o corpo da requisição como JSON e devolve o objeto (Map). */
    private static Map<String, Object> lerCorpo(HttpExchange ex) throws IOException {
        String texto;
        try (InputStream in = ex.getRequestBody()) {
            texto = new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
        if (texto == null || texto.trim().isEmpty()) {
            return new LinkedHashMap<>();
        }
        return Json.parseObjeto(texto);
    }

    /** Lê um campo de texto do corpo; devolve null se ausente ou vazio. */
    private static String campo(Map<String, Object> body, String chave) {
        Object v = body.get(chave);
        if (v == null) return null;
        String s = v.toString().trim();
        return s.isEmpty() ? null : s;
    }

    private static String apenasDigitos(String s) {
        return s == null ? "" : s.replaceAll("\\D", "");
    }

    private static void enviarJson(HttpExchange ex, int status, Map<String, Object> obj) throws IOException {
        byte[] bytes = Json.escreverObjeto(obj).getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        ex.sendResponseHeaders(status, bytes.length);
        try (OutputStream out = ex.getResponseBody()) {
            out.write(bytes);
        }
    }

    private static void enviarErro(HttpExchange ex, int status, String mensagem) throws IOException {
        Map<String, Object> obj = new LinkedHashMap<>();
        obj.put("erro", mensagem);
        enviarJson(ex, status, obj);
    }
}
