-- SaúdeConecta — Dados de exemplo (opcional)
-- Rode depois do schema.sql. A senha do paciente abaixo é: Teste@123
-- (hash bcrypt gerado pelo backend Node; o app Java usa SHA-256 próprio).

USE saudeconecta;

-- Paciente de exemplo (senha bcrypt de "Teste@123")
INSERT INTO pacientes (nome, email, telefone, cpf, genero, tipo_sanguineo, senha_hash, data_nascimento,
                       cep, rua, numero, bairro, cidade, estado)
SELECT 'Gabriel Ferreira', 'gabriel@gmail.com', '11999999999', '12345678900',
       'Masculino', 'O+', '$2a$10$XEmy6OcgFz8I26fw6v0PKO9xyiEPMB3mwYQqJcs8MvaFddjiCnzVS', '2007-06-02',
       '01310100', 'Avenida Paulista', '1000', 'Bela Vista', 'São Paulo', 'SP'
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE email = 'gabriel@gmail.com');

-- Dependente de exemplo vinculado ao paciente acima
INSERT INTO dependentes (paciente_id, nome, cpf, genero, tipo_sanguineo, data_nascimento)
SELECT p.id, 'Helena Ferreira', '98765432100', 'Feminino', 'A+', '2015-09-12'
FROM pacientes p
WHERE p.email = 'gabriel@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM dependentes WHERE cpf = '98765432100');
