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
  config.properties   chave da IA do chatbot (fora do Git; ver .example)
  src/br/com/hackgov/
    api/ApiServer       servidor HTTP + rotas
    dao/                acesso ao banco — Paciente, Dependente, Consulta,
                        Exame, Prontuario, Acesso, Medico, Aviso
    db/Conexao          conexão JDBC com o MySQL
    modelos/            POJOs — Paciente, Dependente, Familiar, Medico,
                        Consulta, Prontuario, HistoricoMedico, Medicacao,
                        Alergia, Notificacao, Exame, ItemExame,
                        AcessoTemporario, Aviso
    principal/Principal menu de console antigo (não serve o front)
    util/               Json (parser próprio), Jwt, SenhaUtil,
                        CodigoAcesso, ChatIA
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
      InfoField.jsx, StatusBadge.jsx, ResultRow.jsx  (exibição compartilhada)
    content/          textos estáticos (LegalContent, FaqContent)
    context/
      AuthContext.jsx   estado de autenticação global
    data/             dados estáticos (calendário de vacinas do PNI)
    utils/            regras puras (faixa de referência, datas, linha do tempo)
    screens/          uma tela por rota
      Login.jsx, Cadastro.jsx
      Dashboard.jsx, Profile.jsx, PatientProfile.jsx
      Dependentes.jsx, Vacinas.jsx
      Appointments.jsx, Appointment.jsx, Exams.jsx, MedicalRecord.jsx
      AcessoMedico.jsx  (paciente gera o código)
      PortalMedico.jsx  (médico usa o código — fora do app do paciente)
      Privacy.jsx, Terms.jsx, Faq.jsx
    services/         chamadas HTTP para a API (uma por assunto)
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
- Vacinas (`Vacinas.jsx`): carteira gerada pelo calendário do PNI a partir da
  data de nascimento, com seletor de pessoa (titular + dependentes). Só a lista
  de doses rola — cabeçalho, seletor e resumo ficam fixos —, e o ícone do
  dependente é azul para meninos e rosa para meninas (neutro quando o gênero é
  "Outro" ou "Prefiro não informar").
- Tipo sanguíneo
- Banco MySQL criado com as tabelas dos pacientes
- `ApiServer`, `Conexao` (JDBC) e os DAOs de Paciente e Dependente
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
- **Avisos do Dashboard** (`Aviso`, `AvisoDAO`, rota `GET /api/avisos`,
  `services/avisos.js`): o card "Avisos" não é mais texto fixo — cada aviso sai
  de uma consulta ao banco. Regras atuais: tempo desde o último exame, tempo
  desde a última consulta realizada, consulta agendada nos próximos 30 dias,
  resultados fora da faixa na coleta de sangue mais recente e campanhas de
  vacinação em cartaz (tabela `campanhas_vacinacao`, a única não ligada a um
  paciente). O texto é montado no `AvisoDAO` e a tela só exibe; a severidade
  (`alta`/`media`/`baixa`) define a cor e a ordem.
  - As campanhas do seed são as **oficiais de 2026** do Ministério da Saúde.
    Não existe API pública com o calendário de campanhas — o governo abre as
    doses aplicadas (OpenDataSUS, dados.gov.br), não os períodos —, então essa
    tabela é atualizada à mão uma vez por ano, com a fonte citada no `seed.sql`.
- **Acesso temporário do médico** (tabelas `acessos_temporarios` e
  `acessos_log`, `AcessoDAO`, `MedicoDAO`, `util/CodigoAcesso`):
  - o paciente gera um código em `/acesso-medico` (tela `AcessoMedico.jsx`),
    escolhendo entre "somente leitura" e "leitura e registro";
  - o médico usa o código em `/medico` (tela `PortalMedico.jsx`, fora do app do
    paciente) e recebe um token de 30 minutos;
  - rotas: `POST /api/acessos`, `GET /api/acessos`, `DELETE /api/acessos/{id}`
    (paciente) e `POST /api/medico/entrar`, `GET /api/medico/paciente`,
    `POST /api/medico/consultas`, `POST /api/medico/exames` (médico).
