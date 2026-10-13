-- ============================================================
--  SaúdeConecta — consultas analíticas (Parte 4 do trabalho)
--
--  São consultas de LEITURA, pensadas para extrair métrica do banco:
--  agrupamento, total, percentual, subconsulta e função de janela.
--  Nenhuma delas é usada pelo app em tempo de execução (as do app estão
--  nos DAOs e respondem por UM paciente); estas olham a base inteira,
--  que é o que a análise pede.
--
--  Rodar:
--    mysql -u root -p --default-character-set=utf8mb4 saudeconecta < database/analise.sql
-- ============================================================

-- ------------------------------------------------------------
-- 1. Panorama da base (subconsultas escalares)
--    Cada linha é uma subconsulta independente: dá o tamanho de cada
--    assunto sem precisar de oito comandos separados.
-- ------------------------------------------------------------
SELECT 'pacientes'        AS assunto, (SELECT COUNT(*) FROM pacientes)         AS registros
UNION ALL SELECT 'dependentes',       (SELECT COUNT(*) FROM dependentes)
UNION ALL SELECT 'consultas',         (SELECT COUNT(*) FROM consultas)
UNION ALL SELECT 'exames',            (SELECT COUNT(*) FROM exames)
UNION ALL SELECT 'itens de exame',    (SELECT COUNT(*) FROM exame_itens)
UNION ALL SELECT 'doses aplicadas',   (SELECT COUNT(*) FROM vacinas_aplicadas)
UNION ALL SELECT 'unidades de saude', (SELECT COUNT(*) FROM unidades_saude)
UNION ALL SELECT 'acoes auditadas',   (SELECT COUNT(*) FROM auditoria)
ORDER BY registros DESC;

-- ------------------------------------------------------------
-- 2. Quais exames mais saem fora da faixa de referência
--    GROUP BY + COUNT + SUM(CASE) + percentual + AVG + HAVING.
--    Responde "o que mais dá alterado na base", que é a pergunta que
--    justifica priorizar um aviso no Dashboard.
-- ------------------------------------------------------------
SELECT i.nome                                            AS exame,
       COUNT(*)                                          AS medicoes,
       SUM(i.valor < i.ref_min OR i.valor > i.ref_max)   AS fora_da_faixa,
       ROUND(100 * SUM(i.valor < i.ref_min OR i.valor > i.ref_max) / COUNT(*), 1)
                                                         AS pct_alterado,
       ROUND(AVG(i.valor), 2)                            AS valor_medio,
       CONCAT(MIN(i.ref_min), ' - ', MAX(i.ref_max))     AS faixa
FROM exame_itens i
JOIN exames e ON e.id = i.exame_id
WHERE e.tipo = 'sangue'
GROUP BY i.nome
HAVING medicoes >= 2
ORDER BY pct_alterado DESC, medicoes DESC;

-- ------------------------------------------------------------
-- 3. Cobertura vacinal por pessoa (CTE + subconsulta correlacionada)
--    Para cada pessoa da casa (titular ou dependente) conta as doses do
--    calendário infantil cuja data recomendada JÁ passou e quantas
--    dessas foram registradas. É a mesma regra do CarteiraVacinal.java,
--    escrita aqui como métrica da base.
-- ------------------------------------------------------------
WITH pessoas AS (
    SELECT id AS paciente_id, NULL AS dependente_id, nome, data_nascimento
    FROM pacientes
    UNION ALL
    SELECT paciente_id, id, nome, data_nascimento
    FROM dependentes
)
SELECT p.nome,
       TIMESTAMPDIFF(YEAR, p.data_nascimento, CURDATE())    AS idade,
       COUNT(c.id)                                          AS doses_devidas,
       SUM(EXISTS (SELECT 1 FROM vacinas_aplicadas v
                    WHERE v.dose_id = c.id
                      AND v.paciente_id = p.paciente_id
                      AND v.dependente_id <=> p.dependente_id)) AS aplicadas,
       COUNT(c.id) - SUM(EXISTS (SELECT 1 FROM vacinas_aplicadas v
                    WHERE v.dose_id = c.id
                      AND v.paciente_id = p.paciente_id
                      AND v.dependente_id <=> p.dependente_id)) AS atrasadas,
       ROUND(100 * SUM(EXISTS (SELECT 1 FROM vacinas_aplicadas v
                    WHERE v.dose_id = c.id
                      AND v.paciente_id = p.paciente_id
                      AND v.dependente_id <=> p.dependente_id)) / COUNT(c.id), 1)
                                                            AS pct_cobertura
FROM pessoas p
JOIN calendario_vacinal c
  ON c.publico = 'crianca'
 AND c.idade_meses IS NOT NULL
 AND DATE_ADD(p.data_nascimento, INTERVAL c.idade_meses MONTH) <= CURDATE()
