-- ============================================================
--  Revisão do glossário (explicacoes_ia)
--
--  O texto do "?" dos exames e das vacinas é escrito por um modelo de
--  IA e mostrado a todos os pacientes. Ninguém aprova antes; o que
--  existe é o caminho de volta: o paciente relata um problema
--  (explicacoes_reportes), e com relatos de 2 pessoas diferentes o
--  verbete sai do ar sozinho (status = 'suspensa').
--
--  Este arquivo NÃO é para rodar inteiro: são as consultas que quem
--  revisa usa, uma de cada vez. Não existe tela de administração no
--  app — é trabalho de faculdade, e uma tela dessas exigiria um perfil
--  de administrador que o projeto não tem.
--
--  mysql -u root -p --default-character-set=utf8mb4 saudeconecta
-- ============================================================

USE saudeconecta;

-- 1) O que espera revisão: suspensos primeiro, depois os mais relatados.
SELECT e.id, e.tipo, e.rotulo, e.status, e.modelo,
       COUNT(r.id)                         AS relatos,
       SUM(r.motivo = 'errado')            AS errado,
       SUM(r.motivo = 'confuso')           AS confuso,
       SUM(r.motivo = 'resultado')         AS fala_de_resultado
  FROM explicacoes_ia e
  JOIN explicacoes_reportes r ON r.explicacao_id = e.id
 GROUP BY e.id, e.tipo, e.rotulo, e.status, e.modelo
 ORDER BY e.status = 'suspensa' DESC, relatos DESC;

-- 2) Ler o texto de um verbete.
-- SELECT texto FROM explicacoes_ia WHERE id = ?;

-- 3a) O texto está certo: aprova, devolve ao ar e descarta os relatos.
--     revisado_em faz a tela dizer "conferido pela equipe" e impede que
--     relatos automáticos derrubem o texto de novo.
-- UPDATE explicacoes_ia SET status = 'publicada', revisado_em = NOW() WHERE id = ?;
-- DELETE FROM explicacoes_reportes WHERE explicacao_id = ?;

-- 3b) O texto está errado mas dá para corrigir à mão.
-- UPDATE explicacoes_ia
--    SET texto = '...', modelo = 'revisão manual', status = 'publicada', revisado_em = NOW()
--  WHERE id = ?;
-- DELETE FROM explicacoes_reportes WHERE explicacao_id = ?;

-- 3c) Descartar: o próximo paciente que tocar no "?" recebe um texto
--     novo do modelo. Os relatos vão junto (ON DELETE CASCADE).
-- DELETE FROM explicacoes_ia WHERE id = ?;
