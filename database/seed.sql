-- SaúdeConecta — Dados de exemplo (opcional)
-- Rode depois do schema.sql. A senha do paciente abaixo é: Teste@123
--
-- IMPORTANTE (Windows): este arquivo é UTF-8. O cliente mysql.exe assume a
-- codificação do console (cp850) e grava acentos corrompidos ("S├úo Paulo").
-- Rode sempre informando o charset:
--
--   mysql -u root -p --default-character-set=utf8mb4 < seed.sql
--
-- Pelo MySQL Workbench não é preciso fazer nada.

USE saudeconecta;

-- Paciente de exemplo.
-- O hash é o SHA-256 de "Teste@123" gerado pelo SenhaUtil do backend Java
-- (o seed antigo trazia um hash bcrypt do backend Node, que o Java não valida).
INSERT INTO pacientes (nome, email, telefone, cpf, genero, tipo_sanguineo, senha_hash, data_nascimento,
                       cep, rua, numero, bairro, cidade, estado)
SELECT 'Gabriel Ferreira', 'gabriel@gmail.com', '11999999999', '12345678900',
       'Masculino', 'O+', '6b7a8a40eb42d9b6593930c0a4ca9946792e235709bc074ca056d9aefaa37b61', '2007-06-02',
       '01310100', 'Avenida Paulista', '1000', 'Bela Vista', 'São Paulo', 'SP'
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE email = 'gabriel@gmail.com');

-- Corrige a senha caso o paciente já tenha sido inserido com o hash bcrypt antigo.
UPDATE pacientes
   SET senha_hash = '6b7a8a40eb42d9b6593930c0a4ca9946792e235709bc074ca056d9aefaa37b61'
 WHERE email = 'gabriel@gmail.com'
   AND senha_hash LIKE '$2%';

-- Corrige os acentos caso o seed tenha sido rodado sem --default-character-set=utf8mb4.
UPDATE pacientes
   SET rua = 'Avenida Paulista', bairro = 'Bela Vista', cidade = 'São Paulo'
 WHERE email = 'gabriel@gmail.com';

-- Dependente de exemplo vinculado ao paciente acima (criança de ~2 anos,
-- para demonstrar a Carteira de Vacinação infantil com doses tomadas e futuras).
INSERT INTO dependentes (paciente_id, nome, cpf, genero, tipo_sanguineo, data_nascimento)
SELECT p.id, 'Helena Ferreira', '98765432100', 'Feminino', 'A+', '2024-03-15'
FROM pacientes p
WHERE p.email = 'gabriel@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM dependentes WHERE cpf = '98765432100');

-- Corrige a data de nascimento caso o dependente já tenha sido inserido
-- em uma versão anterior do seed (mantém a demo consistente: ~2 anos de idade).
UPDATE dependentes SET data_nascimento = '2024-03-15' WHERE cpf = '98765432100';

-- ============================================================
--  Dados clínicos de exemplo do paciente Gabriel Ferreira
--  (todos com dependente_id NULL = registros do titular)
-- ============================================================

SET @pid = (SELECT id FROM pacientes WHERE email = 'gabriel@gmail.com');

-- --- Médicos ---
INSERT INTO medicos (nome, especialidade, crm, telefone)
SELECT 'Dra. Ana Souza', 'Clínico Geral', '123456-SP', '1133334444'
WHERE NOT EXISTS (SELECT 1 FROM medicos WHERE crm = '123456-SP');

INSERT INTO medicos (nome, especialidade, crm, telefone)
SELECT 'Dra. Maria Gabriela', 'Clínico Geral', '654321-SP', '1133335555'
WHERE NOT EXISTS (SELECT 1 FROM medicos WHERE crm = '654321-SP');

SET @med_ana = (SELECT id FROM medicos WHERE crm = '123456-SP');
SET @med_gabriela = (SELECT id FROM medicos WHERE crm = '654321-SP');

