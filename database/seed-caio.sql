-- SaúdeConecta — Dados clínicos de demonstração do paciente Caio Astoria
-- Rode depois do schema.sql (o paciente e os dependentes já devem existir).
--
-- Serve para a apresentação: monta um histórico coerente de ~18 meses do
-- titular — consultas realizadas, consultas futuras, três coletas de sangue,
-- exames de imagem e o prontuário (alergias, condições e medicações).
-- Os dependentes NÃO são tocados por este script.
--
-- IMPORTANTE (Windows): arquivo em UTF-8. Rode sempre informando o charset,
-- senão o mysql.exe grava os acentos corrompidos:
--
--   mysql -u root -p --default-character-set=utf8mb4 < seed-caio.sql
--
-- Todos os INSERTs são idempotentes (guardados por NOT EXISTS): rodar duas
-- vezes não duplica nada.

USE saudeconecta;

SET @pid = (SELECT id FROM pacientes WHERE email = 'caioastoria@gmail.com');

-- ============================================================
--  Médicos
--  Os dois clínicos gerais já vêm do seed.sql; aqui entram os
--  especialistas que aparecem no histórico do Caio.
-- ============================================================
INSERT INTO medicos (nome, especialidade, crm, telefone)
SELECT 'Dra. Ana Souza', 'Clínico Geral', '123456-SP', '1133334444'
WHERE NOT EXISTS (SELECT 1 FROM medicos WHERE crm = '123456-SP');

INSERT INTO medicos (nome, especialidade, crm, telefone)
SELECT 'Dr. Rafael Lima', 'Cardiologista', '445120-SP', '1133336666'
WHERE NOT EXISTS (SELECT 1 FROM medicos WHERE crm = '445120-SP');

INSERT INTO medicos (nome, especialidade, crm, telefone)
SELECT 'Dr. Paulo Menezes', 'Ortopedista', '332118-SP', '1133337777'
WHERE NOT EXISTS (SELECT 1 FROM medicos WHERE crm = '332118-SP');

INSERT INTO medicos (nome, especialidade, crm, telefone)
SELECT 'Dra. Beatriz Nunes', 'Dermatologista', '778901-SP', '1133338888'
WHERE NOT EXISTS (SELECT 1 FROM medicos WHERE crm = '778901-SP');

SET @med_ana      = (SELECT id FROM medicos WHERE crm = '123456-SP');
SET @med_rafael   = (SELECT id FROM medicos WHERE crm = '445120-SP');
SET @med_paulo    = (SELECT id FROM medicos WHERE crm = '332118-SP');
SET @med_beatriz  = (SELECT id FROM medicos WHERE crm = '778901-SP');

-- ============================================================
--  Consultas já realizadas (dependente_id NULL = titular)
-- ============================================================

-- Check-up anual: ponto de partida do histórico, tudo normal.
INSERT INTO consultas (paciente_id, medico_id, data, hora, local, motivo, status, resumo, conduta)
SELECT @pid, @med_ana, '2025-03-10', '09:00:00', 'UBS Jardim América, Consultório 2',
       'Check-up anual', 'realizada',
       'Paciente assintomático. Exame físico sem alterações e pressão arterial de 118/76 mmHg.',
       'Solicitados exames laboratoriais de rotina. Manter atividade física regular.'
WHERE NOT EXISTS (SELECT 1 FROM consultas WHERE paciente_id = @pid AND data = '2025-03-10');

-- Ortopedia: dor no joelho depois de aumentar a carga de corrida.
INSERT INTO consultas (paciente_id, medico_id, data, hora, local, motivo, status, resumo, conduta)
SELECT @pid, @med_paulo, '2025-09-22', '16:00:00', 'Clínica Ortopédica Vila Mariana',
       'Dor no joelho direito', 'realizada',
       'Dor anterior no joelho direito há três semanas, após aumento da carga de corrida. Sem instabilidade nem derrame articular.',
       'Solicitada ressonância do joelho direito. Repouso da corrida por 15 dias e início de fisioterapia.'
WHERE NOT EXISTS (SELECT 1 FROM consultas WHERE paciente_id = @pid AND data = '2025-09-22');

-- Clínico geral: investigação do cansaço (origem dos exames alterados).
INSERT INTO consultas (paciente_id, medico_id, data, hora, local, motivo, status, resumo, conduta)
SELECT @pid, @med_ana, '2026-02-18', '10:15:00', 'UBS Jardim América, Consultório 2',
       'Cansaço e queda de rendimento', 'realizada',
       'Queixa de cansaço há cerca de dois meses. Exame físico com discreta palidez de mucosas.',
       'Solicitados hemograma, ferritina, vitamina D e ultrassom de abdome. Retorno com os resultados.'
