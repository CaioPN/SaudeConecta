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
                        AcessoTemporario, AcessoLog, Aviso
    principal/Principal menu de console antigo (não serve o front)
    util/               Json (parser próprio), Jwt, SenhaUtil,
                        CodigoAcesso, ChatIA
database/             scripts SQL (schema, seeds)
demo/                 versão HTML de demonstração (arquivo único, sem build)
medical-app/          front-end React + Vite
  public/
  src/
    assets/           imagens, ícones
    components/       componentes reutilizáveis
      BottomNav.jsx     navegação inferior (mobile)
      MedicalChatbot.jsx
      Modal.jsx
      VLibras.jsx       acessibilidade em Libras
      BotaoPrivacidade.jsx  o "olhinho" que oculta dados sensíveis
      InfoField.jsx, StatusBadge.jsx, ResultRow.jsx  (exibição compartilhada)
    content/          textos estáticos (LegalContent, FaqContent)
    context/
      AuthContext.jsx   estado de autenticação global
      PrivacidadeContext.jsx  estado do "olhinho" (global, não persistido)
    data/             dados estáticos (calendário de vacinas do PNI)
    utils/            regras puras (faixa de referência, datas, linha do tempo)
                      icones.js — um ícone por assunto, usado por todas as telas
                      privacidade.js — máscaras do "olhinho"
    screens/          uma tela por rota
      Login.jsx, Cadastro.jsx
      Dashboard.jsx, Profile.jsx, PatientProfile.jsx
      Dependentes.jsx, Vacinas.jsx
      Appointments.jsx, Appointment.jsx, Exams.jsx, MedicalRecord.jsx
      AcessoMedico.jsx  (paciente gera o código)
      HistoricoAcessos.jsx  (trilha de auditoria do que o médico fez)
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
  `content/FaqContent.js`): sanfona com 33 perguntas em oito categorias — o item
  "Dúvidas frequentes" do menu "Mais" apontava para uma rota que não existia.
  As respostas descrevem o que o app faz **hoje** (dizem, por exemplo, que a
  redefinição de senha ainda não existe e que a tela de consultas só lista, não
  agenda); ao mudar um fluxo, revise o texto correspondente. A base local do
  chatbot é a outra ponta da mesma informação — mantenha as duas de acordo.
- **Rede de Saúde** (`RedeSaude.jsx`, rota `/rede-saude`, `services/redeSaude.js`,
  `UnidadeSaude`, `UnidadeSaudeDAO`, `util/CnesApi`, `util/Localizacao`, rota
  `GET /api/rede-saude`): lista as UBS, UPAs e prontos-socorros da cidade do
  paciente, da mais perto para a mais longe, com endereço, telefone, turno,
  filtro por tipo, "Como chegar" (abre a rota no app de mapas) e "Ligar".
  - Os dados vêm do **CNES** pelos dados abertos do Ministério da Saúde
    (`apidadosabertos.saude.gov.br`, pública e sem chave). Como ela devolve 20
    itens por requisição — São Paulo são 547 unidades, ~7 s de download —, o
    resultado fica na tabela `unidades_saude`, que é um espelho por município,
    não um dado do paciente. Município sem nada gravado busca na hora; município
    vencido (30 dias) devolve o que tem e renova numa thread daemon.
  - **Parte das coordenadas do CNES está errada**: em São Paulo, a UPA de Perus,
    a UPA III da Lapa e várias UBS da Brasilândia estão gravadas com a
    coordenada da Sé, embora o CEP delas esteja certo. Como caíam no meio da
    cidade, apareciam em primeiro lugar para quem mora perto do centro. O
    `UnidadeSaudeDAO.refinarCoordenadas` conserta isso com **duas travas**,
    porque nenhuma sozinha é segura:
    - só é suspeita a unidade **empilhada** com pelo menos outras três num raio
      de ~550 m (`MIN_VIZINHAS_SUSPEITAS`). Essa pilha é a assinatura do erro:
      em São Paulo ela pega as 17 certas em 547, os dez primeiros sendo
      exatamente os registros quebrados. Duas unidades no mesmo endereço
      existem de verdade (UBS Sé e AMA Sé), quatro de bairros diferentes não;
    - e a troca só acontece se o CEP discordar da coordenada por mais de 8 km
      (`LIMIAR_CORRECAO_KM`). O limiar é alto porque o CEP aponta a rua inteira
      e a do CNES aponta o prédio: a Rua Vergueiro tem 6 km, e o ponto do CEP
      dela fica a 3,5 km da UPA de mesmo nome. Com um limiar de 3 km, a UPA
      Vergueiro — que estava certa — era "corrigida" para pior.

    A coluna `cep_conferido` marca o que já passou pela conferência, então a
    passada nunca refaz trabalho e a renovação mensal do CNES não desfaz a
    correção (só zera a marca se o CEP da unidade mudou). Roda sempre em
    segundo plano, a 10 consultas por minuto: a API de CEP é gratuita e barra
    rajadas — medindo na mão, 1 consulta/s já é bloqueada por minutos, uma a
    cada 5 s passa. Como as não suspeitas são marcadas sem consultar, sobram
    ~17 consultas por cidade, uns 2 minutos.
  - A cidade sai **sempre do CEP do cadastro** (`Localizacao`). Já o ponto de
    partida da distância aceita `?lat=&lon=` do GPS do navegador; sem permissão,
    usa a coordenada do CEP. O cabeçalho da tela diz qual dos dois foi usado. A
    distância é Haversine — no SQL para ordenar, e em `Localizacao.distanciaKm`
    para o resto.
  - O `Localizacao` tenta três APIs de CEP, todas públicas e sem chave:
    **AwesomeAPI** (`cep.awesomeapi.com.br`), depois BrasilAPI, depois ViaCEP.
    Só a AwesomeAPI informa coordenada, e isso é proposital: a BrasilAPI
    devolve o **centroide do município**, igual para todos os CEPs da cidade
    (01310-100, da Paulista, e 02238-090, da zona norte, dão os mesmos
    -23.5475, -46.63611). Ordenar por ela colocaria a mesma UBS em primeiro
    lugar para a cidade inteira, então sem a AwesomeAPI é melhor ficar sem
    distância — a tela avisa quando não deu para calcular.
  - Sem mapa de propósito: seria uma biblioteca nova (Leaflet) para o que a
    lista ordenada já resolve. O "Como chegar" delega ao Google Maps por URL.
  - LGPD — a coordenada do GPS não é gravada nem logada: entra na query, ordena
    a lista e acaba ali. Do paciente, o que sai do backend para as APIs externas
    é só o CEP do cadastro; os outros CEPs consultados são das próprias
    unidades, dado público do CNES.