-- --- Consultas ---
INSERT INTO consultas (paciente_id, medico_id, data, hora, local, motivo, status)
SELECT @pid, @med_gabriela, '2026-02-23', '14:30:00', 'Edifício Saúde, Sala 402',
       'Retorno (follow-up)', 'agendada'
WHERE NOT EXISTS (
  SELECT 1 FROM consultas WHERE paciente_id = @pid AND data = '2026-02-23'
);

INSERT INTO consultas (paciente_id, medico_id, data, hora, local, motivo, status, resumo, conduta)
SELECT @pid, @med_ana, '2026-01-15', '09:00:00', 'UBS Vila Nova, Consultório 3',
       'Consulta de acompanhamento', 'realizada',
       'Pressão arterial controlada (120/80). Prescrição mantida sem alterações.',
       'Solicitados exames de sangue de rotina. Retorno em 30 dias.'
WHERE NOT EXISTS (
  SELECT 1 FROM consultas WHERE paciente_id = @pid AND data = '2026-01-15'
);

INSERT INTO consultas (paciente_id, medico_id, data, hora, local, motivo, status, resumo, conduta)
SELECT @pid, @med_ana, '2025-07-08', '10:30:00', 'UBS Vila Nova, Consultório 3',
       'Check-up anual', 'realizada',
       'Colesterol e glicose acima da referência. Orientação alimentar e atividade física.',
       'Iniciado acompanhamento nutricional. Repetir exames em 6 meses.'
WHERE NOT EXISTS (
  SELECT 1 FROM consultas WHERE paciente_id = @pid AND data = '2025-07-08'
);

SET @con_jan = (SELECT id FROM consultas WHERE paciente_id = @pid AND data = '2026-01-15');
SET @con_jul = (SELECT id FROM consultas WHERE paciente_id = @pid AND data = '2025-07-08');

-- --- Exames de sangue (coletas) ---
INSERT INTO exames (paciente_id, medico_id, consulta_id, tipo, data, local)
SELECT @pid, @med_ana, @con_jan, 'sangue', '2026-01-15', 'Laboratório Central — UBS Vila Nova'
WHERE NOT EXISTS (
  SELECT 1 FROM exames WHERE paciente_id = @pid AND tipo = 'sangue' AND data = '2026-01-15'
);

INSERT INTO exames (paciente_id, medico_id, consulta_id, tipo, data, local)
SELECT @pid, @med_ana, @con_jul, 'sangue', '2025-07-08', 'Laboratório Central — UBS Vila Nova'
WHERE NOT EXISTS (
  SELECT 1 FROM exames WHERE paciente_id = @pid AND tipo = 'sangue' AND data = '2025-07-08'
);

SET @ex_jan = (SELECT id FROM exames WHERE paciente_id = @pid AND tipo = 'sangue' AND data = '2026-01-15');
SET @ex_jul = (SELECT id FROM exames WHERE paciente_id = @pid AND tipo = 'sangue' AND data = '2025-07-08');

INSERT INTO exame_itens (exame_id, nome, valor, unidade, ref_min, ref_max, ordem)
SELECT * FROM (
  SELECT @ex_jan AS e, 'Hemoglobina' AS n, 13.5 AS v, 'g/dL' AS u, 12.0 AS mi, 16.0 AS ma, 1 AS o UNION ALL
  SELECT @ex_jan, 'Glicose (jejum)', 85, 'mg/dL', 70, 99, 2 UNION ALL
  SELECT @ex_jan, 'Colesterol total', 190, 'mg/dL', 0, 200, 3 UNION ALL
  SELECT @ex_jan, 'Creatinina', 0.9, 'mg/dL', 0.6, 1.1, 4 UNION ALL
  SELECT @ex_jul, 'Hemoglobina', 13.1, 'g/dL', 12.0, 16.0, 1 UNION ALL
  SELECT @ex_jul, 'Glicose (jejum)', 104, 'mg/dL', 70, 99, 2 UNION ALL
  SELECT @ex_jul, 'Colesterol total', 232, 'mg/dL', 0, 200, 3 UNION ALL
  SELECT @ex_jul, 'Creatinina', 0.8, 'mg/dL', 0.6, 1.1, 4
) AS novos
WHERE NOT EXISTS (SELECT 1 FROM exame_itens WHERE exame_id IN (@ex_jan, @ex_jul));

