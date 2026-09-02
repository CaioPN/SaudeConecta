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
                        Exame, Prontuario, Acesso, Medico, Aviso, Auditoria,
                        UnidadeSaude, Notificacao, Familiar, Vacina
    db/Conexao          conexão JDBC com o MySQL
    modelos/            POJOs — Paciente, Dependente, Familiar, Medico,
                        Consulta, Prontuario, HistoricoMedico, Medicacao,
                        Alergia, Notificacao, Exame, ItemExame,
                        AcessoTemporario, AcessoLog, RegistroAuditoria, Aviso,
                        UnidadeSaude, DoseVacina
    principal/Principal menu de console antigo (não serve o front)
    util/               Json (parser próprio), Jwt, SenhaUtil,
                        CodigoAcesso, ChatIA, CarteiraVacinal (regras da
                        carteira), CnesApi, Localizacao
database/             scripts SQL (schema com migração no fim, seeds)
  gerar-calendario.mjs  reescreve o calendário do PNI no seed a partir do JS
demo/                 versão HTML de demonstração (arquivo único, sem build)
  app.template.html   marcação das telas, escrita à mão
  gerar.mjs           recorta os originais e monta o index.html
  gerar-icones.mjs    extrai os SVG do lucide para icones.js
  testar.mjs          teste de fumaça: roda cada tela num DOM de mentira
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
      SeletorPessoa.jsx  pílulas de titular/dependente nas telas clínicas
      InfoField.jsx, StatusBadge.jsx, ResultRow.jsx  (exibição compartilhada)
    content/          textos estáticos (LegalContent, FaqContent)
    context/
      AuthContext.jsx   estado de autenticação global
      PrivacidadeContext.jsx  estado do "olhinho" (global, não persistido)
      PessoasContext.jsx  de quem são os dados na tela (idem, não persistido)
    data/             vacinas.js — calendário do PNI. Hoje serve à DEMO e ao
                      seed; o app lê o calendário do banco (calendario_vacinal)
    utils/            regras puras (faixa de referência, datas, linha do tempo)
                      icones.js — um ícone por assunto, usado por todas as telas
                      privacidade.js — máscaras do "olhinho"
    screens/          uma tela por rota
      Login.jsx, Cadastro.jsx, RecuperarSenha.jsx
      Dashboard.jsx, Profile.jsx, PatientProfile.jsx
      Dependentes.jsx, Vacinas.jsx
      Appointments.jsx, Appointment.jsx, Exams.jsx, MedicalRecord.jsx
      AcessoMedico.jsx  (paciente gera o código)
      HistoricoAcessos.jsx  (trilha do médico + a do próprio paciente)
      PortalMedico.jsx  (médico usa o código — fora do app do paciente)
      Privacy.jsx, Terms.jsx, Faq.jsx
    services/         chamadas HTTP para a API (uma por assunto) — api (axios
                      com o JWT), avisos, consultas, exames, prontuario,
                      vacinas, familiares, notificacoes, acessos, auditoria,
                      medico, redeSaude, senha, perfil, chatbot
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
- Vacinas (`Vacinas.jsx`): carteira montada pela API a partir do calendário do
  PNI e da data de nascimento, com seletor de pessoa (titular + dependentes) e
  registro das doses aplicadas (ver o bloco da carteira mais abaixo). Só a
  lista de doses rola — cabeçalho, seletor e resumo ficam fixos —, e o ícone do
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
  `content/FaqContent.js`): sanfona com 51 perguntas em oito categorias — o item
  "Dúvidas frequentes" do menu "Mais" apontava para uma rota que não existia.
  As respostas descrevem o que o app faz **hoje** (dizem, por exemplo, que a
  tela de consultas só lista, não agenda, e explicam a conferência de três
  dados da recuperação de senha); ao mudar um fluxo, revise o texto
  correspondente. A base local do
  chatbot é a outra ponta da mesma informação — mantenha as duas de acordo.