- **Acabamento em azul** (bloco "Detalhes em azul" no fim do `app.css`):
  bordas azul-claras nos cartões, filete à esquerda dos títulos de seção, fundo
  levemente azulado, ícones cinza que viraram azuis, borda superior na barra de
  navegação. Fica num bloco só no fim do arquivo, e não espalhado regra a
  regra, para dar para ver de relance o que é acabamento. Cuidado com a
  especificidade ao mexer: as regras contam com estar depois no arquivo, e quem
  usa cor com significado (`.vacina-item.tomada`, `.card.border-red`) precisa
  de exceção explícita.
- **Ocultar dados sensíveis — o "olhinho"** (`context/PrivacidadeContext.jsx`,
  `components/BotaoPrivacidade.jsx`, `utils/privacidade.js`): um botão no topo
  do Perfil, do Dashboard, dos Exames e do Prontuário troca os dados sensíveis
  por bolinhas. O estado é global — fechar o olho numa tela vale para todas —,
  **começa aberto** (o app existe para o paciente ver os próprios dados) e de
  propósito não é gravado em lugar nenhum, então recarregar a página volta ao
  normal. É proteção de tela (ombro alheio), não de dados: o valor continua
  vindo da API e mora no estado do React.
  - Nos exames, com o olho fechado somem também o marcador da régua e o selo de
    situação — a posição na barra e a cor do selo entregam o resultado mesmo com
    o número mascarado. Ficam visíveis o nome do exame, a faixa de referência,
    o local e o profissional, que não são dado pessoal. As campanhas de
    vacinação do Dashboard também ficam, por serem informação pública.
- **Navegação reorganizada** (`BottomNav.jsx`, `utils/icones.js`):
  - a barra inferior tem **4 abas** — Início, Minha Saúde, Rede e Mais — e a
    aba acende também nas telas filhas (`/exams`, `/vacinas`, `/appointment/12`
    etc. pertencem a "Minha Saúde"). Antes o teste era igualdade exata de rota,
    então a barra ficava toda apagada dentro das telas mais usadas;
  - `/patient` deixou de ser um segundo perfil (tinha o mesmo cabeçalho com
    avatar de `/profile`) e virou o **índice** "Minha Saúde", em lista, com
    Prontuário, Exames, Consultas, Vacinas e Dependentes. O Início ficou com
    quatro **atalhos** em grade — a regra é essa: grade = atalho do dia a dia,
    lista = índice completo com descrição;
  - o menu "Mais" ganhou um grupo **Privacidade** (acesso do médico, histórico
    de acessos, portal de privacidade, termos);
  - **um assunto, um ícone**: a escolha mora só em `utils/icones.js`. Antes o
    ícone `Users` (duas pessoas) representava "Exames/Registros" na barra e
    "Dependentes" nas telas, e o prontuário aparecia como "Dados da Consulta".
    Ao criar tela nova, pegue o ícone daquele mapa em vez de importar direto do
    lucide;
  - o botão flutuante do chatbot foi para o canto inferior **esquerdo**: o
    direito é disputado pelo menu "Mais" e pelo avatar do VLibras. Isso
    dispensou a regra `body.more-menu-open`, que empurrava o chatbot quando o
    menu abria.