WHERE NOT EXISTS (SELECT 1 FROM consultas WHERE paciente_id = @pid AND data = '2026-02-18');

-- Cardiologia: palpitações, com ecocardiograma normal.
INSERT INTO consultas (paciente_id, medico_id, data, hora, local, motivo, status, resumo, conduta)
SELECT @pid, @med_rafael, '2026-05-06', '14:00:00', 'Instituto do Coração, Sala 15',
       'Palpitações ocasionais', 'realizada',
       'Palpitações de curta duração, sem dor torácica ou desmaio. Ecocardiograma sem alterações estruturais.',
       'Reduzir cafeína e melhorar a higiene do sono. Retorno em três meses para reavaliação.'
WHERE NOT EXISTS (SELECT 1 FROM consultas WHERE paciente_id = @pid AND data = '2026-05-06');

-- Retorno com os resultados: fecha a história do cansaço.
INSERT INTO consultas (paciente_id, medico_id, data, hora, local, motivo, status, resumo, conduta)
SELECT @pid, @med_ana, '2026-07-14', '11:00:00', 'UBS Jardim América, Consultório 2',
       'Retorno com resultados', 'realizada',
       'Melhora do cansaço após a reposição de ferro. Hemoglobina e ferritina normalizadas; vitamina D ainda abaixo da referência.',
       'Manter a vitamina D3 por mais três meses e repetir a dosagem. Suspender o sulfato ferroso.'
WHERE NOT EXISTS (SELECT 1 FROM consultas WHERE paciente_id = @pid AND data = '2026-07-14');

-- ============================================================
--  Consultas futuras (status 'agendada')
--  A de agosto/2026 é a que alimenta o aviso "consulta chegando"
--  no Dashboard (janela de 30 dias do AvisoDAO).
-- ============================================================
INSERT INTO consultas (paciente_id, medico_id, data, hora, local, motivo, status)
SELECT @pid, @med_rafael, '2026-08-20', '14:30:00', 'Instituto do Coração, Sala 15',
       'Retorno cardiológico', 'agendada'
WHERE NOT EXISTS (SELECT 1 FROM consultas WHERE paciente_id = @pid AND data = '2026-08-20');

INSERT INTO consultas (paciente_id, medico_id, data, hora, local, motivo, status)
SELECT @pid, @med_beatriz, '2026-10-05', '09:30:00', 'Clínica Derma Paulista, Sala 7',
       'Avaliação de lesão de pele', 'agendada'
WHERE NOT EXISTS (SELECT 1 FROM consultas WHERE paciente_id = @pid AND data = '2026-10-05');

INSERT INTO consultas (paciente_id, medico_id, data, hora, local, motivo, status)
SELECT @pid, @med_ana, '2026-12-01', '08:30:00', 'UBS Jardim América, Consultório 2',
       'Check-up anual', 'agendada'
WHERE NOT EXISTS (SELECT 1 FROM consultas WHERE paciente_id = @pid AND data = '2026-12-01');

SET @con_checkup = (SELECT id FROM consultas WHERE paciente_id = @pid AND data = '2025-03-10');
SET @con_joelho  = (SELECT id FROM consultas WHERE paciente_id = @pid AND data = '2025-09-22');
SET @con_cansaco = (SELECT id FROM consultas WHERE paciente_id = @pid AND data = '2026-02-18');
SET @con_cardio  = (SELECT id FROM consultas WHERE paciente_id = @pid AND data = '2026-05-06');
SET @con_retorno = (SELECT id FROM consultas WHERE paciente_id = @pid AND data = '2026-07-14');

-- ============================================================
--  Exames de sangue (três coletas, mostrando a evolução)
-- ============================================================
INSERT INTO exames (paciente_id, medico_id, consulta_id, tipo, data, local)
SELECT @pid, @med_ana, @con_checkup, 'sangue', '2025-03-12', 'Laboratório Central — UBS Jardim América'
WHERE NOT EXISTS (SELECT 1 FROM exames WHERE paciente_id = @pid AND tipo = 'sangue' AND data = '2025-03-12');

INSERT INTO exames (paciente_id, medico_id, consulta_id, tipo, data, local)
SELECT @pid, @med_ana, @con_cansaco, 'sangue', '2026-02-20', 'Laboratório Central — UBS Jardim América'
WHERE NOT EXISTS (SELECT 1 FROM exames WHERE paciente_id = @pid AND tipo = 'sangue' AND data = '2026-02-20');

