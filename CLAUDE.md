# Projeto — SaudeConecta (extensão do SUS)

Aplicação web para o paciente armazenar e consultar seus dados médicos:
tipo sanguíneo, carteira de vacinação, consultas, exames e prontuário.
Também permite cadastrar **dependentes** (ex.: filhos, idosos sob cuidado).

Contexto: trabalho acadêmico — FIAP, Sistemas de Informação, 4º semestre.
A proposta é funcionar como uma extensão do SUS, centralizando os dados do
paciente para facilitar o acesso em atendimentos.

## Stack

- **Front-end:** React + Vite (JavaScript, arquivos `.jsx`)
- **Estilo:** Tailwind CSS v4 (via PostCSS) + `src/app.css` para estilos globais
- **Back-end:** **Java puro**, pacote `br.com.hackgov` — sem Spring, sem
  Maven/Gradle. Dependência única é o `mysql-connector-j.jar` em `lib/`,
  compilado à mão para `out/`. JSON, JWT e hash de senha são implementações
  próprias em `util/`.
- **Banco:** MySQL (scripts em `database/`)

> **Importante:** não sugira Spring Boot, Maven, Gradle, Jackson, Gson ou
> qualquer biblioteca externa para o backend. A escolha por Java puro é
> proposital — tudo novo deve seguir o mesmo padrão manual que já existe.

## Estrutura

```
backend-api/          API Java (pacote br.com.hackgov)
  lib/                mysql-connector-j.jar
  out/                .class compilados
    api/ApiServer       servidor HTTP + rotas
    dao/                PacienteDAO, DependenteDAO — acesso ao banco
    db/Conexao          conexão JDBC com o MySQL
    modelos/            Paciente, Dependente, Familiar, Medico,
                        Consulta, Prontuario, HistoricoMedico,
                        Medicacao, Alergia, Notificacao
    principal/Principal ponto de entrada (main)
    util/               Json (parser próprio), Jwt, SenhaUtil
database/             scripts SQL (schema, seeds)
medical-app/          front-end React + Vite
  public/
  src/
    assets/           imagens, ícones
    components/       componentes reutilizáveis
      BottomNav.jsx     navegação inferior (mobile)
      MedicalChatbot.jsx
      Modal.jsx
      VLibras.jsx       acessibilidade em Libras
    content/          textos estáticos
    context/
      AuthContext.jsx   estado de autenticação global
    data/             dados estáticos (calendário de vacinas do PNI)
    utils/            regras puras (faixa de referência, datas, linha do tempo)
    screens/          uma tela por rota
      Login.jsx, Cadastro.jsx
      Dashboard.jsx, Profile.jsx, PatientProfile.jsx
      Dependentes.jsx, Vacinas.jsx
      Appointment.jsx, Exams.jsx, MedicalRecord.jsx
      Privacy.jsx, Terms.jsx
    services/         chamadas HTTP para a API
    App.jsx, main.jsx, app.css
  index.html, package.json
```

Regra geral no front: **tela** vai em `screens/`, **pedaço reutilizável** vai
em `components/`, **chamada de API** vai em `services/` (nunca `fetch` solto
dentro do componente).

Regra geral no back: rota nova entra em `ApiServer`, SQL fica **só** dentro
dos DAOs, e as classes de `modelos/` são POJOs (atributos + getters/setters,
sem lógica de banco).

## O que já está pronto

- Cadastro de paciente
- Login / `AuthContext` (front) + `Jwt` e `SenhaUtil` (back)
- Dependentes (tela + `DependenteDAO`)
- Vacinas
- Tipo sanguíneo
- Banco MySQL criado com as tabelas dos pacientes
- `ApiServer`, `Conexao` (JDBC) e os DAOs de Paciente e Dependente
- Chatbot médico (`MedicalChatbot.jsx`)
- Consultas: lista (`Appointments.jsx`, rota `/appointment`) e detalhe
  (`Appointment.jsx`, rota `/appointment/:id`)
- Prontuário (`MedicalRecord.jsx`) com linha do tempo unindo consultas e exames
- Exames (`Exams.jsx`) agrupados por coleta, com faixa de referência e situação
  calculadas em `utils/exames.js`
- Componentes compartilhados de exibição: `InfoField`, `StatusBadge`, `ResultRow`
- **Dados clínicos vindos do banco**: tabelas `medicos`, `consultas`, `exames`,
  `exame_itens`, `alergias`, `condicoes`, `medicacoes`; `ConsultaDAO`,
  `ExameDAO` e `ProntuarioDAO`; rotas `GET /api/consultas`,
  `/api/consultas/{id}`, `/api/exames` e `/api/prontuario`, todas filtrando
  pelo paciente do JWT. No front, `services/consultas.js`, `services/exames.js`
  e `services/prontuario.js`.