- **Rede de Saúde** (`RedeSaude.jsx`, rota `/rede-saude`, `services/redeSaude.js`,
  `UnidadeSaude`, `UnidadeSaudeDAO`, `util/CnesApi`, `util/Localizacao`, rota
  `GET /api/rede-saude`): lista as UBS, UPAs e prontos-socorros da cidade do
  paciente, da mais perto para a mais longe, com endereço, telefone, turno,
  filtro por tipo, "Ver outra cidade", "Como chegar" (abre a rota no app de
  mapas) e "Ligar".
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
  - A cidade sai do **CEP do cadastro** (`Localizacao`) ou do **CEP pesquisado**
    em "Ver outra cidade" (`?cep=` na rota). Já o ponto de partida da distância
    aceita `?lat=&lon=` do GPS do navegador; sem permissão, usa a coordenada do
    CEP. O cabeçalho da tela diz qual dos dois foi usado. A distância é
    Haversine — no SQL para ordenar, e em `Localizacao.distanciaKm` para o resto.
  - **"Ver outra cidade"** existe porque a lista é da rede **municipal**: a
    busca do CNES é por município, então uma UBS de Guarulhos nunca apareceria
    para um cadastro de São Paulo, mesmo a poucos quarteirões — foi assim que a
    falta da UBS Jardim Vila Galvão apareceu. Com o CEP pesquisado o GPS é
    ignorado de propósito: medir a partir de onde o paciente está agora, em
    outra cidade, ordenaria a lista por uma distância que não é a que ele quer
    ver. A resposta traz `origem.escolhida` para a tela saber se está mostrando
    a cidade do cadastro ou uma pesquisada, e oferecer a volta.
  - A tela recebe as **60** unidades mais próximas (`LIMITE_PADRAO`). Eram 30, o
    que numa capital terminava a lista ainda no bairro vizinho.
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
  - Alcança hoje Perfil, Dashboard, Exames, Prontuário, Consultas (lista e
    detalhe), Dependentes, Vacinas e Histórico de acessos. Fora dele fica só o
    Portal do Médico, que mostra os dados de outra pessoa e é usado no
    consultório, não pelo titular.
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
- **Histórico de acessos e trilha de auditoria** (`HistoricoAcessos.jsx`, rota
  `/acessos-log`, `GET /api/auditoria`, `services/auditoria.js`): a tela mostra
  as **duas** trilhas do paciente numa linha do tempo só, com filtro
  "Tudo / Profissionais / Você".
  - O lado do **médico** é o de sempre (`acessos_log`, `modelos/AcessoLog`,
    `AcessoDAO.listarLogPorPaciente`): quem entrou com um código dele, o que
    fez e quando. A rota antiga `GET /api/acessos/log` continua existindo.
  - O lado do **paciente** é novo (tabela `auditoria`, `RegistroAuditoria`,
    `AuditoriaDAO`): `login`, `login_falhou`, `solicitou_senha`,
    `redefiniu_senha`, `consultou_prontuario`, `consultou_exames`,
    `consultou_consultas`, `exportou_exames`, `cadastrou_dependente`,
    `excluiu_dependente`, `cadastrou_contato`, `excluiu_contato` e
    `gerou_codigo` — ou seja, as quatro operações que a governança pede
    (consulta sensível, exportação, exclusão de registro e concessão de
    permissão) mais os eventos de autenticação e de troca de senha.
    Quando a leitura é de um dependente, o `detalhe` diz o primeiro nome dele.
  - **A gravação passa por uma fila.** `AuditoriaDAO.registrar` não escreve no
    banco: enfileira (`ArrayDeque`, FIFO) e volta na hora; uma thread daemon
    consome. Auditar não pode atrasar o atendimento nem derrubar a resposta se
    o banco engasgar. Ter um só consumidor também dá de graça o agrupamento das
    leituras — `consultou_exames` repetido dentro de `MINUTOS_AGRUPAMENTO`
    (10) não vira linha nova, senão cada montagem de tela do React geraria uma.
    O preço: a fila é memória, então um `kill` com registros pendentes os
    perde. Vale para a trilha do paciente, não para a do médico, que continua
    sendo gravada na hora pelo `AcessoDAO`.
  - **A intercalação usa duas filas.** Como cada lado já chega ordenado do
    banco, `ApiServer.listarAuditoria` transforma as duas listas em `Deque` e a
    cada rodada tira a frente da mais recente — passa uma vez por cada lista,
    em vez de concatenar e reordenar. As datas são ISO, então a comparação é
    de texto (`maisRecente`).
  - **Exportar PDF é auditado por uma rota própria**
    (`POST /api/exames/exportacao`): o arquivo nasce no navegador (jsPDF), o
    servidor não saberia que existiu. Do cliente vem só a contagem; o nome da
    ação é fixado no backend, então ninguém escreve ação inventada na própria
    trilha.
  - LGPD: o `detalhe` nunca recebe diagnóstico, resultado, CPF ou cartão do
    SUS — guarda contagem e **primeiro nome** (`ApiServer.primeiroNome`).
    Grava-se o IP de origem (`origem_ip`) para o paciente reconhecer um acesso
    que não foi ele; ele só é visível para o próprio titular e obedece ao
    olhinho. Login com e-mail inexistente não gera registro: não há dono a quem
    mostrar. Os dois SELECTs filtram pelo paciente do JWT, nunca por id de URL,
    e devolvem no máximo `LIMITE_HISTORICO_ACESSOS` (100) linhas.