- **Chatbot em duas camadas** (`MedicalChatbot.jsx`, `services/chatbot.js`,
  `util/ChatIA.java`, rota `POST /api/chat`): a base de regras local responde na
  hora as dúvidas sobre o app — ignorando acento e escolhendo a entrada com mais
  palavras-chave, não a primeira que casar; o que ela não conhece vai para o
  Gemini pelo nível gratuito. Se a IA não responder (sem chave, cota do dia
  estourada ou sem internet), cai no texto de fallback — o bot nunca fica mudo
  na apresentação.
  - A chave mora **só no backend** (`config.properties` ou `GEMINI_API_KEY`),
    nunca no front, senão o Vite a embutiria no bundle.
  - **Nada do paciente é enviado ao modelo** — só a pergunta digitada e um texto
    fixo sobre o app. O nível gratuito do Gemini pode usar os prompts para
    treinar, então mandar prontuário ou exame para lá violaria a LGPD.
  - A rota exige JWT e limita 15 perguntas/minuto por paciente, para um endpoint
    aberto não virar proxy da cota gratuita.
  - O `ChatIA` usa o `HttpClient` do próprio JDK (Java 11+) e o `Json` do
    projeto — nenhuma biblioteca nova, como manda a regra do backend.
- **Dúvidas frequentes** (`Faq.jsx`, rota `/faq`, texto em
  `content/FaqContent.js`): sanfona com 28 perguntas em sete categorias — o item
  "Dúvidas frequentes" do menu "Mais" apontava para uma rota que não existia.
  As respostas descrevem o que o app faz **hoje** (dizem, por exemplo, que a
  redefinição de senha ainda não existe e que a tela de consultas só lista, não
  agenda); ao mudar um fluxo, revise o texto correspondente. A base local do
  chatbot é a outra ponta da mesma informação — mantenha as duas de acordo.

## O que falta

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
- Os avisos do Dashboard são só do titular (não olham dependentes) e não
  cruzam com a carteira de vacinação: as doses pendentes são calculadas no
  front, a partir da data de nascimento, e o banco não guarda quais doses
  foram aplicadas.
- Não existe fluxo de "esqueci minha senha" — o botão em `Login.jsx` é
  decorativo. O hash de senha também é SHA-256 sem salt (`SenhaUtil`).
- O chatbot **não conhece os dados do paciente** — ele explica o app e orienta,
  mas não responde "quando foi meu último exame?". Fazer isso exigiria mandar
  dado clínico para o modelo, o que o nível gratuito do Gemini não permite (usa
  os prompts para treinar); o caminho seria um modelo local (ex.: Ollama), aí
  nada sai da máquina.
- A chamada real ao Gemini ainda não foi testada de ponta a ponta: falta gerar
  a chave. As duas pontas (montagem do JSON e leitura da resposta) já foram
  validadas. Se a API responder 404, é só trocar `gemini.modelo` no
  `config.properties` — não precisa recompilar.
- O botão **"Rede de Saúde"** no Dashboard continua com um TODO, sem destino.

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

Para o chatbot usar IA (opcional — sem isso ele funciona só com as regras
locais), copie `backend-api/config.properties.example` para
`backend-api/config.properties` e cole uma chave gratuita do
[Google AI Studio](https://aistudio.google.com/apikey). O arquivo está no
`.gitignore`. A API precisa ser reiniciada depois de criar/alterar a chave.

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

Para a apresentação existe ainda o `database/seed-caio.sql`, com o histórico
clínico de demonstração da conta `caioastoria@gmail.com` (consultas passadas e
futuras, três coletas de sangue, exames de imagem e prontuário). Ele supõe que
o paciente já esteja cadastrado e **não toca nos dependentes**:

```bash
mysql -u root -p --default-character-set=utf8mb4 < database/seed-caio.sql
```

## Como me ajudar melhor

- Antes de mexer, leia os arquivos relacionados — não presuma o conteúdo.
- Mudanças pequenas e incrementais; explique o "porquê" em 1–2 linhas.
- Se eu pedir uma tela nova, siga o padrão visual e a estrutura das telas
  que já existem (`Vacinas.jsx` e `Dependentes.jsx` são boas referências).
- Ao terminar algo relevante, atualize as seções "O que já está pronto" e
  "O que falta" deste arquivo.