- **Sair encerra a sessão de verdade** (`BottomNav.jsx`): o botão só navegava
  para `/`, e `sair()` do `AuthContext` não era chamado em lugar nenhum — o
  `sc_token` e o `sc_paciente` continuavam no `localStorage`, e o próximo a
  abrir o app num aparelho compartilhado entrava na conta.
- **Histórico de acessos** (`HistoricoAcessos.jsx`, rota `/acessos-log`,
  `modelos/AcessoLog`, `AcessoDAO.listarLogPorPaciente`, rota
  `GET /api/acessos/log`, `services/acessos.js`): a trilha de `acessos_log`
  finalmente aparece para o paciente — quem entrou com um código dele, o que
  fez (entrou, consultou o resumo, registrou consulta ou exame, ou a revogação
  feita por ele mesmo) e quando. O filtro é pelo dono do acesso no SQL
  (`a.paciente_id`), nunca por id vindo da URL, e a resposta traz no máximo
  `LIMITE_HISTORICO_ACESSOS` (100) linhas. A tela reaproveita a linha do tempo
  do prontuário e obedece ao olhinho no campo `detalhe`.
- **PDF de exames com senha** (`Exams.jsx`): o relatório baixado sai
  criptografado, e a senha são os **4 primeiros dígitos do CPF** do paciente.
  Usa a criptografia que o próprio jsPDF já traz (`encryption` no construtor),
  sem biblioteca nova. A senha do dono vai igual à do paciente porque o jsPDF
  usa string vazia quando ela é omitida — e senha de dono em branco abre o
  arquivo sozinha, anulando a proteção. Sem CPF no cadastro o PDF é gerado sem
  senha, e a tela avisa em vez de trancar o arquivo com uma senha que o
  paciente não conhece.
- **Versão HTML de demonstração** (`demo/`, gerada por `node demo/gerar.mjs`):
  o app inteiro — as telas do paciente e o portal do médico — num **arquivo
  só**, sem Node, sem Java e sem MySQL, para mostrar o projeto a quem não vai
  clonar o repositório. As rotas usam `#`, então funciona até aberto do disco.
  - Não é uma cópia paralela que envelhece sozinha: o `gerar.mjs` recorta dos
    originais o `app.css`, `utils/exames.js`, `utils/privacidade.js`,
    `utils/prontuario.js`, `data/vacinas.js`, `content/FaqContent.js`,
    `content/LegalContent.jsx` e a base de regras do `MedicalChatbot.jsx`, e
    embute o logotipo e os ícones do lucide em base64/SVG. Só a marcação das
    telas é escrita à mão, em JavaScript puro, no `app.template.html`.
    **Depois de mexer em algum desses arquivos, rode o `gerar.mjs` de novo.**
  - Tudo o que ela mostra é fictício e mora só na memória da página; o que
    depende do que não existe ali (PDF, mapa, ligação, IA do chatbot) avisa em
    vez de fingir que funcionou.
  - Cuidado com **nomes repetidos**: como tudo cai no mesmo escopo, o
    `formatarData` do `vacinas.js` (recebe `Date`) atropelava o do `exames.js`
    (recebe ISO) e derrubava três telas. O `gerar.mjs` renomeia esse, e o
    `demo/README.md` explica o resto.

## O que falta

- Exames e prontuário de **dependentes**: o banco e a API já aceitam
  (`dependente_id` nas tabelas, `?dependenteId=` nas rotas), mas as telas ainda
  mostram só o titular — falta o seletor de pessoa que a tela de Vacinas já tem.
  O acesso do médico também é só do titular por enquanto.
- O médico ainda não edita alergias, condições e medicações — só registra
  consultas e exames.
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
- A Rede de Saúde não agenda nada e é só do titular: não há vínculo entre a
  unidade e as consultas, e o paciente não escolhe uma UBS de referência. A
  tabela `unidades_saude` também não guarda as especialidades da unidade — o
  CNES tem esse dado em outro endpoint (`/cnes/estabelecimentos/{cnes}`).
- A conferência de coordenadas só sabe consertar o que tem cara de defeito
  (unidade empilhada ou coordenada arredondada). Uma unidade isolada com
  coordenada errada e 7 casas decimais passa batido — não há como saber sem
  consultar o CEP de todas, e a API gratuita não aguenta esse volume.
- O turno de atendimento é o que o CNES informa (manhã/tarde/noite ou 24 h),
  não o horário exato: a base não tem hora de abertura e fechamento.
- A senha do PDF de exames trava o arquivo contra leitura casual, não contra
  ataque: o jsPDF só implementa a criptografia antiga do PDF (RC4 de 40 bits,
  `/V 1 /R 2`) e a senha tem 4 dígitos — 10 mil combinações. Para valer como
  proteção de verdade seria preciso AES-256, que exigiria biblioteca nova ou
  gerar o PDF no backend.
- O olhinho ainda não chega às telas de Consultas, Dependentes e Vacinas, nem
  ao Portal do Médico (que é de outra pessoa, não do paciente).

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