INSERT INTO exames (paciente_id, medico_id, consulta_id, tipo, data, local)
SELECT @pid, @med_ana, @con_retorno, 'sangue', '2026-07-16', 'Laboratório Central — UBS Jardim América'
WHERE NOT EXISTS (SELECT 1 FROM exames WHERE paciente_id = @pid AND tipo = 'sangue' AND data = '2026-07-16');

SET @ex_2025_03 = (SELECT id FROM exames WHERE paciente_id = @pid AND tipo = 'sangue' AND data = '2025-03-12');
SET @ex_2026_02 = (SELECT id FROM exames WHERE paciente_id = @pid AND tipo = 'sangue' AND data = '2026-02-20');
SET @ex_2026_07 = (SELECT id FROM exames WHERE paciente_id = @pid AND tipo = 'sangue' AND data = '2026-07-16');

-- Coleta de mar/2025 — check-up com todos os itens dentro da referência.
INSERT INTO exame_itens (exame_id, nome, valor, unidade, ref_min, ref_max, ordem)
SELECT * FROM (
  SELECT @ex_2025_03 AS e, 'Hemoglobina' AS n, 15.20 AS v, 'g/dL' AS u, 13.00 AS mi, 17.00 AS ma, 1 AS o UNION ALL
  SELECT @ex_2025_03, 'Leucócitos',        6800, '/mm³',   4000,   11000, 2 UNION ALL
  SELECT @ex_2025_03, 'Plaquetas',       245000, '/mm³', 150000,  450000, 3 UNION ALL
  SELECT @ex_2025_03, 'Glicose (jejum)',     88, 'mg/dL',    70,      99, 4 UNION ALL
  SELECT @ex_2025_03, 'Colesterol total',   178, 'mg/dL',     0,     200, 5 UNION ALL
  SELECT @ex_2025_03, 'HDL',                 54, 'mg/dL',    40,     100, 6 UNION ALL
  SELECT @ex_2025_03, 'Triglicerídeos',     112, 'mg/dL',     0,     150, 7 UNION ALL
  SELECT @ex_2025_03, 'Creatinina',        0.95, 'mg/dL',  0.70,    1.30, 8
) AS novos
WHERE NOT EXISTS (SELECT 1 FROM exame_itens WHERE exame_id = @ex_2025_03);

-- Coleta de fev/2026 — a investigação do cansaço: anemia por falta de ferro
-- e vitamina D baixa (três itens fora da faixa).
INSERT INTO exame_itens (exame_id, nome, valor, unidade, ref_min, ref_max, ordem)
SELECT * FROM (
  SELECT @ex_2026_02 AS e, 'Hemoglobina' AS n, 12.80 AS v, 'g/dL' AS u, 13.00 AS mi, 17.00 AS ma, 1 AS o UNION ALL
  SELECT @ex_2026_02, 'Ferritina',            18, 'ng/mL',      30,   400, 2 UNION ALL
  SELECT @ex_2026_02, 'Vitamina D (25-OH)',   21, 'ng/mL',      30,   100, 3 UNION ALL
  SELECT @ex_2026_02, 'Glicose (jejum)',      94, 'mg/dL',      70,    99, 4 UNION ALL
  SELECT @ex_2026_02, 'Colesterol total',    196, 'mg/dL',       0,   200, 5 UNION ALL
  SELECT @ex_2026_02, 'LDL',                 128, 'mg/dL',       0,   130, 6 UNION ALL
  SELECT @ex_2026_02, 'TSH',                2.10, 'µUI/mL',   0.40,  4.50, 7 UNION ALL
  SELECT @ex_2026_02, 'Creatinina',         1.02, 'mg/dL',    0.70,  1.30, 8
) AS novos
WHERE NOT EXISTS (SELECT 1 FROM exame_itens WHERE exame_id = @ex_2026_02);

-- Coleta de jul/2026 — a mais recente: quase tudo normalizado, só a vitamina D
-- segue baixa. É ela que gera o aviso "1 resultado fora da faixa" no Dashboard.
INSERT INTO exame_itens (exame_id, nome, valor, unidade, ref_min, ref_max, ordem)
SELECT * FROM (
  SELECT @ex_2026_07 AS e, 'Hemoglobina' AS n, 14.10 AS v, 'g/dL' AS u, 13.00 AS mi, 17.00 AS ma, 1 AS o UNION ALL
  SELECT @ex_2026_07, 'Ferritina',            46, 'ng/mL',      30,   400, 2 UNION ALL
  SELECT @ex_2026_07, 'Vitamina D (25-OH)',   28, 'ng/mL',      30,   100, 3 UNION ALL
  SELECT @ex_2026_07, 'Glicose (jejum)',      89, 'mg/dL',      70,    99, 4 UNION ALL
  SELECT @ex_2026_07, 'Colesterol total',    181, 'mg/dL',       0,   200, 5 UNION ALL
  SELECT @ex_2026_07, 'LDL',                 112, 'mg/dL',       0,   130, 6 UNION ALL
  SELECT @ex_2026_07, 'TSH',                1.90, 'µUI/mL',   0.40,  4.50, 7 UNION ALL
  SELECT @ex_2026_07, 'Creatinina',         0.98, 'mg/dL',    0.70,  1.30, 8
) AS novos
WHERE NOT EXISTS (SELECT 1 FROM exame_itens WHERE exame_id = @ex_2026_07);