-- Mesma trava do CarteiraVacinal.IDADE_LIMITE_CRIANCA: sem ela todo adulto
-- aparece com o calendário infantil inteiro "em atraso", porque as datas
-- recomendadas passaram todas há anos e nada dali é cobrável de quem cresceu.
WHERE TIMESTAMPDIFF(YEAR, p.data_nascimento, CURDATE()) < 13
GROUP BY p.paciente_id, p.dependente_id, p.nome, p.data_nascimento
ORDER BY pct_cobertura ASC;

-- ------------------------------------------------------------
-- 4. Especialidades mais procuradas (função de janela: RANK e SUM OVER)
--    O percentual sai de SUM(...) OVER (), que enxerga o total geral sem
--    precisar de uma segunda passada pela tabela.
-- ------------------------------------------------------------
SELECT RANK()     OVER (ORDER BY COUNT(*) DESC)                       AS posicao,
       COALESCE(m.especialidade, c.especialidade, '(nao informada)')  AS especialidade,
       COUNT(*)                                                       AS consultas,
       ROUND(100 * COUNT(*) / SUM(COUNT(*)) OVER (), 1)               AS pct_do_total,
       SUM(c.origem = 'paciente')                                     AS anotadas_pelo_paciente,
       MAX(c.data)                                                    AS mais_recente
FROM consultas c
LEFT JOIN medicos m ON m.id = c.medico_id
GROUP BY COALESCE(m.especialidade, c.especialidade, '(nao informada)')
ORDER BY consultas DESC;

-- ------------------------------------------------------------
-- 5. Intervalo entre atendimentos (função de janela LAG)
--    LAG pega a data da consulta anterior da MESMA pessoa; a diferença
--    entre as duas é o intervalo de retorno. É a métrica que diz se o
--    aviso "faz tempo que você não se consulta" está bem calibrado.
-- ------------------------------------------------------------
WITH realizadas AS (
    SELECT c.paciente_id,
           c.dependente_id,
           COALESCE(d.nome, p.nome) AS pessoa,
           c.data,
           LAG(c.data) OVER (PARTITION BY c.paciente_id, c.dependente_id
                             ORDER BY c.data) AS anterior
    FROM consultas c
    JOIN pacientes p ON p.id = c.paciente_id
    LEFT JOIN dependentes d ON d.id = c.dependente_id
    WHERE c.status = 'realizada'
)
SELECT pessoa,
       COUNT(*) + 1                                   AS consultas_realizadas,
       MIN(DATEDIFF(data, anterior))                  AS menor_intervalo_dias,
       ROUND(AVG(DATEDIFF(data, anterior)))           AS intervalo_medio_dias,
       MAX(DATEDIFF(data, anterior))                  AS maior_intervalo_dias
FROM realizadas
WHERE anterior IS NOT NULL
GROUP BY paciente_id, dependente_id, pessoa
ORDER BY intervalo_medio_dias DESC;

-- ------------------------------------------------------------
-- 6. Qualidade do espelho do CNES, por município
--    Mede o cache da Rede de Saúde: quantas unidades de cada tipo,
--    quanto já passou pela conferência de coordenada e quantas ainda
--    estão com a coordenada arredondada (a assinatura do defeito).
-- ------------------------------------------------------------
SELECT u.codigo_municipio                                           AS municipio_ibge,
       COUNT(*)                                                     AS unidades,
       SUM(u.tipo = 'ubs')                                          AS ubs,
       SUM(u.tipo = 'upa')                                          AS upa,
       SUM(u.tipo = 'pronto_socorro')                               AS pronto_socorro,
       SUM(u.cep_conferido = 1)                                     AS coord_conferidas,
       ROUND(100 * SUM(u.cep_conferido = 1) / COUNT(*), 1)          AS pct_conferido,
       SUM(u.latitude = ROUND(u.latitude, 4)
           AND u.longitude = ROUND(u.longitude, 4))                 AS coord_arredondadas,
       ROUND(100 * COUNT(*) / SUM(COUNT(*)) OVER (), 1)             AS pct_do_espelho
FROM unidades_saude u
GROUP BY u.codigo_municipio
ORDER BY unidades DESC;

-- ------------------------------------------------------------
-- 7. Trilha de auditoria: o que mais acontece na conta
--    GROUP BY com HAVING contra uma SUBCONSULTA (a média de ocorrências
--    por ação). Mostra só o que acontece acima da média, que é o que
--    vale vigiar — e confirma se o agrupamento de 10 min da fila está
--    segurando a repetição das leituras de tela.
-- ------------------------------------------------------------
SELECT a.acao,
       COUNT(*)                                                  AS ocorrencias,
       COUNT(DISTINCT a.paciente_id)                             AS pacientes,
       SUM(a.dependente_id IS NOT NULL)                          AS sobre_dependente,
       MIN(a.criado_em)                                          AS primeira,
       MAX(a.criado_em)                                          AS ultima,
       ROUND(COUNT(*) / GREATEST(1, DATEDIFF(MAX(a.criado_em), MIN(a.criado_em))), 1)
                                                                 AS por_dia
FROM auditoria a
GROUP BY a.acao
HAVING ocorrencias > (SELECT COUNT(*) / COUNT(DISTINCT acao) FROM auditoria)
ORDER BY ocorrencias DESC;