- **PDF de exames com senha** (`Exams.jsx`): o relatório baixado sai
  criptografado, e a senha são os **4 primeiros dígitos do CPF** do paciente.
  Usa a criptografia que o próprio jsPDF já traz (`encryption` no construtor),
  sem biblioteca nova. A senha do dono vai igual à do paciente porque o jsPDF
  usa string vazia quando ela é omitida — e senha de dono em branco abre o
  arquivo sozinha, anulando a proteção. Sem CPF no cadastro o PDF é gerado sem
  senha, e a tela avisa em vez de trancar o arquivo com uma senha que o
  paciente não conhece.
- **Seletor de pessoa nas telas clínicas** (`context/PessoasContext.jsx`,
  `components/SeletorPessoa.jsx`): Exames, Consultas, Prontuário e Vacinas
  passaram a mostrar os dados do titular **ou de um dependente**. O banco e as
  rotas já aceitavam `?dependenteId=`; o que faltava era a tela.
  - A escolha é **global**: quem abriu o app para cuidar do filho não reescolhe
    a pessoa em cada tela. Como a do olhinho, ela não é gravada — recarregar a
    página volta para o titular, que é o dono da conta.
  - A lista de dependentes é buscada uma vez pelo contexto, e não uma vez por
    tela. O `Vacinas.jsx`, que tinha o seletor próprio, passou a usar o
    compartilhado; `Dependentes.jsx` avisa o contexto (`recarregar`) quando
    cadastra ou exclui alguém.
  - O seletor some sozinho quando não há dependente: uma pílula só, escrita
    "você", não é escolha nenhuma.
- **Esqueci minha senha** (`RecuperarSenha.jsx`, rota `/recuperar-senha`,
  `services/senha.js`, `POST /api/auth/recuperar` e `/api/auth/redefinir`): o
  botão do login era decorativo. Não há serviço de e-mail no projeto, então
  quem prova a identidade é a **conferência de três dados do cadastro**
  (e-mail, CPF e data de nascimento).
  - Conferindo os três, volta um token de 15 minutos que só serve para trocar a
    senha; ele fica no estado da tela e **nunca** no `localStorage`.
  - O hash da senha vigente entra no token (`marcaDaSenha`), então um token que
    sobrou de uma recuperação anterior morre assim que a senha muda.
  - A resposta de erro não diz qual campo errou nem se o e-mail existe — seria
    um jeito de descobrir quem usa o app. As tentativas por IP são limitadas.
  - As duas pontas são auditadas (`solicitou_senha` e `redefiniu_senha`), para
    o paciente ver no histórico se alguém tentou trocar a senha no lugar dele.