-- ============================================================
--  Exames de imagem
-- ============================================================
INSERT INTO exames (paciente_id, medico_id, consulta_id, tipo, data, local, nome, laudo)
SELECT @pid, @med_paulo, @con_joelho, 'imagem', '2025-09-25',
       'Hospital São Camilo — Setor de Imagem',
       'Ressonância magnética do joelho direito',
       'Discreto edema no tendão patelar, compatível com tendinopatia por sobrecarga. Meniscos e ligamentos cruzados sem sinais de lesão.'
WHERE NOT EXISTS (SELECT 1 FROM exames WHERE paciente_id = @pid AND tipo = 'imagem' AND data = '2025-09-25');

INSERT INTO exames (paciente_id, medico_id, consulta_id, tipo, data, local, nome, laudo)
SELECT @pid, @med_ana, @con_cansaco, 'imagem', '2026-02-20',
       'Hospital São Camilo — Setor de Imagem',
       'Ultrassonografia de abdome total',
       'Fígado, vias biliares, pâncreas, rins e baço com dimensões e ecotextura normais. Ausência de cálculos.'
WHERE NOT EXISTS (SELECT 1 FROM exames WHERE paciente_id = @pid AND tipo = 'imagem' AND data = '2026-02-20');

INSERT INTO exames (paciente_id, medico_id, consulta_id, tipo, data, local, nome, laudo)
SELECT @pid, @med_rafael, @con_cardio, 'imagem', '2026-05-06',
       'Instituto do Coração — Setor de Métodos Gráficos',
       'Ecocardiograma transtorácico',
       'Função sistólica do ventrículo esquerdo preservada (fração de ejeção de 62%). Câmaras cardíacas de dimensões normais e valvas sem alterações significativas.'
WHERE NOT EXISTS (SELECT 1 FROM exames WHERE paciente_id = @pid AND tipo = 'imagem' AND data = '2026-05-06');

-- ============================================================
--  Prontuário: alergias, condições e medicações do titular
-- ============================================================
INSERT INTO alergias (paciente_id, descricao)
SELECT @pid, 'Dipirona'
WHERE NOT EXISTS (SELECT 1 FROM alergias WHERE paciente_id = @pid AND descricao = 'Dipirona');

INSERT INTO alergias (paciente_id, descricao)
SELECT @pid, 'Frutos do mar (camarão)'
WHERE NOT EXISTS (SELECT 1 FROM alergias WHERE paciente_id = @pid AND descricao = 'Frutos do mar (camarão)');

INSERT INTO condicoes (paciente_id, descricao, desde)
SELECT @pid, 'Rinite alérgica', '2015-03-01'
WHERE NOT EXISTS (SELECT 1 FROM condicoes WHERE paciente_id = @pid AND descricao = 'Rinite alérgica');

INSERT INTO condicoes (paciente_id, descricao, desde)
SELECT @pid, 'Deficiência de vitamina D', '2026-02-20'
WHERE NOT EXISTS (SELECT 1 FROM condicoes WHERE paciente_id = @pid AND descricao = 'Deficiência de vitamina D');

-- O sulfato ferroso foi suspenso na consulta de 14/07/2026, por isso não
-- aparece aqui: a lista mostra só o que o paciente usa hoje.
INSERT INTO medicacoes (paciente_id, nome, dosagem, frequencia, desde)
SELECT @pid, 'Vitamina D3', '2.000 UI', '1 cápsula por dia, após o almoço', '2026-02-25'
WHERE NOT EXISTS (SELECT 1 FROM medicacoes WHERE paciente_id = @pid AND nome = 'Vitamina D3');

INSERT INTO medicacoes (paciente_id, nome, dosagem, frequencia, desde)
SELECT @pid, 'Loratadina', '10mg', '1 comprimido nas crises de rinite', '2015-03-01'
WHERE NOT EXISTS (SELECT 1 FROM medicacoes WHERE paciente_id = @pid AND nome = 'Loratadina');