- **Acesso temporário do médico** (tabelas `acessos_temporarios` e
  `acessos_log`, `AcessoDAO`, `MedicoDAO`, `util/CodigoAcesso`):
  - o paciente gera um código em `/acesso-medico` (tela `AcessoMedico.jsx`),
    escolhendo entre "somente leitura" e "leitura e registro";
  - o médico usa o código em `/medico` (tela `PortalMedico.jsx`, fora do app do
    paciente) e recebe um token de 30 minutos;
  - rotas: `POST /api/acessos`, `GET /api/acessos`, `DELETE /api/acessos/{id}`
    (paciente) e `POST /api/medico/entrar`, `GET /api/medico/paciente`,
    `POST /api/medico/consultas`, `POST /api/medico/exames` (médico).

## O que falta

<!-- TODO: ajustar conforme o andamento -->
- Exames e prontuário de **dependentes**: o banco e a API já aceitam
  (`dependente_id` nas tabelas, `?dependenteId=` nas rotas), mas as telas ainda
  mostram só o titular — falta o seletor de pessoa que a tela de Vacinas já tem.
  O acesso do médico também é só do titular por enquanto.
- O médico ainda não edita alergias, condições e medicações — só registra
  consultas e exames.
- A tela do paciente não mostra a trilha de auditoria (`acessos_log`) do que
  cada médico leu/gravou; os dados já estão gravados, falta exibir.
- DAOs que ainda não existem: Notificacao, Familiar (os modelos já existem,
  falta a camada de acesso a dados)

## Convenções

- Código e comentários em **português**; nomes de variáveis/funções em inglês
  no front e em **português** no back (é o padrão já usado: `Paciente`,
  `Conexao`, `SenhaUtil`).
- Front: componentes em PascalCase, um por arquivo, `export default`.
- Back: uma classe por arquivo, sempre `PreparedStatement` (nunca concatenar
  string em SQL) e `try-with-resources` para fechar conexão.
- Sem instalar bibliotecas novas sem me perguntar antes — é trabalho de
  faculdade e preciso saber justificar cada dependência.
- Nada de `console.log` / `System.out.println` esquecido no código final.
- Dados de saúde são sensíveis (LGPD): não expor CPF, cartão do SUS ou
  diagnóstico em URL, log ou localStorage sem necessidade. Senha nunca em
  texto puro no banco — usar `SenhaUtil`.
- No acesso do médico, manter as quatro regras: o código só existe como hash no
  banco, o acesso é reconferido no banco a cada requisição (para a revogação
  valer na hora), o escopo de escrita é opcional e o resumo enviado ao médico
  nunca inclui CPF, e-mail, telefone ou endereço.

## Como rodar

Front:

```bash
cd medical-app
npm install
npm run dev
```

Back (Java puro, sem build tool). No Windows os scripts `.bat` já fazem tudo:

```bat
cd backend-api
compilar.bat        REM compila src\ -> out\
executar-api.bat    REM sobe a API REST em http://localhost:3001
```

Os dois scripts apontam para um JDK fixo na variável `JAVA_BIN`; se você tiver
o `java`/`javac` no PATH, basta deixar `set "JAVA_BIN="`.

Se precisar rodar na mão (ou em Linux/Mac, trocando o `;` do classpath por `:`):

```bash
cd backend-api
find src -name "*.java" > sources.txt
javac -encoding UTF-8 -d out @sources.txt
java -cp "out;lib/mysql-connector-j.jar" br.com.hackgov.api.ApiServer
```

O entry point da API é `br.com.hackgov.api.ApiServer` (porta 3001, definida na
constante `PORTA`). O `br.com.hackgov.principal.Principal` é o menu de console
antigo, executado pelo `executar.bat` — não é ele que serve o front.

Banco (uma vez, ou quando o schema mudar) — no Windows o `--default-character-set`
é obrigatório, senão o mysql.exe grava os acentos corrompidos:

```bash
mysql -u root -p --default-character-set=utf8mb4 < database/schema.sql
mysql -u root -p --default-character-set=utf8mb4 < database/seed.sql
```

Login de teste do seed: `gabriel@gmail.com` / `Teste@123`.

## Como me ajudar melhor

- Antes de mexer, leia os arquivos relacionados — não presuma o conteúdo.
- Mudanças pequenas e incrementais; explique o "porquê" em 1–2 linhas.
- Se eu pedir uma tela nova, siga o padrão visual e a estrutura das telas
  que já existem (`Vacinas.jsx` e `Dependentes.jsx` são boas referências).
- Ao terminar algo relevante, atualize as seções "O que já está pronto" e
  "O que falta" deste arquivo.