- **Notificações** (`Notificacao`, `NotificacaoDAO`, `GET /api/notificacoes`,
  `POST /api/notificacoes/{id}/lida` e `/lidas`, `services/notificacoes.js`):
  card **"Novidades"** no Dashboard com o que aconteceu na conta enquanto o
  paciente não estava olhando — um médico registrou consulta, exame ou item de
  prontuário pelo acesso temporário.
  - Não confundir com os **avisos**: aviso é calculado na hora a partir dos
    exames e das consultas e não tem linha no banco; notificação é um fato que
    aconteceu uma vez e fica gravado, com `lida_em`.
- **Contatos de emergência** (`Familiar`, `FamiliarDAO`, `GET/POST /api/familiares`,
  `DELETE /api/familiares/{id}`, `services/familiares.js`): quem avisar se algo
  acontecer com o paciente, cadastrado no Perfil. São dados de **outra pessoa**,
  então de propósito não entram no resumo enviado ao médico pelo acesso
  temporário — quem consentiu com o cadastro foi o paciente, não o familiar.
- **O médico edita o prontuário** (`POST /api/medico/prontuario`,
  `DELETE /api/medico/prontuario/{tipo}/{id}`, `PortalMedico.jsx`): antes ele
  registrava consulta e exame, mas uma alergia descoberta na consulta não tinha
  onde ser anotada. Agora registra e remove **alergia, condição acompanhada e
  medicação em uso**, sempre exigindo o escopo de escrita do código e caindo na
  trilha de auditoria do paciente como as outras ações.
- **Carteira de vacinação de verdade** (tabelas `calendario_vacinal` e
  `vacinas_aplicadas`, `VacinaDAO`, `util/CarteiraVacinal`, rotas
  `GET/POST /api/vacinas` e `DELETE /api/vacinas/{doseId}`,
  `services/vacinas.js`): a tela **adivinhava**. Toda dose com data prevista no
  passado aparecia como tomada, então a criança que não foi ao posto ficava
  "em dia" — o oposto de um alerta útil.
  - Agora são **três estados**: `aplicada` (alguém registrou), `atrasada` (a
    data recomendada passou e ninguém registrou) e `prevista`. Quem confirma a
    dose é o paciente, pelo botão da tela, ou o médico com escopo de escrita.
  - O **calendário do PNI foi para o banco**. Ele tem dois leitores — a tela e
    o `AvisoDAO`, que conta as doses atrasadas — e duas cópias, uma em JS e
    outra em Java, sairiam do ar uma da outra no primeiro ajuste do Ministério.
    O seed é **gerado** a partir de `data/vacinas.js` por
    `node database/gerar-calendario.mjs --gravar`, que reescreve o bloco entre
    os marcadores `<calendario-vacinal>` do `seed.sql`. A lista JS continua
    sendo a fonte porque a demonstração (sem backend) também precisa dela:
    mexa no JS e rode o gerador, nunca o contrário.
  - `vacinas_aplicadas` **não tem chave única**, e isso é limitação do MySQL:
    `dependente_id` é NULL no titular, NULLs não colidem em índice único, e a
    coluna gerada que resolveria isso é proibida junto com `ON DELETE CASCADE`.
    Quem garante uma linha por dose é o `VacinaDAO`, que apaga antes de gravar,
    numa transação.
- **Avisos da casa inteira** (`AvisoDAO`): o Dashboard olhava só o titular.
  Agora cada dependente entra com as três regras que a pessoa responsável
  precisa ver sem abrir tela nenhuma — consulta chegando, resultado alterado e
  dose de vacina atrasada. As regras de "faz tempo que não faz exame" ficam só
  no titular: criança saudável não faz exame de rotina, e o aviso viraria ruído
  permanente. Cada aviso carrega `pessoa` (primeiro nome, null = titular), e a
  tela mostra isso como etiqueta.
  - O atraso de vacina é contado **em SQL**, no próprio AvisoDAO, e não em Java:
    ali só interessa a contagem, e trazer as 26 doses para contar as vencidas
    seria buscar dado à toa a cada Dashboard. É a mesma regra do
    `CarteiraVacinal` — ao mudar o critério de atraso, mude nos dois.
  - Só o calendário infantil tem idade recomendada, então o adulto praticamente
    não gera aviso de vacina; a conferência de faixa etária existe porque sem
    ela o titular aparecia com o calendário da criança inteiro "em atraso".
