-- SaúdeConecta — Estrutura do banco de dados (MySQL)
-- Execute este arquivo primeiro (cria o banco e as tabelas).

CREATE DATABASE IF NOT EXISTS saudeconecta
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE saudeconecta;

-- Pacientes (usuário principal, com acesso ao app)
CREATE TABLE IF NOT EXISTS pacientes (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  nome             VARCHAR(120)  NOT NULL,
  email            VARCHAR(160)  NOT NULL UNIQUE,
  telefone         VARCHAR(20)   NOT NULL,
  cpf              VARCHAR(11)   NOT NULL UNIQUE,
  genero           VARCHAR(20)   NOT NULL,
  tipo_sanguineo   VARCHAR(3)    NOT NULL,
  senha_hash       VARCHAR(255)  NOT NULL,
  data_nascimento  DATE          NOT NULL,
  -- Endereço
  cep              VARCHAR(9),
  rua              VARCHAR(160),
  numero           VARCHAR(20),
  bairro           VARCHAR(120),
  cidade           VARCHAR(120),
  estado           VARCHAR(2),
  -- UBS que o paciente escolheu como referência (unidades_saude.codigo_cnes).
  -- Sem FK de propósito: unidades_saude é um espelho do CNES que pode ser
  -- limpo e recarregado, e perder a escolha do paciente junto seria pior do
  -- que guardar um código que talvez não esteja espelhado agora.
  unidade_referencia INT         NULL,
  criado_em        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- Dependentes (subusuários) — pertencem a um paciente e NÃO têm acesso próprio
CREATE TABLE IF NOT EXISTS dependentes (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id      INT           NOT NULL,
  nome             VARCHAR(120)  NOT NULL,
  cpf              VARCHAR(11)   NOT NULL,
  genero           VARCHAR(20)   NOT NULL,
  tipo_sanguineo   VARCHAR(3)    NOT NULL,
  data_nascimento  DATE          NOT NULL,
  criado_em        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dependente_paciente
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
);

-- ============================================================
--  Dados clínicos
--  Convenção: paciente_id é sempre o dono da conta. dependente_id
--  NULL significa "dado do titular"; preenchido significa que o
--  registro pertence àquele dependente.
-- ============================================================

-- Médicos que atendem / solicitam exames
CREATE TABLE IF NOT EXISTS medicos (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  nome             VARCHAR(120)  NOT NULL,
  especialidade    VARCHAR(80)   NOT NULL,
  crm              VARCHAR(20)   NOT NULL UNIQUE,
  telefone         VARCHAR(20)
);

-- Consultas (agendadas ou já realizadas)
CREATE TABLE IF NOT EXISTS consultas (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id      INT           NOT NULL,
  dependente_id    INT           NULL,
  medico_id        INT           NOT NULL,
  data             DATE          NOT NULL,
  hora             TIME          NOT NULL,
  local            VARCHAR(160)  NOT NULL,
  motivo           VARCHAR(160)  NOT NULL,
  status           VARCHAR(20)   NOT NULL DEFAULT 'agendada',
  -- Unidade da Rede de Saúde onde a consulta acontece (codigo_cnes), quando
  -- ela foi escolhida da lista. `local` continua sendo o texto livre, porque
  -- consulta em consultório particular não tem CNES espelhado aqui.
  unidade_cnes     INT           NULL,
  resumo           TEXT          NULL,
  conduta          TEXT          NULL,
  -- Autoria: acesso temporário que registrou o dado (NULL = veio do seed/paciente).
  -- Sem FK de propósito: a tabela acessos_temporarios é criada mais abaixo e o
  -- vínculo aqui serve para auditoria, não para integridade.
  acesso_id        INT           NULL,
  criado_em        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_consulta_paciente
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
  CONSTRAINT fk_consulta_dependente
    FOREIGN KEY (dependente_id) REFERENCES dependentes(id) ON DELETE CASCADE,
  CONSTRAINT fk_consulta_medico
    FOREIGN KEY (medico_id) REFERENCES medicos(id)
);

-- Exames. Uma linha = uma coleta de sangue OU um exame de imagem.
CREATE TABLE IF NOT EXISTS exames (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id      INT           NOT NULL,
  dependente_id    INT           NULL,
  medico_id        INT           NULL,          -- quem solicitou
  consulta_id      INT           NULL,          -- consulta que originou o pedido
  tipo             VARCHAR(10)   NOT NULL,      -- 'sangue' | 'imagem'
  data             DATE          NOT NULL,
  local            VARCHAR(160)  NOT NULL,      -- laboratório ou setor de imagem
  nome             VARCHAR(160)  NULL,          -- só para exames de imagem
  laudo            TEXT          NULL,          -- só para exames de imagem
  acesso_id        INT           NULL,          -- autoria (ver comentário em consultas)
  criado_em        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_exame_paciente
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
  CONSTRAINT fk_exame_dependente
    FOREIGN KEY (dependente_id) REFERENCES dependentes(id) ON DELETE CASCADE,
  CONSTRAINT fk_exame_medico
    FOREIGN KEY (medico_id) REFERENCES medicos(id),
  CONSTRAINT fk_exame_consulta
    FOREIGN KEY (consulta_id) REFERENCES consultas(id) ON DELETE SET NULL
);

-- Itens de um exame de sangue (um resultado por linha)
CREATE TABLE IF NOT EXISTS exame_itens (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  exame_id         INT           NOT NULL,
  nome             VARCHAR(120)  NOT NULL,
  valor            DECIMAL(10,2) NOT NULL,
  unidade          VARCHAR(20)   NOT NULL,
  ref_min          DECIMAL(10,2) NOT NULL,
  ref_max          DECIMAL(10,2) NOT NULL,
  ordem            INT           NOT NULL DEFAULT 0,
  CONSTRAINT fk_item_exame
    FOREIGN KEY (exame_id) REFERENCES exames(id) ON DELETE CASCADE
);

-- Alergias registradas no prontuário
CREATE TABLE IF NOT EXISTS alergias (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id      INT           NOT NULL,
  dependente_id    INT           NULL,
  descricao        VARCHAR(160)  NOT NULL,
  CONSTRAINT fk_alergia_paciente
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
  CONSTRAINT fk_alergia_dependente
    FOREIGN KEY (dependente_id) REFERENCES dependentes(id) ON DELETE CASCADE
);

-- Condições / histórico médico (ex.: hipertensão)
CREATE TABLE IF NOT EXISTS condicoes (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id      INT           NOT NULL,
  dependente_id    INT           NULL,
  descricao        VARCHAR(160)  NOT NULL,
  desde            DATE          NULL,
  CONSTRAINT fk_condicao_paciente
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
  CONSTRAINT fk_condicao_dependente
    FOREIGN KEY (dependente_id) REFERENCES dependentes(id) ON DELETE CASCADE
);

-- ============================================================
--  Acesso temporário do médico
--  O paciente gera um código de curta duração; o médico troca esse
--  código por um token para ler e alimentar os dados daquele paciente.
--  O código NUNCA é gravado em texto puro — só o hash SHA-256.
-- ============================================================
CREATE TABLE IF NOT EXISTS acessos_temporarios (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id      INT           NOT NULL,
  codigo_hash      CHAR(64)      NOT NULL UNIQUE,
  escopo           VARCHAR(20)   NOT NULL DEFAULT 'leitura', -- 'leitura' | 'escrita'
  -- De quem são os dados que este código abre: NULL = titular, preenchido =
  -- aquele dependente. O código é sempre gerado pelo titular, que é quem
  -- responde pelo dependente; o que muda é o prontuário que o médico vê.
  dependente_id    INT           NULL,
  -- Contato de emergência é dado de outra pessoa, então só vai para o médico
  -- se o paciente marcar isso ao gerar o código (opt-in, nunca por padrão).
  compartilha_contatos TINYINT(1) NOT NULL DEFAULT 0,
  criado_em        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  expira_em        DATETIME      NOT NULL,
  usado_em         DATETIME      NULL,   -- quando o médico trocou o código pelo token
  revogado_em      DATETIME      NULL,   -- revogação manual pelo paciente
  medico_id        INT           NULL,   -- preenchido no momento do uso
  CONSTRAINT fk_acesso_paciente
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
  CONSTRAINT fk_acesso_dependente
    FOREIGN KEY (dependente_id) REFERENCES dependentes(id) ON DELETE CASCADE,
  CONSTRAINT fk_acesso_medico
    FOREIGN KEY (medico_id) REFERENCES medicos(id)
);

-- Trilha de auditoria: o que cada acesso fez enquanto esteve válido
CREATE TABLE IF NOT EXISTS acessos_log (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  acesso_id        INT           NOT NULL,
  acao             VARCHAR(60)   NOT NULL,
  detalhe          VARCHAR(255)  NULL,
  criado_em        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_log_acesso
    FOREIGN KEY (acesso_id) REFERENCES acessos_temporarios(id) ON DELETE CASCADE
);

-- Medicações em uso
CREATE TABLE IF NOT EXISTS medicacoes (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id      INT           NOT NULL,
  dependente_id    INT           NULL,
  nome             VARCHAR(120)  NOT NULL,
  dosagem          VARCHAR(60)   NOT NULL,
  frequencia       VARCHAR(80)   NOT NULL,
  desde            DATE          NULL,
  CONSTRAINT fk_medicacao_paciente
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
  CONSTRAINT fk_medicacao_dependente
    FOREIGN KEY (dependente_id) REFERENCES dependentes(id) ON DELETE CASCADE
);

-- ============================================================
--  Campanhas de vacinação
--  Diferente das outras tabelas, esta NÃO é por paciente: são as
--  campanhas nacionais/municipais em cartaz (ex.: Influenza), usadas
--  para montar os avisos do Dashboard.
-- ============================================================
CREATE TABLE IF NOT EXISTS campanhas_vacinacao (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  nome             VARCHAR(160)  NOT NULL,
  vacina           VARCHAR(80)   NOT NULL,
  publico_alvo     VARCHAR(160)  NOT NULL,
  inicio           DATE          NOT NULL,
  fim              DATE          NOT NULL
);

-- ============================================================
--  Rede de Saúde (UBS, prontos-socorros e UPAs)
--  Cache local do CNES (Cadastro Nacional de Estabelecimentos de
--  Saúde), lido dos dados abertos do Ministério da Saúde:
--  https://apidadosabertos.saude.gov.br/cnes/estabelecimentos
--
--  Assim como campanhas_vacinacao, NÃO é por paciente. A API de lá
--  devolve 20 itens por requisição — uma cidade grande precisa de
--  dezenas de chamadas —, então o resultado é gravado aqui e só é
--  buscado de novo quando passa do prazo de validade (ver
--  UnidadeSaudeDAO.DIAS_VALIDADE_CACHE).
-- ============================================================
CREATE TABLE IF NOT EXISTS unidades_saude (
  codigo_cnes      INT           PRIMARY KEY,   -- id oficial do estabelecimento
  codigo_municipio INT           NOT NULL,      -- código IBGE sem o dígito verificador
  nome             VARCHAR(160)  NOT NULL,
  tipo             VARCHAR(40)   NOT NULL,      -- 'ubs' | 'pronto_socorro' | 'upa'
  logradouro       VARCHAR(160),
  numero           VARCHAR(20),
  bairro           VARCHAR(120),
  cep              VARCHAR(8),
  telefone         VARCHAR(30),
  turno            VARCHAR(160),                -- turnos de atendimento, como vêm do CNES
  latitude         DECIMAL(10, 7),
  longitude        DECIMAL(10, 7),
  -- 1 = a coordenada já foi conferida contra o CEP da unidade.
  -- Parte do cadastro do CNES vem geocodificada no centro da cidade (ver
  -- UnidadeSaudeDAO.refinarCoordenadas). A conferência é lenta de propósito,
  -- porque a API de CEP é gratuita e limita requisições, então esta coluna
  -- guarda o que já foi feito para nunca repetir o trabalho.
  cep_conferido    TINYINT(1)    NOT NULL DEFAULT 0,
  -- O que a unidade oferece, em texto separado por ';' (24 h, centro cirúrgico,
  -- atendimento ambulatorial pelo SUS...). Vem de OUTRO endpoint do CNES, um
  -- por estabelecimento, então é buscado sob demanda, quando alguém abre a
  -- unidade na tela — buscar as 547 de uma cidade seria 547 chamadas.
  --
  -- Não são "especialidades": o CNES não publica a lista de especialidades por
  -- estabelecimento nesta API. O que ele publica são os serviços e a estrutura
  -- da unidade, e é isso que está gravado aqui.
  servicos         VARCHAR(500)  NULL,
  servicos_em      DATETIME      NULL,
  atualizado_em    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_unidade_municipio (codigo_municipio)
);

-- ============================================================
--  Trilha de auditoria do paciente
--  Complementa acessos_log: lá fica o que o MÉDICO fez com um código
--  temporário; aqui fica o que o PRÓPRIO paciente fez na conta dele —
--  entrou, abriu dado sensível, exportou o PDF, cadastrou ou excluiu um
--  dependente, gerou um código de acesso.
--
--  É trilha de auditoria, não log técnico: só entra ação de negócio, o
--  registro é imutável (não existe UPDATE nem DELETE nesta tabela em
--  nenhum DAO) e ele é mostrado ao titular na tela "Histórico de acessos".
--
--  origem_ip existe para o paciente reconhecer um acesso que não foi ele.
--  É dado pessoal, então fica restrito ao próprio titular, como o resto.
--
--  detalhe NUNCA recebe diagnóstico, resultado de exame, CPF ou cartão do
--  SUS: guarda contagem e primeiro nome, o suficiente para o paciente
--  entender o que aconteceu (ver AuditoriaDAO).
-- ============================================================
CREATE TABLE IF NOT EXISTS auditoria (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id      INT           NOT NULL,
  -- Sobre quem foi a ação: NULL = o próprio titular, preenchido = o
  -- dependente cujos dados foram abertos. A linha continua pertencendo ao
  -- titular (é ele quem responde pela conta e quem vê a trilha), mas com
  -- isto a tela consegue separar "o que fizeram com os dados do Miguel".
  dependente_id    INT           NULL,
  acao             VARCHAR(40)   NOT NULL,  -- 'login', 'consultou_prontuario', ...
  recurso          VARCHAR(40)   NULL,      -- 'conta' | 'prontuario' | 'exames' | ...
  detalhe          VARCHAR(255)  NULL,
  origem_ip        VARCHAR(45)   NULL,      -- 45 = cabe um IPv6
  criado_em        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_auditoria_paciente
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
  CONSTRAINT fk_auditoria_dependente
    FOREIGN KEY (dependente_id) REFERENCES dependentes(id) ON DELETE SET NULL,
  INDEX idx_auditoria_paciente (paciente_id, criado_em)
);

-- ============================================================
--  Contatos de emergência (familiares)
--  Quem avisar se algo acontecer com o paciente. É dado de OUTRA
--  pessoa (nome e telefone de um familiar), então de propósito não
--  entra no resumo enviado ao médico pelo acesso temporário: quem
--  cadastrou foi o paciente, e o consentimento é dele, não do familiar.
-- ============================================================
CREATE TABLE IF NOT EXISTS familiares (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id      INT           NOT NULL,
  nome             VARCHAR(120)  NOT NULL,
  parentesco       VARCHAR(60)   NOT NULL,
  telefone         VARCHAR(20)   NOT NULL,
  criado_em        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_familiar_paciente
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
  INDEX idx_familiar_paciente (paciente_id)
);

-- ============================================================
--  Notificações
--  Diferente dos "avisos" do Dashboard, que são DERIVADOS dos dados
--  (o AvisoDAO recalcula a cada requisição e nada é gravado), a
--  notificação é um FATO que aconteceu uma vez e precisa sobreviver:
--  um médico registrou uma consulta no prontuário do paciente.
--
--  Por isso ela é gravada, tem "lida_em" e não é recalculável — se a
--  linha sumir, ninguém consegue reconstruir o momento em que o
--  registro foi feito.
--
--  A mensagem NUNCA carrega diagnóstico, resultado ou conduta: diz o
--  que aconteceu e quem fez, e o paciente abre a tela para ver o resto.
-- ============================================================
CREATE TABLE IF NOT EXISTS notificacoes (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id      INT           NOT NULL,
  tipo             VARCHAR(30)   NOT NULL,  -- 'consulta' | 'exame' | 'prontuario' | 'acesso' | 'lembrete'
  -- Identidade do fato, para a notificação automática não repetir. Um lembrete
  -- da consulta 42 tem chave 'consulta_proxima:42': o gerador roda a cada
  -- Dashboard aberto, mas a linha nasce uma vez só. NULL = notificação de
  -- evento único (o médico registrou algo), que nunca precisa ser deduplicada.
  chave            VARCHAR(80)   NULL,
  mensagem         VARCHAR(255)  NOT NULL,
  criado_em        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  lida_em          DATETIME      NULL,
  CONSTRAINT fk_notificacao_paciente
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
  UNIQUE KEY uk_notificacao_chave (paciente_id, chave),
  INDEX idx_notificacao_paciente (paciente_id, lida_em)
);

-- ============================================================
--  Calendário Nacional de Vacinação (PNI — Ministério da Saúde)
--  Não é por paciente: é a tabela de referência que diz quais doses
--  existem e com que idade cada uma é recomendada.
--
--  Mora no banco, e não só no front, porque os dois lados precisam
--  dela: a tela monta a carteira e o AvisoDAO conta as doses
--  atrasadas. Duas cópias do calendário — uma em JS, outra em Java —
--  sairiam do ar uma da outra no primeiro ajuste do PNI.
--
--  idade_meses NULL = dose sem idade fixa (calendário do adulto), que
--  é exibida pelo período de referência e não entra no cálculo de
--  atraso.
-- ============================================================
CREATE TABLE IF NOT EXISTS calendario_vacinal (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  publico          VARCHAR(10)   NOT NULL,      -- 'crianca' | 'adulto'
  vacina           VARCHAR(80)   NOT NULL,
  dose             VARCHAR(60)   NOT NULL,
  idade_meses      INT           NULL,
  periodo          VARCHAR(60)   NOT NULL,      -- texto exibido ('4 meses', '9 a 14 anos')
  protege          VARCHAR(160)  NULL,
  ordem            INT           NOT NULL DEFAULT 0,
  UNIQUE KEY uk_calendario_dose (publico, vacina, dose)
);

-- ============================================================
--  Doses aplicadas
--  O que o app realmente sabe sobre a carteira de vacinação. Antes
--  desta tabela a tela adivinhava: toda dose com data prevista no
--  passado aparecia como tomada, o que é o oposto de um alerta útil —
--  a criança que não foi ao posto aparecia em dia.
--
--  Uma linha = uma dose confirmada por alguém. `origem` diz quem
--  confirmou (o paciente, pela tela, ou o médico com acesso de
--  escrita), porque "eu marquei" e "o posto registrou" não valem a
--  mesma coisa.
-- ============================================================
CREATE TABLE IF NOT EXISTS vacinas_aplicadas (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id      INT           NOT NULL,
  dependente_id    INT           NULL,
  dose_id          INT           NOT NULL,      -- calendario_vacinal.id
  data_aplicacao   DATE          NOT NULL,
  origem           VARCHAR(20)   NOT NULL DEFAULT 'paciente',  -- 'paciente' | 'medico'
  criado_em        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_vacina_paciente
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
  CONSTRAINT fk_vacina_dependente
    FOREIGN KEY (dependente_id) REFERENCES dependentes(id) ON DELETE CASCADE,
  CONSTRAINT fk_vacina_dose
    FOREIGN KEY (dose_id) REFERENCES calendario_vacinal(id) ON DELETE CASCADE,
  -- Não há UNIQUE aqui, e isso é uma limitação do MySQL, não uma escolha.
  -- No MySQL dois NULL contam como valores diferentes num índice único, e
  -- dependente_id é NULL para o titular — um UNIQUE (paciente, dependente,
  -- dose) deixaria o titular registrar a mesma dose várias vezes. A saída
  -- natural seria uma coluna gerada (IFNULL(dependente_id, 0)), mas o MySQL
  -- proíbe ON DELETE CASCADE numa coluna que serve de base para coluna
  -- gerada — e a cascata é o que apaga as doses junto com o dependente.
  --
  -- Então quem garante uma linha por dose é o VacinaDAO, que apaga o registro
  -- anterior antes de gravar o novo, dentro da mesma transação.
  INDEX idx_vacina_pessoa (paciente_id, dependente_id, dose_id)
);

-- ============================================================
--  Migração das colunas novas
--  `CREATE TABLE IF NOT EXISTS` não altera tabela que já existe, então
--  quem já tinha o banco criado não ganharia as colunas acrescentadas
--  acima. O MySQL não tem `ADD COLUMN IF NOT EXISTS`, e rodar o ALTER
--  direto quebraria o script para quem já está em dia — daí este
--  procedimento, que confere o INFORMATION_SCHEMA antes de alterar.
--
--  É seguro rodar o schema.sql quantas vezes quiser.
-- ============================================================
DROP PROCEDURE IF EXISTS sc_adicionar_coluna;
DELIMITER $$
CREATE PROCEDURE sc_adicionar_coluna(
  IN p_tabela VARCHAR(64), IN p_coluna VARCHAR(64), IN p_definicao TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = p_tabela
       AND COLUMN_NAME = p_coluna
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_tabela, '` ADD COLUMN `', p_coluna, '` ', p_definicao);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL sc_adicionar_coluna('pacientes', 'unidade_referencia', 'INT NULL');
CALL sc_adicionar_coluna('consultas', 'unidade_cnes', 'INT NULL');
CALL sc_adicionar_coluna('acessos_temporarios', 'dependente_id', 'INT NULL');
CALL sc_adicionar_coluna('acessos_temporarios', 'compartilha_contatos', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL sc_adicionar_coluna('auditoria', 'dependente_id', 'INT NULL');
CALL sc_adicionar_coluna('notificacoes', 'chave', 'VARCHAR(80) NULL');
CALL sc_adicionar_coluna('unidades_saude', 'servicos', 'VARCHAR(500) NULL');
CALL sc_adicionar_coluna('unidades_saude', 'servicos_em', 'DATETIME NULL');

DROP PROCEDURE IF EXISTS sc_adicionar_coluna;

-- O mesmo para o índice que garante a deduplicação das notificações
-- automáticas: sem ele, a coluna `chave` recém-criada não impediria a
-- repetição do lembrete a cada Dashboard aberto.
DROP PROCEDURE IF EXISTS sc_adicionar_indice_chave;
DELIMITER $$
CREATE PROCEDURE sc_adicionar_indice_chave()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'notificacoes'
       AND INDEX_NAME = 'uk_notificacao_chave'
  ) THEN
    ALTER TABLE notificacoes ADD UNIQUE KEY uk_notificacao_chave (paciente_id, chave);
  END IF;
END$$
DELIMITER ;

CALL sc_adicionar_indice_chave();
DROP PROCEDURE IF EXISTS sc_adicionar_indice_chave;

-- ============================================================
--  Municípios espelhados
--  Uma linha por município que já foi baixado do CNES, com a última
--  vez que alguém pediu a lista dele.
--
--  Existe por causa do "Ver outra cidade": qualquer CEP pesquisado
--  traz um município novo para a tabela unidades_saude, e uma cidade
--  vista uma única vez ficaria lá para sempre. Com esta marca dá para
--  apagar o que ninguém mais abre (UnidadeSaudeDAO.limparMunicipios-
--  Abandonados) sem tocar nas cidades em uso.
--
--  A marca NÃO pode morar em unidades_saude: aquela tabela tem
--  atualizado_em com ON UPDATE CURRENT_TIMESTAMP, e um UPDATE a cada
--  visita faria o cache do CNES parecer sempre novo, quebrando a
--  renovação de 30 dias.
-- ============================================================
CREATE TABLE IF NOT EXISTS municipios_espelhados (
  codigo_municipio INT           PRIMARY KEY,
  acessado_em      DATETIME      NOT NULL,
  criado_em        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);
