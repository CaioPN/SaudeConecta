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