- **Acesso do médico a um dependente** (`acessos_temporarios.dependente_id`):
  o código sempre é gerado pelo titular, que é quem responde pela conta, mas
  agora ele escolhe **de quem é o prontuário** que aquele código abre — o mesmo
  `SeletorPessoa` das telas clínicas. O portal do médico mostra o nome do
  dependente, a idade dele e quem é o responsável, e o que o médico registra
  (consulta, exame, alergia, condição, medicação) cai no prontuário certo.
- **Contatos de emergência para o médico, com consentimento**
  (`acessos_temporarios.compartilha_contatos`): nome e telefone de um familiar
  são dados de **outra pessoa**, que nunca consentiu com nada aqui. Por isso a
  opção existe, vem **desmarcada** e é decidida a cada código gerado; quando
  usada, a leitura dos contatos entra na trilha do acesso (`leu_contatos`).
- **Edição de perfil** (`PUT /api/auth/me`, `services/perfil.js`): o paciente
  corrige **telefone e endereço**. Nome, CPF, data de nascimento, gênero, tipo
  sanguíneo e e-mail continuam travados: os cinco primeiros identificam a
  pessoa no atendimento (tipo sanguíneo errado num pronto-socorro é o pior erro
  possível neste app) e o e-mail é a chave do login e da recuperação de senha.
  A alteração é auditada (`atualizou_perfil`) dizendo **o que** mudou, nunca o
  valor antigo nem o novo.
- **Senha com salt** (`SenhaUtil`): era SHA-256 puro. O SHA-256 é rápido de
  propósito — uma placa de vídeo testa bilhões de tentativas por segundo — e
  sem salt duas pessoas com a mesma senha ficavam com o mesmo hash, o que
  entrega senha repetida num vazamento e deixa uma tabela pronta resolver as
  senhas comuns de uma vez. Agora é **PBKDF2-HMAC-SHA-256, 210 mil iterações e
  salt por conta** (tudo da biblioteca padrão do Java).
  - O formato gravado é `pbkdf2$<iterações>$<salt>$<hash>`: as iterações vão
    junto para que aumentá-las no futuro não invalide as senhas já gravadas.
  - As contas antigas **não foram trancadas do lado de fora**: `verificar`
    ainda aceita o hash velho, e o login regrava no formato novo
    (`migrarHashSeNecessario`). A migração acontece sozinha, na primeira
    entrada, sem ninguém trocar de senha. O seed continua com o hash antigo de
    propósito, para esse caminho continuar sendo exercitado.
  - O `CodigoAcesso` **não** usa o SenhaUtil: o código do médico é procurado no
    banco por igualdade de hash (`WHERE codigo_hash = ?`), e um salt por linha
    tornaria a busca impossível. Ele tem SHA-256 próprio, e o que compensa a
    falta de salt é o segredo ser sorteado, de 8 caracteres, válido por 30
    minutos e de uso único.
- **Notificações automáticas** (`notificacoes.chave`,
  `NotificacaoDAO.criarSeNova`, `ApiServer.gerarLembretes`): antes só nascia
  notificação do que o médico registrava. Agora a consulta agendada vira
  **lembrete** um ou dois dias antes, do titular ou de um dependente.
  - Lembrete não é aviso: aviso é derivado e some sozinho quando o motivo
    acaba; lembrete é um fato datado que precisa sobreviver ao motivo — quem
    perdeu a consulta de ontem tem que continuar vendo que foi avisado.
  - A chave (`consulta_proxima:42`) mais o índice único garantem uma linha por
    consulta, e não uma por visita ao app.
  - Ele é gerado na **leitura** de `/api/notificacoes`, e não numa thread de
    fundo: não há push nem serviço fora da requisição, e um agendador varrendo
    todos os pacientes trabalharia para avisar quem talvez nem abra o app.