-- --- Exame de imagem ---
INSERT INTO exames (paciente_id, medico_id, tipo, data, local, nome, laudo)
SELECT @pid, @med_ana, 'imagem', '2026-01-12', 'Hospital Municipal — Setor de Imagem',
       'Raio-X de Tórax (PA)',
       'Campos pulmonares sem alterações. Área cardíaca dentro dos limites da normalidade.'
WHERE NOT EXISTS (
  SELECT 1 FROM exames WHERE paciente_id = @pid AND tipo = 'imagem' AND data = '2026-01-12'
);

-- --- Prontuário: alergias, condições e medicações ---
INSERT INTO alergias (paciente_id, descricao)
SELECT @pid, 'Penicilina'
WHERE NOT EXISTS (
  SELECT 1 FROM alergias WHERE paciente_id = @pid AND descricao = 'Penicilina'
);

INSERT INTO condicoes (paciente_id, descricao, desde)
SELECT @pid, 'Hipertensão', '2025-07-08'
WHERE NOT EXISTS (
  SELECT 1 FROM condicoes WHERE paciente_id = @pid AND descricao = 'Hipertensão'
);

INSERT INTO medicacoes (paciente_id, nome, dosagem, frequencia, desde)
SELECT @pid, 'Losartana', '50mg', '1 comprimido pela manhã', '2025-07-08'
WHERE NOT EXISTS (
  SELECT 1 FROM medicacoes WHERE paciente_id = @pid AND nome = 'Losartana'
);

-- --- Campanhas de vacinação ---
-- Datas REAIS do calendário de estratégias nacionais de vacinação de 2026,
-- divulgado pelo Ministério da Saúde em março/2026. Fonte:
-- https://sbim.org.br/noticias/saude-divulga-calendario-de-estrategias-nacionais-de-vacinacao-em-2026
--
-- Não existe API pública do governo com o calendário de campanhas: o que o
-- Ministério abre (OpenDataSUS, dados.gov.br) são as doses já aplicadas, não os
-- períodos em cartaz. Por isso esta tabela é alimentada à mão, uma vez por ano.
INSERT INTO campanhas_vacinacao (nome, vacina, publico_alvo, inicio, fim)
SELECT 'Campanha Nacional de Vacinação contra a Influenza', 'Influenza (gripe)',
       'Grupos prioritários das regiões Nordeste, Centro-Oeste, Sul e Sudeste',
       '2026-03-28', '2026-05-30'
WHERE NOT EXISTS (
  SELECT 1 FROM campanhas_vacinacao
  WHERE nome = 'Campanha Nacional de Vacinação contra a Influenza'
);

INSERT INTO campanhas_vacinacao (nome, vacina, publico_alvo, inicio, fim)
SELECT 'Estratégia de Vacinação Escolar', 'Multivacinação',
       'Menores de 15 anos, nas escolas',
       '2026-04-01', '2026-05-31'
WHERE NOT EXISTS (
  SELECT 1 FROM campanhas_vacinacao WHERE nome = 'Estratégia de Vacinação Escolar'
);

INSERT INTO campanhas_vacinacao (nome, vacina, publico_alvo, inicio, fim)
SELECT 'Campanha Nacional de Multivacinação', 'Multivacinação',
       'Crianças e adolescentes menores de 15 anos',
       '2026-08-03', '2026-09-01'
WHERE NOT EXISTS (
  SELECT 1 FROM campanhas_vacinacao WHERE nome = 'Campanha Nacional de Multivacinação'
);
