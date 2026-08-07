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
  criado_em        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  expira_em        DATETIME      NOT NULL,
  usado_em         DATETIME      NULL,   -- quando o médico trocou o código pelo token
  revogado_em      DATETIME      NULL,   -- revogação manual pelo paciente
  medico_id        INT           NULL,   -- preenchido no momento do uso
  CONSTRAINT fk_acesso_paciente
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
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