- **Rede de Saúde: o que tem lá, minha UBS e a cidade vizinha**
  - `GET /api/rede-saude/unidades/{cnes}` traz **o que a unidade oferece**
    (24 h, internação, centro cirúrgico, obstétrico, neonatal, serviço de
    apoio), do endpoint por estabelecimento do CNES, guardado por 90 dias na
    coluna `servicos`. **Não são especialidades**: o CNES não publica a lista de
    especialidades por estabelecimento nesta API — o que ele publica é a
    estrutura da unidade, e é isso que a tela mostra. A busca é sob demanda,
    quando alguém toca em "O que tem lá": são 547 chamadas para uma capital se
    fosse feita na listagem.
  - `POST /api/rede-saude/referencia` guarda a **UBS de referência** do paciente
    (`pacientes.unidade_referencia`). Só o código do CNES é gravado, porque é
    dado público e assim a escolha não envelhece junto com o espelho.
  - A lista passou a incluir unidades de **outros municípios dentro de 12 km**
    (`RAIO_VIZINHANCA_KM`), marcadas como "cidade vizinha", sem precisar saber
    quais cidades fazem divisa: a caixa de latitude/longitude corta o espelho
    barato e o `HAVING` aplica o raio. O município vizinho precisa já estar
    espelhado — quem nunca foi pesquisado continua saindo por "Ver outra
    cidade".
  - `consultas.unidade_cnes` liga a consulta à unidade, e a tela de detalhe
    oferece "Como chegar" pela coordenada oficial em vez do texto livre.
  - **A tabela deixou de crescer para sempre**: `municipios_espelhados` guarda
    quando cada município foi pedido, e uma faxina em segundo plano apaga do
    espelho quem ninguém abre há 180 dias. A marca não pôde ficar em
    `unidades_saude` porque aquela tabela tem `ON UPDATE CURRENT_TIMESTAMP`, e
    um UPDATE por visita faria o cache do CNES parecer sempre novo.
- **Trilha de auditoria por pessoa** (`auditoria.dependente_id`): a linha
  continua pertencendo ao titular — é ele quem responde pela conta e quem vê a
  trilha —, mas agora diz de quem era o dado. A tela ganhou um segundo filtro,
  por pessoa, montado a partir dos próprios registros (um dependente já
  excluído continua na trilha, e sumir com ele esconderia o que foi feito).
  Ações novas: `consultou_vacinas`, `registrou_vacina`, `removeu_vacina`,
  `atualizou_perfil` e `definiu_referencia`.
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
  - Acompanha as telas do app: a trilha do paciente com os filtros
    "Tudo / Profissionais / Você" e por pessoa, o seletor de pessoa em Exames,
    Consultas, Prontuário e Vacinas, o card "Novidades" do Dashboard (com
    lembrete de consulta), os contatos de emergência do Perfil, a recuperação
    de senha, a carteira com os três estados e o botão de registrar dose, a
    edição de contato e endereço, o código de acesso por pessoa com os contatos
    opcionais, e a Rede de Saúde com "O que tem lá", "Definir como minha" e a
    unidade de cidade vizinha.
  - `node demo/testar.mjs` é o teste de fumaça: monta um DOM de mentira e
    chama cada tela em três cenários. A demo não tem build nem lint, então uma
    função renomeada num lugar e esquecida em outro só apareceria na hora de
    mostrar o projeto. Rode depois do `gerar.mjs`.
  - Tudo o que ela mostra é fictício e mora só na memória da página; o que
    depende do que não existe ali (PDF, mapa, ligação, IA do chatbot) avisa em
    vez de fingir que funcionou.
  - Cuidado com **nomes repetidos**: como tudo cai no mesmo escopo, o
    `formatarData` do `vacinas.js` (recebe `Date`) atropelava o do `exames.js`
    (recebe ISO) e derrubava três telas. O `gerar.mjs` renomeia esse, e o
    `demo/README.md` explica o resto.

## O que falta

- A recuperação de senha prova a identidade conferindo três dados do cadastro.
  Sem serviço de e-mail é o mais forte que dá para fazer aqui, mas continua
  sendo mais fraco que um link na caixa de entrada: quem souber e-mail, CPF e
  data de nascimento da pessoa passa.
