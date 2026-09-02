package br.com.hackgov.api;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import br.com.hackgov.dao.AcessoDAO;
import br.com.hackgov.dao.AuditoriaDAO;
import br.com.hackgov.dao.AvisoDAO;
import br.com.hackgov.dao.ConsultaDAO;
import br.com.hackgov.dao.DependenteDAO;
import br.com.hackgov.dao.ExameDAO;
import br.com.hackgov.dao.FamiliarDAO;
import br.com.hackgov.dao.MedicoDAO;
import br.com.hackgov.dao.NotificacaoDAO;
import br.com.hackgov.dao.PacienteDAO;
import br.com.hackgov.dao.ProntuarioDAO;
import br.com.hackgov.dao.UnidadeSaudeDAO;
import br.com.hackgov.modelos.AcessoLog;
import br.com.hackgov.modelos.AcessoTemporario;
import br.com.hackgov.modelos.Alergia;
import br.com.hackgov.modelos.Aviso;
import br.com.hackgov.modelos.Consulta;
import br.com.hackgov.modelos.Dependente;
import br.com.hackgov.modelos.Exame;
import br.com.hackgov.modelos.Familiar;
import br.com.hackgov.modelos.HistoricoMedico;
import br.com.hackgov.modelos.ItemExame;
import br.com.hackgov.modelos.Medicacao;
import br.com.hackgov.modelos.Medico;
import br.com.hackgov.modelos.Notificacao;
import br.com.hackgov.modelos.Paciente;
import br.com.hackgov.modelos.RegistroAuditoria;
import br.com.hackgov.modelos.UnidadeSaude;
import br.com.hackgov.util.ChatIA;
import br.com.hackgov.util.CodigoAcesso;
import br.com.hackgov.util.Json;
import br.com.hackgov.util.Localizacao;
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
 *   POST   /api/auth/recuperar    confere a identidade de quem esqueceu a senha
 *   POST   /api/auth/redefinir    grava a senha nova com o token da recuperação
 *   GET    /api/auth/me           (protegido por JWT)
 *   GET    /api/dependentes       (protegido por JWT)
 *   POST   /api/dependentes       (protegido por JWT)
 *   DELETE /api/dependentes/{id}  (protegido por JWT)
 *
 * E os dados clínicos do paciente logado (todos protegidos por JWT):
 *
 *   GET    /api/consultas         lista; aceita ?dependenteId=
 *   GET    /api/consultas/{id}    detalhe de uma consulta
 *   GET    /api/exames            coletas de sangue e exames de imagem
 *   GET    /api/prontuario        alergias, condições e medicações
 *   GET    /api/avisos            avisos do Dashboard (derivados dos dados)
 *   GET    /api/rede-saude        UBS, UPAs e prontos-socorros mais próximos
 *   POST   /api/exames/exportacao registra na auditoria o download do PDF
 *   GET    /api/auditoria         trilha de auditoria (médico + próprio paciente)
 *   GET    /api/familiares        contatos de emergência
 *   POST   /api/familiares        cadastra um contato
 *   DELETE /api/familiares/{id}   remove um contato
 *   GET    /api/notificacoes      o que aconteceu na conta enquanto ele não olhava
 *   POST   /api/notificacoes/lidas          marca todas como lidas
 *   POST   /api/notificacoes/{id}/lida      marca uma como lida
 *   POST   /api/chat              pergunta livre do chatbot (IA)
 *
 * Em todas elas o paciente vem do JWT, nunca da requisição — assim um usuário
 * não consegue ler os dados de outro passando um id na URL.
 *
 * Senhas são tratadas com SHA-256 (ver SenhaUtil) e a sessão usa JWT (ver Jwt).
 */
public class ApiServer {

    private static final int PORTA = 3001;

    private static final PacienteDAO pacienteDAO = new PacienteDAO();
    private static final DependenteDAO dependenteDAO = new DependenteDAO();
    private static final ConsultaDAO consultaDAO = new ConsultaDAO();
    private static final ExameDAO exameDAO = new ExameDAO();
    private static final ProntuarioDAO prontuarioDAO = new ProntuarioDAO();
    private static final AvisoDAO avisoDAO = new AvisoDAO();
    private static final UnidadeSaudeDAO unidadeSaudeDAO = new UnidadeSaudeDAO();
    private static final AcessoDAO acessoDAO = new AcessoDAO();
    private static final MedicoDAO medicoDAO = new MedicoDAO();
    private static final AuditoriaDAO auditoriaDAO = new AuditoriaDAO();
    private static final FamiliarDAO familiarDAO = new FamiliarDAO();
    private static final NotificacaoDAO notificacaoDAO = new NotificacaoDAO();

    /** Validade padrão do código/token do médico, em minutos. */
    private static final int VALIDADE_ACESSO_MINUTOS = 30;

    /** Quantas linhas da trilha de auditoria a tela do paciente recebe. */
    private static final int LIMITE_HISTORICO_ACESSOS = 100;

    /** Quantas notificações a tela recebe de uma vez. */
    private static final int LIMITE_NOTIFICACOES = 30;

    /**
     * Validade do token de redefinição de senha, em minutos. Curta de
     * propósito: ele nasce da conferência de dados de cadastro, que é uma
     * prova de identidade mais fraca que um link enviado por e-mail.
     */
    private static final int VALIDADE_RECUPERACAO_MINUTOS = 15;

    /** Limite de códigos errados por IP dentro da janela, contra força bruta. */
    private static final int TENTATIVAS_MAXIMAS = 10;
    private static final long JANELA_TENTATIVAS_MS = 10L * 60 * 1000;
    private static final Map<String, long[]> tentativasPorIp = new HashMap<>();

    /** Limite de perguntas ao chatbot por paciente, para proteger a cota da IA. */
    private static final int PERGUNTAS_MAXIMAS = 15;
    private static final long JANELA_CHAT_MS = 60L * 1000;
    private static final Map<Integer, long[]> perguntasPorPaciente = new HashMap<>();