- O registro de vacina é **declaratório**: quem confirma a dose é o paciente ou
  o médico com acesso de escrita. Não há ligação com o sistema do posto (o
  OpenDataSUS publica doses agregadas, não o histórico de uma pessoa), então
  uma carteira em branco pode significar "ninguém marcou" e não "ninguém
  tomou".
- O calendário do PNI existe em dois lugares: a tabela `calendario_vacinal`
  (usada pelo app) e `data/vacinas.js` (usado pela demonstração, que não tem
  backend). O gerador (`database/gerar-calendario.mjs`) mantém o seed em dia a
  partir do JS, mas ninguém obriga a rodá-lo — não há verificação automática de
  que o banco e o arquivo estão iguais.
- O chatbot **não conhece os dados do paciente** — ele explica o app e orienta,
  mas não responde "quando foi meu último exame?". Fazer isso exigiria mandar
  dado clínico para o modelo, o que o nível gratuito do Gemini não permite (usa
  os prompts para treinar); o caminho seria um modelo local (ex.: Ollama), aí
  nada sai da máquina.
- A chamada real ao Gemini ainda não foi testada de ponta a ponta: falta gerar
  a chave. As duas pontas (montagem do JSON e leitura da resposta) já foram
  validadas. Se a API responder 404, é só trocar `gemini.modelo` no
  `config.properties` — não precisa recompilar.
- A Rede de Saúde **não agenda nada**: a tela mostra a unidade, o telefone e a
  rota, e o agendamento é feito com a unidade. A consulta já pode apontar para
  uma unidade (`consultas.unidade_cnes`), mas quem preenche isso é o médico
  pelo portal — o paciente não marca nada por aqui.
- O que o app mostra da unidade é a **estrutura** dela (24 h, internação,
  centro cirúrgico), não as especialidades atendidas: esta API do CNES não
  publica especialidade por estabelecimento.
- A vizinhança de 12 km só enxerga município **já espelhado**. A cidade vizinha
  que ninguém pesquisou continua invisível até alguém buscá-la em "Ver outra
  cidade" — descobrir quais municípios fazem divisa exigiria uma base de
  coordenadas de municípios que nenhuma API pública oferece pronta.
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
- A trilha de auditoria mostra a ação e a pessoa, mas nunca o **valor** que
  mudou: um "atualizou_perfil · telefone" não diz qual era o telefone antes.
  É proposital (a trilha é lida na tela do celular), mas significa que ela não
  serve para desfazer nada.
- As **notificações** cobrem o que o médico registra e o lembrete de consulta.
  Não existe lembrete de exame a vencer nem de dose de vacina: os dois não têm
  um dia marcado, e viram aviso (recalculado) em vez de linha no banco.
- Os **contatos de emergência** não avisam ninguém: eles são mostrados ao
  médico quando o paciente autoriza, mas não existe envio de mensagem — isso
  exigiria um serviço de SMS ou e-mail, que o projeto não tem.
- O acesso do médico continua **só de leitura e registro clínico**: ele não
  edita o cadastro do paciente nem marca vacina de quem não é o dono do
  código.

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
- **Dado de terceiro é opt-in.** Contato de emergência é nome e telefone de
  outra pessoa, que nunca consentiu com nada aqui: ele só sai do app quando o
  paciente marca a opção, uma vez por código gerado — nunca por padrão.
- **Alterar dado de identificação não é edição de cadastro.** Nome, CPF, data
  de nascimento, gênero e tipo sanguíneo não são editáveis pela tela: são o que
  identifica a pessoa no atendimento, e tipo sanguíneo errado num
  pronto-socorro é o pior erro possível neste app. O e-mail fica de fora pelo
  outro motivo — é a chave do login e da recuperação de senha.
- **Hash de senha e hash de código são coisas diferentes.** Senha usa PBKDF2
  com salt (`SenhaUtil`), porque a conferência é contra a linha do dono, que já
  se conhece pelo e-mail. Código de acesso usa SHA-256 puro (`CodigoAcesso`),
  porque ele é PROCURADO por igualdade de hash e um salt por linha tornaria a
  busca impossível. Não unifique os dois.