    public static void main(String[] args) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(PORTA), 0);

        server.createContext("/api/auth/register", comCors(ApiServer::registrar));
        server.createContext("/api/auth/login", comCors(ApiServer::login));
        server.createContext("/api/auth/recuperar", comCors(ApiServer::recuperarSenha));
        server.createContext("/api/auth/redefinir", comCors(ApiServer::redefinirSenha));
        server.createContext("/api/auth/me", comCors(ApiServer::me));
        server.createContext("/api/dependentes", comCors(ApiServer::dependentes));
        server.createContext("/api/familiares", comCors(ApiServer::familiares));
        server.createContext("/api/notificacoes", comCors(ApiServer::notificacoes));
        server.createContext("/api/consultas", comCors(ApiServer::consultas));
        server.createContext("/api/exames", comCors(ApiServer::exames));
        server.createContext("/api/prontuario", comCors(ApiServer::prontuario));
        server.createContext("/api/avisos", comCors(ApiServer::avisos));
        server.createContext("/api/rede-saude", comCors(ApiServer::redeSaude));
        server.createContext("/api/chat", comCors(ApiServer::chat));
        server.createContext("/api/acessos", comCors(ApiServer::acessos));
        server.createContext("/api/auditoria", comCors(ApiServer::auditoria));
        server.createContext("/api/medico", comCors(ApiServer::medico));
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
                // Senha errada em conta que existe é evento de segurança: entra na
                // trilha para o titular enxergar que tentaram entrar. E-mail que
                // não existe não gera registro — não há dono a quem mostrar.
                if (p != null) {
                    auditar(ex, p.getIdPaciente(), "login_falhou", "conta", "Senha incorreta.");
                }
                enviarErro(ex, 401, "Email ou senha inválidos.");
                return;
            }

            auditar(ex, p.getIdPaciente(), "login", "conta", null);

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

    /**
     * POST /api/auth/recuperar — primeiro passo do "esqueci minha senha".
     *
     * <h3>Por que não é um link por e-mail</h3>
     * O fluxo clássico manda um link para a caixa de entrada do titular, e a
     * prova de identidade é ter acesso àquele e-mail. Aqui não existe serviço
     * de e-mail: mandar mensagem exigiria um servidor SMTP e uma biblioteca
     * nova, e o backend é Java puro de propósito. O que substitui o link é a
     * conferência de três dados do cadastro — e-mail, CPF e data de
     * nascimento —, que é uma prova mais fraca. Por isso a rota tem limite de
     * tentativas por IP e o token que ela devolve vale poucos minutos.
     *
     * A resposta não diz qual dos três campos errou, nem se o e-mail existe:
     * seria um jeito de descobrir quem tem conta no app.
     */
    private static void recuperarSenha(HttpExchange ex) throws IOException {
        if (!"POST".equals(ex.getRequestMethod())) { enviarErro(ex, 405, "Método não permitido."); return; }

        String ip = ipDe(ex);
        if (excedeuTentativas(ip)) {
            enviarErro(ex, 429, "Muitas tentativas. Aguarde alguns minutos e tente de novo.");
            return;
        }

        try {
            Map<String, Object> body = lerCorpo(ex);
            String email = campo(body, "email");
            String cpf = apenasDigitos(campo(body, "cpf"));
            String dataNascimento = campo(body, "dataNascimento");

            if (email == null || cpf.isEmpty() || dataNascimento == null) {
                enviarErro(ex, 400, "Informe o e-mail, o CPF e a data de nascimento do cadastro.");
                return;
            }

            Paciente p = pacienteDAO.buscarParaRecuperacao(email, cpf, dataNascimento);
            if (p == null) {
                registrarTentativa(ip);
                enviarErro(ex, 401, "Os dados informados não conferem com nenhum cadastro.");
                return;
            }

            // O hash atual entra no token para amarrá-lo à senha vigente: assim
            // que a senha muda, o token que sobrou de uma recuperação anterior
            // deixa de servir, mesmo dentro da validade.
            Paciente comHash = pacienteDAO.buscarPorEmail(email);
            String marca = marcaDaSenha(comHash == null ? null : comHash.getSenhaHash());

            auditar(ex, p.getIdPaciente(), "solicitou_senha", "conta", null);

            Map<String, Object> claims = new LinkedHashMap<>();
            claims.put("tipo", "reset");
            claims.put("email", p.getEmail());
            claims.put("marca", marca);

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("token", Jwt.gerar(claims, VALIDADE_RECUPERACAO_MINUTOS * 60L));
            // Só o primeiro nome volta, para a tela confirmar de quem é a conta
            // sem repetir na resposta os dados que acabaram de ser digitados.
            resp.put("nome", primeiroNome(p.getNome()));
            resp.put("validade_minutos", VALIDADE_RECUPERACAO_MINUTOS);
            enviarJson(ex, 200, resp);

        } catch (IllegalArgumentException e) {
            enviarErro(ex, 400, "Corpo da requisição inválido (JSON).");
        } catch (SQLException e) {
            System.out.println("[ERRO recuperar] " + e.getMessage());
            enviarErro(ex, 500, "Erro ao conferir os dados do cadastro.");
        }
    }

    /**
     * POST /api/auth/redefinir — grava a senha nova.
     *
     * O paciente vem do token da recuperação, nunca do corpo: sem isso
     * bastaria enviar o e-mail de outra pessoa para trocar a senha dela.
     */
    private static void redefinirSenha(HttpExchange ex) throws IOException {
        if (!"POST".equals(ex.getRequestMethod())) { enviarErro(ex, 405, "Método não permitido."); return; }

        try {
            Map<String, Object> body = lerCorpo(ex);
            String token = campo(body, "token");
            String senha = campo(body, "senha");

            if (token == null || senha == null) {
                enviarErro(ex, 400, "Informe o token da recuperação e a nova senha.");
                return;
            }

            Map<String, Object> claims = Jwt.validar(token);
            if (claims == null || !"reset".equals(claims.get("tipo"))
                    || !(claims.get("email") instanceof String)) {
                enviarErro(ex, 401, "Este pedido de recuperação expirou. Comece de novo.");
                return;
            }

            Paciente p = pacienteDAO.buscarPorEmail((String) claims.get("email"));
            if (p == null) {
                enviarErro(ex, 401, "Este pedido de recuperação expirou. Comece de novo.");
                return;
            }
            // Token de uso único na prática: a marca é do hash antigo, então
            // depois da primeira troca ele não confere mais.
            if (!marcaDaSenha(p.getSenhaHash()).equals(claims.get("marca"))) {
                enviarErro(ex, 401, "Esta senha já foi redefinida. Comece de novo.");
                return;
            }

            String erroSenha = SenhaUtil.validarForca(senha);
            if (erroSenha != null) {
                enviarErro(ex, 400, erroSenha);
                return;
            }
            if (SenhaUtil.verificar(senha, p.getSenhaHash())) {
                enviarErro(ex, 400, "A nova senha precisa ser diferente da anterior.");
                return;
            }

            pacienteDAO.atualizarSenha(p.getIdPaciente(), SenhaUtil.hash(senha));
            auditar(ex, p.getIdPaciente(), "redefiniu_senha", "conta", null);

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("sucesso", Boolean.TRUE);
            enviarJson(ex, 200, resp);

        } catch (IllegalArgumentException e) {
            enviarErro(ex, 400, "Corpo da requisição inválido (JSON).");
        } catch (SQLException e) {
            System.out.println("[ERRO redefinir] " + e.getMessage());
            enviarErro(ex, 500, "Erro ao redefinir a senha.");
        }
    }

    /**
     * Pedaço curto do hash da senha, usado dentro do token de recuperação.
     *
     * Vai só o começo do hash porque o token trafega até o navegador: 8
     * caracteres bastam para detectar que a senha mudou e não ajudam quem
     * quisesse quebrar o hash inteiro.
     */
    private static String marcaDaSenha(String hash) {
        if (hash == null || hash.length() < 8) return "";
        return hash.substring(0, 8);
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
        auditar(ex, userId, "cadastrou_dependente", "dependentes", primeiroNome(nome));

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
        // O nome é lido antes de excluir: depois não há de onde tirar, e a trilha
        // ficaria com um "excluiu_dependente" que não diz quem foi excluído.
        String nome = dependenteDAO.nomeDoPaciente(id, userId);

        boolean removido = dependenteDAO.excluirDoPaciente(id, userId);
        if (!removido) {
            enviarErro(ex, 404, "Dependente não encontrado.");
            return;
        }
        auditar(ex, userId, "excluiu_dependente", "dependentes", primeiroNome(nome));

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("sucesso", Boolean.TRUE);
        enviarJson(ex, 200, resp);
    }

    // ===================== CONTATOS DE EMERGÊNCIA =====================

    /** /api/familiares — lista (GET), cadastra (POST) ou remove (DELETE /{id}). */
    private static void familiares(HttpExchange ex) throws IOException {
        Integer userId = autenticar(ex);
        if (userId == null) return;

        String metodo = ex.getRequestMethod();
        String path = ex.getRequestURI().getPath();

        try {
            if ("GET".equals(metodo) && "/api/familiares".equals(path)) {
                List<Object> arr = new ArrayList<>();
                for (Familiar f : familiarDAO.listarPorPaciente(userId)) {
                    arr.add(familiarJson(f));
                }
                Map<String, Object> resp = new LinkedHashMap<>();
                resp.put("familiares", arr);
                enviarJson(ex, 200, resp);

            } else if ("POST".equals(metodo) && "/api/familiares".equals(path)) {
                criarFamiliar(ex, userId);

            } else if ("DELETE".equals(metodo) && path.startsWith("/api/familiares/")) {
                removerFamiliar(ex, userId, path.substring("/api/familiares/".length()));

            } else {
                enviarErro(ex, 405, "Método não permitido.");
            }
        } catch (IllegalArgumentException e) {
            enviarErro(ex, 400, "Corpo da requisição inválido (JSON).");
        } catch (SQLException e) {
            System.out.println("[ERRO familiares] " + e.getMessage());
            enviarErro(ex, 500, "Erro ao processar os contatos de emergência.");
        }
    }

    private static void criarFamiliar(HttpExchange ex, int userId) throws IOException, SQLException {
        Map<String, Object> body = lerCorpo(ex);
        String nome = campo(body, "nome");
        String parentesco = campo(body, "parentesco");
        String telefone = campo(body, "telefone");

        if (nome == null || parentesco == null || telefone == null) {
            enviarErro(ex, 400, "Informe o nome, o parentesco e o telefone do contato.");
            return;
        }
        if (apenasDigitos(telefone).length() < 10) {
            enviarErro(ex, 400, "Informe um telefone válido (com DDD).");
            return;
        }

        Familiar f = new Familiar();
        f.setNome(nome);
        f.setParentesco(parentesco);
        f.setTelefone(telefone);
        familiarDAO.inserir(userId, f);

        auditar(ex, userId, "cadastrou_contato", "contatos", primeiroNome(nome));

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("familiar", familiarJson(f));
        enviarJson(ex, 201, resp);
    }

    private static void removerFamiliar(HttpExchange ex, int userId, String idTexto)
            throws IOException, SQLException {
        int id;
        try {
            id = Integer.parseInt(idTexto.trim());
        } catch (NumberFormatException e) {
            enviarErro(ex, 400, "Id de contato inválido.");
            return;
        }

        String nome = familiarDAO.nomeDoPaciente(id, userId);
        if (!familiarDAO.excluirDoPaciente(id, userId)) {
            enviarErro(ex, 404, "Contato não encontrado.");
            return;
        }
        auditar(ex, userId, "excluiu_contato", "contatos", primeiroNome(nome));

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("sucesso", Boolean.TRUE);
        enviarJson(ex, 200, resp);
    }

    // ===================== NOTIFICAÇÕES =====================

    /**
     * /api/notificacoes — o que aconteceu na conta enquanto o paciente não
     * estava olhando: GET lista, POST /{id}/lida e POST /lidas marcam a leitura.
     *
     * Não confundir com /api/avisos: aviso é calculado na hora a partir dos
     * exames e consultas e não é gravado; notificação é um fato que aconteceu
     * uma vez (um médico registrou algo no prontuário) e tem linha no banco.
     */
    private static void notificacoes(HttpExchange ex) throws IOException {
        Integer userId = autenticar(ex);
        if (userId == null) return;

        String metodo = ex.getRequestMethod();
        String path = ex.getRequestURI().getPath();

        try {
            if ("GET".equals(metodo) && "/api/notificacoes".equals(path)) {
                List<Object> arr = new ArrayList<>();
                for (Notificacao n : notificacaoDAO.listarPorPaciente(userId, false, LIMITE_NOTIFICACOES)) {
                    arr.add(notificacaoJson(n));
                }
                Map<String, Object> resp = new LinkedHashMap<>();
                resp.put("notificacoes", arr);
                resp.put("nao_lidas", notificacaoDAO.contarNaoLidas(userId));
                enviarJson(ex, 200, resp);

            } else if ("POST".equals(metodo) && "/api/notificacoes/lidas".equals(path)) {
                Map<String, Object> resp = new LinkedHashMap<>();
                resp.put("marcadas", notificacaoDAO.marcarTodasLidas(userId));
                enviarJson(ex, 200, resp);

            } else if ("POST".equals(metodo) && path.startsWith("/api/notificacoes/")
                    && path.endsWith("/lida")) {
                marcarNotificacaoLida(ex, userId, path);

            } else {
                enviarErro(ex, 405, "Método não permitido.");
            }
        } catch (SQLException e) {
            System.out.println("[ERRO notificacoes] " + e.getMessage());
            enviarErro(ex, 500, "Erro ao processar as notificações.");
        }
    }

    private static void marcarNotificacaoLida(HttpExchange ex, int userId, String path)
            throws IOException, SQLException {
        String meio = path.substring("/api/notificacoes/".length(), path.length() - "/lida".length());
        int id;
        try {
            id = Integer.parseInt(meio.trim());
        } catch (NumberFormatException e) {
            enviarErro(ex, 400, "Id de notificação inválido.");
            return;
        }

        // Marcar de novo o que já estava lido não é erro — o DAO devolve false
        // e a tela não tem por que mostrar falha nisso.
        notificacaoDAO.marcarLida(id, userId);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("sucesso", Boolean.TRUE);
        resp.put("nao_lidas", notificacaoDAO.contarNaoLidas(userId));
        enviarJson(ex, 200, resp);
    }

    /** /api/consultas — lista do paciente logado ou detalhe de /api/consultas/{id}. */
    private static void consultas(HttpExchange ex) throws IOException {
        if (!"GET".equals(ex.getRequestMethod())) { enviarErro(ex, 405, "Método não permitido."); return; }
        Integer userId = autenticar(ex);
        if (userId == null) return;

        String path = ex.getRequestURI().getPath();
        try {
            if ("/api/consultas".equals(path)) {
                Integer dependenteId = idDependente(ex);
                List<Object> arr = new ArrayList<>();
                for (Consulta c : consultaDAO.listarPorPaciente(userId, dependenteId)) {
                    arr.add(consultaJson(c));
                }
                Map<String, Object> resp = new LinkedHashMap<>();
                resp.put("consultas", arr);

                // A consulta traz motivo, resumo e conduta do atendimento: é
                // leitura de dado sensível como o prontuário e os exames, e
                // por isso entra na trilha do paciente.
                auditarLeitura(ex, userId, "consultou_consultas", "consultas",
                        alvoDaLeitura(userId, dependenteId));
                enviarJson(ex, 200, resp);
                return;
            }

            if (path.startsWith("/api/consultas/")) {
                int id;
                try {
                    id = Integer.parseInt(path.substring("/api/consultas/".length()).trim());
                } catch (NumberFormatException e) {
                    enviarErro(ex, 400, "Id de consulta inválido.");
                    return;
                }
                Consulta c = consultaDAO.buscarDoPaciente(id, userId);
                if (c == null) {
                    enviarErro(ex, 404, "Consulta não encontrada.");
                    return;
                }
                Map<String, Object> resp = new LinkedHashMap<>();
                resp.put("consulta", consultaJson(c));

                // A mesma ação da lista, de propósito: quem lê a trilha quer
                // saber que as consultas foram abertas, não quantas vezes o
                // React montou a tela de detalhe.
                auditarLeitura(ex, userId, "consultou_consultas", "consultas",
                        alvoDaLeitura(userId, c.getIdDependente() > 0 ? c.getIdDependente() : null));
                enviarJson(ex, 200, resp);
                return;
            }

            enviarErro(ex, 404, "Rota não encontrada.");

        } catch (SQLException e) {
            System.out.println("[ERRO consultas] " + e.getMessage());
            enviarErro(ex, 500, "Erro ao buscar consultas.");
        }
    }

    /**
     * /api/exames — lista os exames do paciente logado (GET) ou registra na
     * trilha de auditoria o download do PDF (POST /api/exames/exportacao).
     */
    private static void exames(HttpExchange ex) throws IOException {
        String metodo = ex.getRequestMethod();
        String path = ex.getRequestURI().getPath();

        if ("/api/exames/exportacao".equals(path)) {
            if (!"POST".equals(metodo)) { enviarErro(ex, 405, "Método não permitido."); return; }
            registrarExportacao(ex);
            return;
        }
        if (!"/api/exames".equals(path)) { enviarErro(ex, 404, "Rota não encontrada."); return; }
        if (!"GET".equals(metodo)) { enviarErro(ex, 405, "Método não permitido."); return; }

        Integer userId = autenticar(ex);
        if (userId == null) return;

        try {
            Integer dependenteId = idDependente(ex);
            List<Object> sangue = new ArrayList<>();
            List<Object> imagem = new ArrayList<>();

            for (Exame e : exameDAO.listarPorPaciente(userId, dependenteId)) {
                if (Exame.TIPO_IMAGEM.equals(e.getTipo())) {
                    imagem.add(exameJson(e));
                } else {
                    sangue.add(exameJson(e));
                }
            }

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("coletas", sangue);
            resp.put("imagem", imagem);

            // Abrir resultado de exame é consulta a dado sensível: vai para a
            // trilha depois de dar certo, nunca antes.
            auditarLeitura(ex, userId, "consultou_exames", "exames",
                    alvoDaLeitura(userId, dependenteId));
            enviarJson(ex, 200, resp);

        } catch (SQLException e) {
            System.out.println("[ERRO exames] " + e.getMessage());
            enviarErro(ex, 500, "Erro ao buscar exames.");
        }
    }

    /**
     * POST /api/chat — pergunta livre do chatbot, respondida pelo modelo de IA.
     *
     * A rota exige login por dois motivos: a chave da API mora só aqui no
     * servidor (nunca no front) e um endpoint aberto viraria proxy de graça
     * para a cota gratuita. Nada do paciente é enviado ao modelo — só o texto
     * digitado (ver ChatIA).
     */
    private static void chat(HttpExchange ex) throws IOException {
        if (!"POST".equals(ex.getRequestMethod())) { enviarErro(ex, 405, "Método não permitido."); return; }
        Integer userId = autenticar(ex);
        if (userId == null) return;

        if (!ChatIA.disponivel()) {
            enviarErro(ex, 503, "O assistente com IA não está configurado.");
            return;
        }
        if (!liberarPergunta(userId)) {
            enviarErro(ex, 429, "Muitas perguntas seguidas. Aguarde um minuto para continuar.");
            return;
        }

        try {
            Map<String, Object> body = lerCorpo(ex);
            String pergunta = campo(body, "pergunta");
            if (pergunta == null || pergunta.isBlank()) {
                enviarErro(ex, 400, "Escreva uma pergunta.");
                return;
            }
            if (pergunta.length() > ChatIA.LIMITE_PERGUNTA) {
                enviarErro(ex, 400, "Pergunta muito longa. Resuma em até "
                        + ChatIA.LIMITE_PERGUNTA + " caracteres.");
                return;
            }

            String resposta = ChatIA.responder(pergunta);
            if (resposta == null) {
                enviarErro(ex, 502, "O assistente não conseguiu responder agora.");
                return;
            }

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("resposta", resposta);
            enviarJson(ex, 200, resp);

        } catch (IllegalArgumentException e) {
            enviarErro(ex, 400, "Corpo da requisição inválido (JSON).");
        }
    }

    /**
     * Limite simples de perguntas por paciente dentro da janela. Existe para a
     * cota gratuita do modelo não ser gasta por um único usuário (ou por um
     * script) em poucos segundos.
     */
    private static synchronized boolean liberarPergunta(int idPaciente) {
        long agora = System.currentTimeMillis();
        long[] registro = perguntasPorPaciente.get(idPaciente);
        if (registro == null || agora - registro[1] > JANELA_CHAT_MS) {
            perguntasPorPaciente.put(idPaciente, new long[] { 1, agora });
            return true;
        }
        if (registro[0] >= PERGUNTAS_MAXIMAS) {
            return false;
        }
        registro[0]++;
        return true;
    }

    /** GET /api/avisos — avisos do Dashboard, derivados dos dados do paciente logado. */
    private static void avisos(HttpExchange ex) throws IOException {
        if (!"GET".equals(ex.getRequestMethod())) { enviarErro(ex, 405, "Método não permitido."); return; }
        Integer userId = autenticar(ex);
        if (userId == null) return;

        try {
            List<Object> lista = new ArrayList<>();
            for (Aviso a : avisoDAO.listarPorPaciente(userId)) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("tipo", a.getTipo());
                m.put("titulo", a.getTitulo());
                m.put("detalhe", a.getDetalhe());
                m.put("severidade", a.getSeveridade());
                lista.add(m);
            }

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("avisos", lista);
            enviarJson(ex, 200, resp);

        } catch (SQLException e) {
            System.out.println("[ERRO avisos] " + e.getMessage());
            enviarErro(ex, 500, "Erro ao buscar os avisos.");
        }
    }

    /**
     * GET /api/rede-saude — UBS, UPAs e prontos-socorros perto do paciente.
     *
     * O município sai do CEP cadastrado (é ele que diz qual rede municipal
     * atende o paciente), ou de ?cep= quando o paciente pesquisa outra cidade
     * na tela — na divisa, em viagem ou perto do trabalho. O ponto usado para
     * medir a distância aceita ?lat= e ?lon=, que o navegador manda quando o
     * paciente autoriza a localização; sem isso, o cálculo usa as coordenadas
     * do próprio CEP.
     *
     * A resposta também devolve "origem", para a tela poder dizer de onde as
     * distâncias foram medidas e qual cidade está sendo mostrada.
     */
    private static void redeSaude(HttpExchange ex) throws IOException {
        if (!"GET".equals(ex.getRequestMethod())) { enviarErro(ex, 405, "Método não permitido."); return; }
        Integer userId = autenticar(ex);
        if (userId == null) return;

        try {
            Paciente p = pacienteDAO.buscarPorId(userId);
            if (p == null) {
                enviarErro(ex, 404, "Paciente não encontrado.");
                return;
            }

            // A cidade sai do CEP do cadastro, a não ser que o paciente peça
            // outra na tela (?cep=). Sem isso, quem mora na divisa não enxerga
            // a UBS do outro lado: a busca do CNES é por município, e uma
            // unidade de Guarulhos nunca aparece para um cadastro de São Paulo.
            String cepEscolhido = textoDaQuery(ex, "cep");
            boolean cidadeEscolhida = cepEscolhido != null;

            Localizacao.Lugar lugar =
                    Localizacao.buscarPorCep(cidadeEscolhida ? cepEscolhido : p.getCep());
            if (lugar == null) {
                enviarErro(ex, 422, cidadeEscolhida
                        ? "Não encontramos esse CEP. Confira os 8 dígitos e tente de novo."
                        : "Não foi possível localizar sua cidade pelo CEP. "
                        + "Confira o endereço no seu perfil.");
                return;
            }

            // GPS do navegador tem prioridade; o CEP é o plano B. Com a cidade
            // escolhida à mão o GPS é ignorado de propósito: medir a partir de
            // onde o paciente está agora, em outra cidade, daria uma lista
            // ordenada por uma distância que não é a que ele quer ver.
            Double lat = numeroDaQuery(ex, "lat");
            Double lon = numeroDaQuery(ex, "lon");
            boolean porGps = !cidadeEscolhida && Localizacao.coordenadaValida(lat, lon);
            if (!porGps) {
                lat = lugar.getLatitude();
                lon = lugar.getLongitude();
            }

            List<Object> lista = new ArrayList<>();
            for (UnidadeSaude u : unidadeSaudeDAO.buscarProximas(
                    lugar.getCodigoMunicipio(), lat, lon)) {
                lista.add(unidadeJson(u));
            }

            Map<String, Object> origem = new LinkedHashMap<>();
            origem.put("tipo", porGps ? "gps" : (lat != null ? "cep" : "nenhuma"));
            origem.put("cidade", lugar.getCidade());
            origem.put("estado", lugar.getEstado());
            // A tela precisa saber se está mostrando a cidade do cadastro ou
            // uma pesquisada, para dizer isso ao paciente e oferecer a volta.
            origem.put("escolhida", cidadeEscolhida);

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("origem", origem);
            resp.put("unidades", lista);
            enviarJson(ex, 200, resp);

        } catch (SQLException e) {
            System.out.println("[ERRO rede-saude] " + e.getMessage());
            enviarErro(ex, 500, "Erro ao buscar a rede de saúde.");
        }
    }

    /** GET /api/prontuario — alergias, condições e medicações do paciente logado. */
    private static void prontuario(HttpExchange ex) throws IOException {
        if (!"GET".equals(ex.getRequestMethod())) { enviarErro(ex, 405, "Método não permitido."); return; }
        Integer userId = autenticar(ex);
        if (userId == null) return;

        try {
            Integer dependenteId = idDependente(ex);

            List<Object> alergias = new ArrayList<>();
            for (Alergia a : prontuarioDAO.listarAlergias(userId, dependenteId)) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", a.getIdAlergia());
                m.put("descricao", a.getDescricao());
                alergias.add(m);
            }

            List<Object> condicoes = new ArrayList<>();
            for (HistoricoMedico h : prontuarioDAO.listarCondicoes(userId, dependenteId)) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", h.getIdHistorico());
                m.put("descricao", h.getDescricao());
                m.put("desde", h.getData());
                condicoes.add(m);
            }

            List<Object> medicacoes = new ArrayList<>();
            for (Medicacao med : prontuarioDAO.listarMedicacoes(userId, dependenteId)) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", med.getIdMedicacao());
                m.put("nome", med.getNome());
                m.put("dosagem", med.getDosagem());
                m.put("frequencia", med.getFrequencia());
                m.put("desde", med.getDesde());
                medicacoes.add(m);
            }

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("alergias", alergias);
            resp.put("condicoes", condicoes);
            resp.put("medicacoes", medicacoes);

            auditarLeitura(ex, userId, "consultou_prontuario", "prontuario",
                    alvoDaLeitura(userId, dependenteId));
            enviarJson(ex, 200, resp);

        } catch (SQLException e) {
            System.out.println("[ERRO prontuario] " + e.getMessage());
            enviarErro(ex, 500, "Erro ao buscar o prontuário.");
        }
    }

    // ===================== ACESSO TEMPORÁRIO (LADO DO PACIENTE) =====================

    /** /api/acessos — gera (POST), lista (GET) ou revoga (DELETE /{id}) acessos. */
    private static void acessos(HttpExchange ex) throws IOException {
        Integer userId = autenticar(ex);
        if (userId == null) return;

        String metodo = ex.getRequestMethod();
        String path = ex.getRequestURI().getPath();

        try {
            if ("POST".equals(metodo) && "/api/acessos".equals(path)) {
                gerarAcesso(ex, userId);
            } else if ("GET".equals(metodo) && "/api/acessos".equals(path)) {
                listarAcessos(ex, userId);
            } else if ("GET".equals(metodo) && "/api/acessos/log".equals(path)) {
                listarHistoricoAcessos(ex, userId);
            } else if ("DELETE".equals(metodo) && path.startsWith("/api/acessos/")) {
                revogarAcesso(ex, userId, path.substring("/api/acessos/".length()));
            } else {
                enviarErro(ex, 405, "Método não permitido.");
            }
        } catch (IllegalArgumentException e) {
            enviarErro(ex, 400, "Corpo da requisição inválido (JSON).");
        } catch (SQLException e) {
            System.out.println("[ERRO acessos] " + e.getMessage());
            enviarErro(ex, 500, "Erro ao processar o acesso temporário.");
        }
    }

    private static void gerarAcesso(HttpExchange ex, int userId) throws IOException, SQLException {
        Map<String, Object> body = lerCorpo(ex);
        String escopo = campo(body, "escopo");
        if (!AcessoTemporario.ESCOPO_ESCRITA.equals(escopo)) {
            escopo = AcessoTemporario.ESCOPO_LEITURA;
        }

        int minutos = VALIDADE_ACESSO_MINUTOS;
        Object m = body.get("minutos");
        if (m instanceof Number) {
            // Aceita entre 5 e 60 minutos; fora disso usa o padrão.
            int pedido = ((Number) m).intValue();
            if (pedido >= 5 && pedido <= 60) minutos = pedido;
        }

        String codigo = CodigoAcesso.gerar();
        int id = acessoDAO.criar(userId, CodigoAcesso.hash(codigo), escopo, minutos);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id", id);
        // Única vez em que o código trafega: ele não é recuperável depois.
        resp.put("codigo", codigo);
        resp.put("escopo", escopo);
        resp.put("validade_minutos", minutos);

        // Conceder acesso aos próprios dados é ação de governança: fica registrado
        // quem abriu a porta, com qual permissão e por quanto tempo.
        auditar(ex, userId, "gerou_codigo", "acessos",
                (AcessoTemporario.ESCOPO_ESCRITA.equals(escopo) ? "Leitura e registro" : "Somente leitura")
                        + " · válido por " + minutos + " min.");
        enviarJson(ex, 201, resp);
    }

    private static void listarAcessos(HttpExchange ex, int userId) throws IOException, SQLException {
        List<Object> arr = new ArrayList<>();
        for (AcessoTemporario a : acessoDAO.listarPorPaciente(userId)) {
            arr.add(acessoJson(a));
        }
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("acessos", arr);
        enviarJson(ex, 200, resp);
    }

    /**
     * GET /api/acessos/log — trilha de auditoria do paciente do JWT.
     *
     * Responde à pergunta da LGPD "quem viu os meus dados e quando". Só devolve
     * o que aconteceu nos acessos do próprio paciente: o filtro é feito no SQL,
     * pelo dono do acesso, e não pelo id que viesse da URL.
     */
    private static void listarHistoricoAcessos(HttpExchange ex, int userId)
            throws IOException, SQLException {
        List<Object> arr = new ArrayList<>();
        for (AcessoLog log : acessoDAO.listarLogPorPaciente(userId, LIMITE_HISTORICO_ACESSOS)) {
            arr.add(acessoLogJson(log));
        }
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("registros", arr);
        enviarJson(ex, 200, resp);
    }

    private static void revogarAcesso(HttpExchange ex, int userId, String idTexto)
            throws IOException, SQLException {
        int id;
        try {
            id = Integer.parseInt(idTexto.trim());
        } catch (NumberFormatException e) {
            enviarErro(ex, 400, "Id de acesso inválido.");
            return;
        }
        if (!acessoDAO.revogar(id, userId)) {
            enviarErro(ex, 404, "Acesso não encontrado ou já revogado.");
            return;
        }
        acessoDAO.registrarLog(id, "revogado", "Revogado pelo paciente.");

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("sucesso", Boolean.TRUE);
        enviarJson(ex, 200, resp);
    }

    // ===================== TRILHA DE AUDITORIA =====================

    /**
     * GET /api/auditoria — a trilha completa do paciente do JWT.
     *
     * Junta os dois lados: o que os médicos fizeram com os códigos dele
     * (acessos_log) e o que ele mesmo fez na conta (auditoria). O paciente do
     * JWT é a única chave dos dois SELECTs — não existe parâmetro de id aqui.
     */
    private static void auditoria(HttpExchange ex) throws IOException {
        if (!"GET".equals(ex.getRequestMethod())) { enviarErro(ex, 405, "Método não permitido."); return; }
        Integer userId = autenticar(ex);
        if (userId == null) return;

        try {
            listarAuditoria(ex, userId);
        } catch (SQLException e) {
            System.out.println("[ERRO auditoria] " + e.getMessage());
            enviarErro(ex, 500, "Erro ao buscar a trilha de auditoria.");
        }
    }

    /**
     * Intercala as duas trilhas numa linha do tempo só.
     *
     * Cada lado já chega ordenado do banco, do mais novo para o mais antigo.
     * Em vez de concatenar tudo e reordenar, as duas listas viram FILAS e a
     * cada rodada sai a frente da mais recente: é a intercalação clássica de
     * duas sequências ordenadas, que passa uma única vez por cada uma e nunca
     * devolve mais registros do que o limite da tela.
     */
    private static void listarAuditoria(HttpExchange ex, int userId) throws IOException, SQLException {
        Deque<AcessoLog> doMedico =
                new ArrayDeque<>(acessoDAO.listarLogPorPaciente(userId, LIMITE_HISTORICO_ACESSOS));
        Deque<RegistroAuditoria> doPaciente =
                new ArrayDeque<>(auditoriaDAO.listarPorPaciente(userId, LIMITE_HISTORICO_ACESSOS));

        List<Object> arr = new ArrayList<>();
        while (arr.size() < LIMITE_HISTORICO_ACESSOS && !(doMedico.isEmpty() && doPaciente.isEmpty())) {
            boolean medicoPrimeiro;
            if (doPaciente.isEmpty()) {
                medicoPrimeiro = true;
            } else if (doMedico.isEmpty()) {
                medicoPrimeiro = false;
            } else {
                medicoPrimeiro = maisRecente(doMedico.peekFirst().getCriadoEm(),
                                             doPaciente.peekFirst().getCriadoEm());
            }
            arr.add(medicoPrimeiro
                    ? trilhaMedicoJson(doMedico.pollFirst())
                    : trilhaPacienteJson(doPaciente.pollFirst()));
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("registros", arr);
        enviarJson(ex, 200, resp);
    }

    /**
     * true quando `a` é igual ou mais recente que `b`.
     *
     * As duas datas são ISO (2026-08-20T14:30:05), e nesse formato a ordem
     * alfabética é a mesma ordem cronológica — por isso dá para comparar como
     * texto, sem converter as duas a cada rodada da intercalação.
     */
    private static boolean maisRecente(String a, String b) {
        if (a == null) return false;
        if (b == null) return true;
        return a.compareTo(b) >= 0;
    }

    /**
     * POST /api/exames/exportacao — o front avisa que o PDF de exames foi baixado.
     *
     * Exportar dado de saúde é exatamente o tipo de operação que precisa de
     * trilha, mas o arquivo é montado no navegador (jsPDF): sem esta rota o
     * servidor nunca ficaria sabendo que ele existiu. O nome da ação é fixado
     * aqui, no servidor — do cliente vem só a contagem do que entrou no
     * arquivo, então ninguém consegue escrever uma ação inventada na trilha.
     */
    private static void registrarExportacao(HttpExchange ex) throws IOException {
        Integer userId = autenticar(ex);
        if (userId == null) return;

        try {
            Map<String, Object> body = lerCorpo(ex);
            int coletas = inteiro(body.get("coletas"));
            int imagens = inteiro(body.get("imagens"));
            boolean protegido = Boolean.TRUE.equals(body.get("protegido"));

            // De quem era o relatório. O id vem do cliente, mas o NOME é
            // resolvido aqui, contra o banco e preso ao paciente do JWT — o
            // que o cliente escreveria nunca chega à trilha.
            Integer dependenteId = body.get("dependenteId") instanceof Number
                    ? ((Number) body.get("dependenteId")).intValue()
                    : null;
            String alvo = alvoDaLeitura(userId, dependenteId);

            String detalhe = "PDF de exames · " + (alvo == null ? "titular" : alvo) + " · "
                    + coletas + " coleta(s) e " + imagens + " exame(s) de imagem · "
                    + (protegido ? "protegido por senha" : "sem senha");

            auditar(ex, userId, "exportou_exames", "exames", detalhe);

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("sucesso", Boolean.TRUE);
            enviarJson(ex, 201, resp);

        } catch (IllegalArgumentException e) {
            enviarErro(ex, 400, "Corpo da requisição inválido (JSON).");
        }
    }

    /**
     * Enfileira uma ação do paciente na trilha. Não lança nem espera o banco:
     * quem grava é a thread da fila do AuditoriaDAO.
     */
    private static void auditar(HttpExchange ex, int userId, String acao, String recurso, String detalhe) {
        auditoriaDAO.registrar(userId, acao, recurso, detalhe, ipDe(ex), false);
    }

    /**
     * Como o auditar, mas para leitura de dado sensível: o DAO agrupa as
     * repetidas, senão cada montagem de tela do React viraria uma linha.
     *
     * O agrupamento leva o detalhe em conta, então abrir os exames do titular
     * e em seguida os de um dependente continuam sendo duas linhas.
     */
    private static void auditarLeitura(HttpExchange ex, int userId, String acao,
                                       String recurso, String detalhe) {
        auditoriaDAO.registrar(userId, acao, recurso, detalhe, ipDe(ex), true);
    }

    /**
     * De quem é o dado que está sendo aberto, do jeito que vai para a trilha.
     *
     * Devolve null para o titular — a trilha dele não precisa dizer "seu" em
     * toda linha — e o primeiro nome quando é de um dependente, que é o que
     * responde "abri os exames de quem?". O nome só sai do banco se o
     * dependente for mesmo daquele paciente, então um id de outra conta na
     * query string não vira nome nenhum.
     *
     * Falha de leitura vira null em vez de exceção: a trilha pode perder o
     * nome, mas não pode derrubar a resposta que o paciente pediu.
     */
    private static String alvoDaLeitura(int userId, Integer dependenteId) {
        if (dependenteId == null) return null;
        try {
            return primeiroNome(dependenteDAO.nomeDoPaciente(dependenteId, userId));
        } catch (SQLException e) {
            return null;
        }
    }

    private static String ipDe(HttpExchange ex) {
        try {
            return ex.getRemoteAddress().getAddress().getHostAddress();
        } catch (RuntimeException e) {
            return null;
        }
    }

    /**
     * Só o primeiro nome vai para a trilha. O paciente reconhece o dependente
     * por ele, e minimizar dado (LGPD) vale também para o que nós mesmos
     * gravamos — a trilha não precisa do nome completo nem do CPF.
     */
    private static String primeiroNome(String nome) {
        if (nome == null) return null;
        String limpo = nome.trim();
        if (limpo.isEmpty()) return null;
        int espaco = limpo.indexOf(' ');
        return espaco > 0 ? limpo.substring(0, espaco) : limpo;
    }

    /** Número vindo do corpo da requisição, preso a uma faixa sã (0 a 9999). */
    private static int inteiro(Object v) {
        if (!(v instanceof Number)) return 0;
        int n = ((Number) v).intValue();
        if (n < 0) return 0;
        return Math.min(n, 9999);
    }

    private static Map<String, Object> trilhaMedicoJson(AcessoLog log) {
        Map<String, Object> m = acessoLogJson(log);
        // Id com prefixo: as duas trilhas têm numeração própria e as chaves se
        // repetiriam na lista única que a tela recebe.
        m.put("id", "med-" + log.getIdLog());
        m.put("origem", "medico");
        return m;
    }

    private static Map<String, Object> trilhaPacienteJson(RegistroAuditoria r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", "pac-" + r.getIdRegistro());
        m.put("origem", "paciente");
        m.put("acao", r.getAcao());
        m.put("recurso", r.getRecurso());
        m.put("detalhe", r.getDetalhe());
        m.put("criado_em", r.getCriadoEm());
        m.put("origem_ip", r.getOrigemIp());
        return m;
    }

    // ===================== PORTAL DO MÉDICO =====================

    /** /api/medico/* — entrada com o código e registro de dados no prontuário. */
    private static void medico(HttpExchange ex) throws IOException {
        String metodo = ex.getRequestMethod();
        String path = ex.getRequestURI().getPath();

        try {
            if ("POST".equals(metodo) && "/api/medico/entrar".equals(path)) {
                entrarComoMedico(ex);
            } else if ("GET".equals(metodo) && "/api/medico/paciente".equals(path)) {
                pacienteDoMedico(ex);
            } else if ("POST".equals(metodo) && "/api/medico/consultas".equals(path)) {
                registrarConsulta(ex);
            } else if ("POST".equals(metodo) && "/api/medico/exames".equals(path)) {
                registrarExame(ex);
            } else if ("POST".equals(metodo) && "/api/medico/prontuario".equals(path)) {
                registrarItemProntuario(ex);
            } else if ("DELETE".equals(metodo) && path.startsWith("/api/medico/prontuario/")) {
                removerItemProntuario(ex, path.substring("/api/medico/prontuario/".length()));
            } else {
                enviarErro(ex, 404, "Rota não encontrada.");
            }
        } catch (IllegalArgumentException e) {
            enviarErro(ex, 400, "Corpo da requisição inválido (JSON).");
        } catch (SQLException e) {
            System.out.println("[ERRO medico] " + e.getMessage());
            enviarErro(ex, 500, "Erro ao processar a requisição do médico.");
        }
    }

    /**
     * POST /api/medico/entrar — troca o código do paciente por um token curto.
     * É a única rota pública do portal; por isso tem limite de tentativas.
     */
    private static void entrarComoMedico(HttpExchange ex) throws IOException, SQLException {
        String ip = ex.getRemoteAddress().getAddress().getHostAddress();
        if (excedeuTentativas(ip)) {
            enviarErro(ex, 429, "Muitas tentativas. Aguarde alguns minutos e tente de novo.");
            return;
        }

        Map<String, Object> body = lerCorpo(ex);
        String codigo = campo(body, "codigo");
        String nome = campo(body, "nome");
        String crm = campo(body, "crm");
        String especialidade = campo(body, "especialidade");

        if (codigo == null || nome == null || crm == null) {
            enviarErro(ex, 400, "Informe o código do paciente, seu nome e seu CRM.");
            return;
        }

        AcessoTemporario acesso = acessoDAO.buscarUtilizavelPorHash(CodigoAcesso.hash(codigo));
        if (acesso == null) {
            registrarTentativa(ip);
            // Mensagem única de propósito: não revela se o código existe, se já
            // foi usado ou se expirou.
            enviarErro(ex, 401, "Código inválido, expirado ou já utilizado.");
            return;
        }

        Medico med = medicoDAO.buscarOuCriar(nome, especialidade == null ? "Não informada" : especialidade, crm);
        acessoDAO.marcarUso(acesso.getIdAcesso(), med.getIdMedico());
        acessoDAO.registrarLog(acesso.getIdAcesso(), "entrou",
                med.getNome() + " (CRM " + med.getCrm() + ")");

        Paciente p = pacienteDAO.buscarPorId(acesso.getIdPaciente());
        if (p == null) {
            enviarErro(ex, 404, "Paciente não encontrado.");
            return;
        }

        // O token do médico vale o tempo que resta do acesso, no máximo.
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("tipo", "medico");
        claims.put("acesso", acesso.getIdAcesso());
        claims.put("pid", acesso.getIdPaciente());
        claims.put("escopo", acesso.getEscopo());
        claims.put("medico", med.getNome());
        claims.put("crm", med.getCrm());

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("token", Jwt.gerar(claims, VALIDADE_ACESSO_MINUTOS * 60L));
        resp.put("escopo", acesso.getEscopo());
        resp.put("expira_em", acesso.getExpiraEm());
        resp.put("paciente", resumoPacienteJson(p));
        enviarJson(ex, 200, resp);
    }

    /** GET /api/medico/paciente — resumo clínico liberado pelo acesso. */
    private static void pacienteDoMedico(HttpExchange ex) throws IOException, SQLException {
        AcessoTemporario acesso = autenticarMedico(ex);
        if (acesso == null) return;

        Paciente p = pacienteDAO.buscarPorId(acesso.getIdPaciente());
        if (p == null) {
            enviarErro(ex, 404, "Paciente não encontrado.");
            return;
        }

        // Cada item vai com o seu id porque o médico com escopo de escrita pode
        // remover um registro errado, e para isso a tela dele precisa saber
        // qual linha remover.
        List<Object> alergias = new ArrayList<>();
        for (Alergia a : prontuarioDAO.listarAlergias(acesso.getIdPaciente(), null)) {
            alergias.add(itemProntuarioJson(a.getIdAlergia(), a.getDescricao()));
        }
        List<Object> condicoes = new ArrayList<>();
        for (HistoricoMedico h : prontuarioDAO.listarCondicoes(acesso.getIdPaciente(), null)) {
            condicoes.add(itemProntuarioJson(h.getIdHistorico(), h.getDescricao()));
        }
        List<Object> medicacoes = new ArrayList<>();
        for (Medicacao m : prontuarioDAO.listarMedicacoes(acesso.getIdPaciente(), null)) {
            medicacoes.add(itemProntuarioJson(m.getIdMedicacao(),
                    m.getNome() + " " + m.getDosagem() + " — " + m.getFrequencia()));
        }

        acessoDAO.registrarLog(acesso.getIdAcesso(), "leu_prontuario", null);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("paciente", resumoPacienteJson(p));
        resp.put("alergias", alergias);
        resp.put("condicoes", condicoes);
        resp.put("medicacoes", medicacoes);
        resp.put("escopo", acesso.getEscopo());
        enviarJson(ex, 200, resp);
    }

    /** POST /api/medico/consultas — registra o atendimento no prontuário. */
    private static void registrarConsulta(HttpExchange ex) throws IOException, SQLException {
        AcessoTemporario acesso = autenticarMedico(ex);
        if (acesso == null) return;
        if (!exigirEscrita(ex, acesso)) return;

        Map<String, Object> body = lerCorpo(ex);
        String motivo = campo(body, "motivo");
        String local = campo(body, "local");
        if (motivo == null || local == null) {
            enviarErro(ex, 400, "Informe ao menos o motivo e o local do atendimento.");
            return;
        }

        Medico med = acesso.getMedico();
        if (med == null) {
            enviarErro(ex, 403, "Acesso sem médico identificado.");
            return;
        }

        String data = campo(body, "data");
        String hora = campo(body, "hora");

        Consulta c = new Consulta();
        c.setIdPaciente(acesso.getIdPaciente());
        c.setMedico(med);
        c.setData(data != null ? data : LocalDate.now().toString());
        c.setHora(hora != null ? hora : LocalTime.now().withSecond(0).withNano(0).toString());
        c.setLocal(local);
        c.setMotivo(motivo);
        c.setStatus("realizada");
        c.setResumo(campo(body, "resumo"));
        c.setConduta(campo(body, "conduta"));

        int id = consultaDAO.inserir(c, acesso.getIdAcesso());
        acessoDAO.registrarLog(acesso.getIdAcesso(), "registrou_consulta", motivo);
        // O paciente precisa ficar sabendo sem depender de abrir a tela certa
        // por acaso. A mensagem diz o que aconteceu e quem fez — motivo,
        // resumo e conduta ficam no prontuário, não na notificação.
        notificacaoDAO.inserirSemFalhar(acesso.getIdPaciente(), NotificacaoDAO.TIPO_CONSULTA,
                med.getNome() + " registrou uma consulta no seu prontuário.");

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id", id);
        resp.put("sucesso", Boolean.TRUE);
        enviarJson(ex, 201, resp);
    }

    /** POST /api/medico/exames — registra uma coleta de sangue ou exame de imagem. */
    @SuppressWarnings("unchecked")
    private static void registrarExame(HttpExchange ex) throws IOException, SQLException {
        AcessoTemporario acesso = autenticarMedico(ex);
        if (acesso == null) return;
        if (!exigirEscrita(ex, acesso)) return;

        Map<String, Object> body = lerCorpo(ex);
        String tipo = campo(body, "tipo");
        String local = campo(body, "local");
        if (local == null) {
            enviarErro(ex, 400, "Informe o laboratório ou o local do exame.");
            return;
        }
        if (!Exame.TIPO_IMAGEM.equals(tipo)) {
            tipo = Exame.TIPO_SANGUE;
        }

        String data = campo(body, "data");

        Exame e = new Exame();
        e.setIdPaciente(acesso.getIdPaciente());
        e.setSolicitante(acesso.getMedico());
        e.setTipo(tipo);
        e.setData(data != null ? data : LocalDate.now().toString());
        e.setLocal(local);
        e.setNome(campo(body, "nome"));
        e.setLaudo(campo(body, "laudo"));

        if (Exame.TIPO_SANGUE.equals(tipo)) {
            Object bruto = body.get("itens");
            if (!(bruto instanceof List) || ((List<Object>) bruto).isEmpty()) {
                enviarErro(ex, 400, "Informe ao menos um resultado na coleta.");
                return;
            }
            for (Object o : (List<Object>) bruto) {
                if (!(o instanceof Map)) continue;
                Map<String, Object> linha = (Map<String, Object>) o;

                String nomeItem = campo(linha, "nome");
                Object valor = linha.get("valor");
                Object refMin = linha.get("refMin");
                Object refMax = linha.get("refMax");
                if (nomeItem == null || !(valor instanceof Number)
                        || !(refMin instanceof Number) || !(refMax instanceof Number)) {
                    enviarErro(ex, 400, "Cada resultado precisa de nome, valor e faixa de referência.");
                    return;
                }

                ItemExame item = new ItemExame();
                item.setNome(nomeItem);
                item.setValor(((Number) valor).doubleValue());
                item.setUnidade(campo(linha, "unidade") == null ? "" : campo(linha, "unidade"));
                item.setRefMin(((Number) refMin).doubleValue());
                item.setRefMax(((Number) refMax).doubleValue());
                e.getItens().add(item);
            }
        } else if (e.getNome() == null) {
            enviarErro(ex, 400, "Informe o nome do exame de imagem.");
            return;
        }

        int id = exameDAO.inserir(e, acesso.getIdAcesso());
        acessoDAO.registrarLog(acesso.getIdAcesso(), "registrou_exame",
                Exame.TIPO_IMAGEM.equals(tipo) ? e.getNome() : e.getItens().size() + " resultado(s)");
        // Sem resultado nem laudo na mensagem: ela avisa que há novidade, e o
        // paciente abre a tela de exames para ver o conteúdo.
        notificacaoDAO.inserirSemFalhar(acesso.getIdPaciente(), NotificacaoDAO.TIPO_EXAME,
                nomeDoMedico(acesso) + " registrou um novo exame no seu prontuário.");

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id", id);
        resp.put("sucesso", Boolean.TRUE);
        enviarJson(ex, 201, resp);
    }

    /**
     * POST /api/medico/prontuario — o médico lança uma alergia, uma condição
     * acompanhada ou uma medicação em uso.
     *
     * Faltava exatamente isto para o portal cobrir o prontuário inteiro: até
     * aqui o médico registrava consulta e exame, mas uma alergia descoberta no
     * atendimento não tinha onde ser anotada.
     */
    private static void registrarItemProntuario(HttpExchange ex) throws IOException, SQLException {
        AcessoTemporario acesso = autenticarMedico(ex);
        if (acesso == null) return;
        if (!exigirEscrita(ex, acesso)) return;

        Map<String, Object> body = lerCorpo(ex);
        String tipo = campo(body, "tipo");
        int idPaciente = acesso.getIdPaciente();

        int id;
        String rotulo;
        String descricao;

        if ("alergia".equals(tipo)) {
            descricao = campo(body, "descricao");
            if (descricao == null) {
                enviarErro(ex, 400, "Informe a descrição da alergia.");
                return;
            }
            id = prontuarioDAO.inserirAlergia(idPaciente, descricao);
            rotulo = "alergia";

        } else if ("condicao".equals(tipo)) {
            descricao = campo(body, "descricao");
            if (descricao == null) {
                enviarErro(ex, 400, "Informe a descrição da condição.");
                return;
            }
            id = prontuarioDAO.inserirCondicao(idPaciente, descricao, campo(body, "desde"));
            rotulo = "condição";

        } else if ("medicacao".equals(tipo)) {
            String nome = campo(body, "nome");
            String dosagem = campo(body, "dosagem");
            String frequencia = campo(body, "frequencia");
            if (nome == null || dosagem == null || frequencia == null) {
                enviarErro(ex, 400, "Informe o nome, a dosagem e a frequência da medicação.");
                return;
            }
            id = prontuarioDAO.inserirMedicacao(idPaciente, nome, dosagem, frequencia, campo(body, "desde"));
            rotulo = "medicação";
            descricao = nome;

        } else {
            enviarErro(ex, 400, "Tipo inválido: use alergia, condicao ou medicacao.");
            return;
        }

        acessoDAO.registrarLog(acesso.getIdAcesso(), "registrou_" + tipo, descricao);
        notificacaoDAO.inserirSemFalhar(idPaciente, NotificacaoDAO.TIPO_PRONTUARIO,
                nomeDoMedico(acesso) + " adicionou uma " + rotulo + " ao seu prontuário.");

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id", id);
        resp.put("sucesso", Boolean.TRUE);
        enviarJson(ex, 201, resp);
    }

    /**
     * DELETE /api/medico/prontuario/{tipo}/{id} — remove um item lançado errado.
     *
     * Corrigir prontuário é remover e lançar de novo: as duas operações ficam
     * separadas na trilha do acesso, e o paciente vê as duas. Um UPDATE
     * silencioso apagaria o que estava escrito antes sem deixar rastro.
     */
    private static void removerItemProntuario(HttpExchange ex, String resto)
            throws IOException, SQLException {
        AcessoTemporario acesso = autenticarMedico(ex);
        if (acesso == null) return;
        if (!exigirEscrita(ex, acesso)) return;

        String[] partes = resto.split("/");
        if (partes.length != 2) {
            enviarErro(ex, 400, "Informe o tipo e o id do item.");
            return;
        }

        String tipo = partes[0];
        // A tabela e a coluna nunca vêm do cliente: o tipo recebido é traduzido
        // aqui para as constantes do DAO, e o que não casar vira 400.
        String tabela;
        String coluna;
        if ("alergia".equals(tipo)) {
            tabela = ProntuarioDAO.TABELA_ALERGIA;
            coluna = "descricao";
        } else if ("condicao".equals(tipo)) {
            tabela = ProntuarioDAO.TABELA_CONDICAO;
            coluna = "descricao";
        } else if ("medicacao".equals(tipo)) {
            tabela = ProntuarioDAO.TABELA_MEDICACAO;
            coluna = "nome";
        } else {
            enviarErro(ex, 400, "Tipo inválido: use alergia, condicao ou medicacao.");
            return;
        }

        int id;
        try {
            id = Integer.parseInt(partes[1].trim());
        } catch (NumberFormatException e) {
            enviarErro(ex, 400, "Id inválido.");
            return;
        }

        int idPaciente = acesso.getIdPaciente();
        String descricao = prontuarioDAO.descricaoDe(tabela, coluna, id, idPaciente);
        if (!prontuarioDAO.excluir(tabela, id, idPaciente)) {
            enviarErro(ex, 404, "Item não encontrado no prontuário deste paciente.");
            return;
        }

        acessoDAO.registrarLog(acesso.getIdAcesso(), "removeu_" + tipo, descricao);
        notificacaoDAO.inserirSemFalhar(idPaciente, NotificacaoDAO.TIPO_PRONTUARIO,
                nomeDoMedico(acesso) + " removeu um item do seu prontuário.");

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("sucesso", Boolean.TRUE);
        enviarJson(ex, 200, resp);
    }

    /** Nome do médico do acesso, com um rótulo genérico se ele não veio. */
    private static String nomeDoMedico(AcessoTemporario acesso) {
        Medico med = acesso.getMedico();
        return (med == null || med.getNome() == null) ? "Um profissional" : med.getNome();
    }

    /**
     * Valida o token do médico e devolve o acesso correspondente.
     *
     * O token sozinho não basta: o acesso é reconferido no banco a cada
     * requisição, então uma revogação feita pelo paciente vale imediatamente,
     * sem esperar o token expirar. Responde o erro e devolve null se algo falhar.
     */
    private static AcessoTemporario autenticarMedico(HttpExchange ex) throws IOException, SQLException {
        String header = ex.getRequestHeaders().getFirst("Authorization");
        if (header == null) header = "";
        String[] partes = header.split(" ");
        if (partes.length != 2 || !"Bearer".equals(partes[0]) || partes[1].isEmpty()) {
            enviarErro(ex, 401, "Token não fornecido.");
            return null;
        }

        Map<String, Object> claims = Jwt.validar(partes[1]);
        if (claims == null || !"medico".equals(claims.get("tipo"))
                || !(claims.get("acesso") instanceof Number)) {
            enviarErro(ex, 401, "Token inválido ou expirado.");
            return null;
        }

        int idAcesso = ((Number) claims.get("acesso")).intValue();
        AcessoTemporario acesso = acessoDAO.buscarValidoPorId(idAcesso);
        if (acesso == null) {
            enviarErro(ex, 401, "Este acesso foi revogado pelo paciente ou expirou.");
            return null;
        }
        return acesso;
    }

    /** Bloqueia com 403 quando o acesso é somente leitura. */
    private static boolean exigirEscrita(HttpExchange ex, AcessoTemporario acesso) throws IOException {
        if (acesso.permiteEscrita()) return true;
        enviarErro(ex, 403, "Este acesso é somente leitura.");
        return false;
    }

    /**
     * Controle simples de força bruta na troca do código, por IP: no máximo
     * TENTATIVAS_MAXIMAS erros dentro da janela.
     */
    private static synchronized boolean excedeuTentativas(String ip) {
        long agora = System.currentTimeMillis();
        long[] registro = tentativasPorIp.get(ip);
        if (registro == null) return false;
        if (agora - registro[1] > JANELA_TENTATIVAS_MS) {
            tentativasPorIp.remove(ip);
            return false;
        }
        return registro[0] >= TENTATIVAS_MAXIMAS;
    }

    private static synchronized void registrarTentativa(String ip) {
        long agora = System.currentTimeMillis();
        long[] registro = tentativasPorIp.get(ip);
        if (registro == null || agora - registro[1] > JANELA_TENTATIVAS_MS) {
            tentativasPorIp.put(ip, new long[] { 1, agora });
        } else {
            registro[0]++;
        }
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

    /**
     * Uma unidade de saúde do jeito que a tela precisa: endereço já montado em
     * uma linha e distância arredondada em uma casa decimal. Distância negativa
     * significa "não deu para calcular" — a tela omite o número nesse caso.
     */
    private static Map<String, Object> unidadeJson(UnidadeSaude u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("codigo_cnes", u.getCodigoCnes());
        m.put("nome", u.getNome());
        m.put("tipo", u.getTipo());
        m.put("endereco", enderecoEmLinha(u));
        m.put("bairro", u.getBairro());
        m.put("telefone", u.getTelefone());
        m.put("turno", u.getTurno());
        m.put("latitude", u.getLatitude());
        m.put("longitude", u.getLongitude());
        m.put("distancia_km", u.getDistanciaKm() < 0
                ? null
                : Math.round(u.getDistanciaKm() * 10) / 10.0);
        return m;
    }

    /** Junta logradouro e número em "Rua Tal, 123", pulando o que estiver vazio. */
    private static String enderecoEmLinha(UnidadeSaude u) {
        String rua = u.getLogradouro();
        if (rua == null || rua.isBlank()) return null;
        String numero = u.getNumero();
        return (numero == null || numero.isBlank()) ? rua : rua + ", " + numero;
    }

    private static Map<String, Object> consultaJson(Consulta c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getIdConsulta());
        m.put("dependente_id", c.getIdDependente() > 0 ? c.getIdDependente() : null);
        m.put("data", c.getData());
        m.put("hora", c.getHora());
        m.put("local", c.getLocal());
        m.put("motivo", c.getMotivo());
        m.put("status", c.getStatus());
        m.put("resumo", c.getResumo());
        m.put("conduta", c.getConduta());
        m.put("medico", medicoJson(c.getMedico()));
        return m;
    }

    private static Map<String, Object> exameJson(Exame e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.getIdExame());
        m.put("dependente_id", e.getIdDependente() > 0 ? e.getIdDependente() : null);
        m.put("consulta_id", e.getIdConsulta() > 0 ? e.getIdConsulta() : null);
        m.put("tipo", e.getTipo());
        m.put("data", e.getData());
        m.put("local", e.getLocal());
        m.put("nome", e.getNome());
        m.put("laudo", e.getLaudo());
        m.put("solicitante", medicoJson(e.getSolicitante()));

        List<Object> itens = new ArrayList<>();
        for (ItemExame i : e.getItens()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", i.getIdItem());
            item.put("nome", i.getNome());
            item.put("valor", i.getValor());
            item.put("unidade", i.getUnidade());
            item.put("ref_min", i.getRefMin());
            item.put("ref_max", i.getRefMax());
            itens.add(item);
        }
        m.put("itens", itens);
        return m;
    }

    private static Map<String, Object> acessoJson(AcessoTemporario a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.getIdAcesso());
        m.put("escopo", a.getEscopo());
        m.put("criado_em", a.getCriadoEm());
        m.put("expira_em", a.getExpiraEm());
        m.put("usado_em", a.getUsadoEm());
        m.put("revogado_em", a.getRevogadoEm());
        m.put("medico", medicoJson(a.getMedico()));
        return m;
    }

    private static Map<String, Object> acessoLogJson(AcessoLog log) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", log.getIdLog());
        m.put("acesso_id", log.getIdAcesso());
        m.put("acao", log.getAcao());
        m.put("detalhe", log.getDetalhe());
        m.put("criado_em", log.getCriadoEm());
        m.put("escopo", log.getEscopo());
        m.put("medico", medicoJson(log.getMedico()));
        return m;
    }

    /**
     * Resumo do paciente enviado ao médico. Deliberadamente sem CPF, e-mail,
     * telefone, endereço ou dependentes: o acesso temporário é clínico, e o
     * mínimo necessário já identifica o paciente no atendimento.
     */
    private static Map<String, Object> resumoPacienteJson(Paciente p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("nome", p.getNome());
        m.put("data_nascimento", p.getDataNascimento());
        m.put("genero", p.getGenero());
        m.put("tipo_sanguineo", p.getTipoSanguineo());
        return m;
    }

    private static Map<String, Object> medicoJson(Medico med) {
        if (med == null) return null;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", med.getIdMedico());
        m.put("nome", med.getNome());
        m.put("especialidade", med.getEspecialidade());
        m.put("crm", med.getCrm());
        return m;
    }

    private static Map<String, Object> familiarJson(Familiar f) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", f.getIdFamiliar());
        m.put("nome", f.getNome());
        m.put("parentesco", f.getParentesco());
        m.put("telefone", f.getTelefone());
        return m;
    }

    private static Map<String, Object> notificacaoJson(Notificacao n) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", n.getIdNotificacao());
        m.put("tipo", n.getTipo());
        m.put("mensagem", n.getMensagem());
        m.put("criado_em", n.getDataEnvio());
        m.put("lida_em", n.getLidaEm());
        return m;
    }

    /**
     * Item do prontuário no formato que o portal do médico usa: o texto para
     * mostrar e o id para poder remover.
     */
    private static Map<String, Object> itemProntuarioJson(int id, String texto) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("texto", texto);
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

    /**
     * Lê ?dependenteId= da query string. Devolve null quando ausente ou
     * inválido — nesse caso as rotas trazem os dados do titular da conta.
     *
     * Não é preciso conferir se o dependente é do paciente: as consultas dos
     * DAOs sempre filtram também por paciente_id, vindo do JWT.
     */
    private static Integer idDependente(HttpExchange ex) {
        String query = ex.getRequestURI().getQuery();
        if (query == null || query.isEmpty()) return null;

        for (String par : query.split("&")) {
            int igual = par.indexOf('=');
            if (igual <= 0) continue;
            if (!"dependenteId".equals(par.substring(0, igual))) continue;
            try {
                return Integer.valueOf(par.substring(igual + 1).trim());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    /**
     * Lê um parâmetro de texto da query string (usado por ?cep=).
     * Devolve null quando o parâmetro não veio ou veio vazio.
     */
    private static String textoDaQuery(HttpExchange ex, String nome) {
        String query = ex.getRequestURI().getQuery();
        if (query == null || query.isEmpty()) return null;

        for (String par : query.split("&")) {
            int igual = par.indexOf('=');
            if (igual <= 0) continue;
            if (!nome.equals(par.substring(0, igual))) continue;
            String valor = URLDecoder.decode(par.substring(igual + 1), StandardCharsets.UTF_8).trim();
            return valor.isEmpty() ? null : valor;
        }
        return null;
    }

    /**
     * Lê um número decimal da query string (usado por ?lat= e ?lon=).
     * Devolve null quando o parâmetro não veio ou não é um número.
     */
    private static Double numeroDaQuery(HttpExchange ex, String nome) {
        String query = ex.getRequestURI().getQuery();
        if (query == null || query.isEmpty()) return null;

        for (String par : query.split("&")) {
            int igual = par.indexOf('=');
            if (igual <= 0) continue;
            if (!nome.equals(par.substring(0, igual))) continue;
            try {
                return Double.valueOf(par.substring(igual + 1).trim());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
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