- **Migração de schema vai no fim do `schema.sql`.** `CREATE TABLE IF NOT
  EXISTS` não altera tabela que já existe, e o MySQL não tem `ADD COLUMN IF NOT
  EXISTS` — o arquivo termina com um procedimento que confere o
  INFORMATION_SCHEMA antes de alterar. Coluna nova entra nos dois lugares: na
  definição da tabela (para instalação limpa) e numa linha `CALL
  sc_adicionar_coluna(...)` (para quem já tem o banco).

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
é obrigatório, senão o mysql.exe grava os acentos corrompidos. Os dois scripts
são **idempotentes**: dá para rodar quantas vezes quiser, e é assim que as
colunas novas chegam a um banco que já existe (ver a seção de migração no fim
do `schema.sql`):

```bash
mysql -u root -p --default-character-set=utf8mb4 < database/schema.sql
mysql -u root -p --default-character-set=utf8mb4 < database/seed.sql
```

Login de teste do seed: `gabriel@gmail.com` / `Teste@123`. A senha dele está
gravada no formato **antigo** de propósito: a primeira entrada exercita a
migração do hash para PBKDF2 (ver `SenhaUtil.precisaAtualizar`).

Se o calendário de vacinação mudar, mexa em `medical-app/src/data/vacinas.js` e
regenere o bloco do seed:

```bash
node database/gerar-calendario.mjs --gravar
```

Para a apresentação existe ainda o `database/seed-caio.sql`, com o histórico
clínico de demonstração da conta `caioastoria@gmail.com` (consultas passadas e
futuras, três coletas de sangue, exames de imagem e prontuário). Ele supõe que
o paciente já esteja cadastrado e **não toca nos dependentes**:

```bash
mysql -u root -p --default-character-set=utf8mb4 < database/seed-caio.sql
```

Demonstração (`demo/`), depois de mexer em qualquer arquivo que ela recorta:

```bash
node demo/gerar-icones.mjs   # só quando um ícone novo é usado na demo
node demo/gerar.mjs          # regenera demo/index.html
node demo/testar.mjs         # teste de fumaça: 18 telas x 3 cenários
```

O `testar.mjs` monta um DOM de mentira e chama cada tela. A demo é escrita à
mão e não tem build nem lint, então uma função renomeada num lugar e esquecida
em outro só apareceria na hora de mostrar o projeto para alguém.

## Como conferir uma mudança de verdade

Compilar não é testar. O caminho que pega o que o compilador não pega:

1. `javac` e `vite build` — erro de sintaxe e import quebrado.
2. Aplicar o `schema.sql` no MySQL. **É aqui que aparece erro de FK**: o MySQL
   recusa `ON DELETE CASCADE` numa coluna que serve de base para coluna gerada
   (erro 1215), e isso derrubou a chave única de `vacinas_aplicadas`.
3. Subir a API e exercitar a rota com `curl`, conferindo o efeito no banco.
   Foi assim que apareceram os dois erros mais sérios da última leva: o
   `CodigoAcesso` herdando o hash salgado (que quebraria o acesso do médico
   inteiro) e o titular adulto aparecendo com o calendário infantil em atraso.
4. `node demo/testar.mjs` para a versão de demonstração.

Cuidado ao testar por `curl` no Git Bash: acento em argumento chega corrompido
ao banco. Para validar texto com acento, use o navegador. E os dados que o
teste criar precisam ser apagados depois — o banco local é o mesmo da
apresentação.

## Como me ajudar melhor

- Antes de mexer, leia os arquivos relacionados — não presuma o conteúdo.
- Mudanças pequenas e incrementais; explique o "porquê" em 1–2 linhas.
- Se eu pedir uma tela nova, siga o padrão visual e a estrutura das telas
  que já existem (`Vacinas.jsx` e `Dependentes.jsx` são boas referências).
- Ao terminar algo relevante, atualize as seções "O que já está pronto" e
  "O que falta" deste arquivo — e o FAQ (`content/FaqContent.js`) e a base de
  regras do chatbot (`MedicalChatbot.jsx`), que são a mesma informação escrita
  para o paciente. Os três saem do ar um do outro com facilidade.
- Não faça `git push`: eu decido quando publicar.
