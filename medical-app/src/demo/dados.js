// Dados fictícios da demonstração — o "banco" que o servidor.js consulta.
//
// A história clínica é a mesma do database/seed-caio.sql (check-up, joelho,
// anemia por falta de ferro, palpitações, retorno), com o paciente e os
// dependentes inventados. CPF, telefone e e-mail não existem.
//
// As datas são RELATIVAS ao dia em que a página abre: a demonstração vai ser
// aberta por QR Code numa feira, semanas depois de publicada, e datas fixas
// fariam a "consulta daqui a 2 dias" virar uma consulta de mês passado. Cada
// `dia(n)` é hoje + n dias.

import { CALENDARIO_CRIANCA, CALENDARIO_ADULTO } from '../data/vacinas';

const DOIS = (n) => String(n).padStart(2, '0');

function iso(d) {
  return `${d.getFullYear()}-${DOIS(d.getMonth() + 1)}-${DOIS(d.getDate())}`;
}

/** Data ISO de hoje + n dias. */
export function dia(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
}

/** Data e hora ISO (como o backend devolve criado_em) de hoje + n dias. */
export function momento(n, hora) {
  return `${dia(n)}T${hora}:00`;
}

/** Data ISO de hoje menos `anos` anos e `meses` meses. */
function nascido(anos, meses = 0) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - anos);
  d.setMonth(d.getMonth() - meses);
  return iso(d);
}

// --- Profissionais (tabela `medicos`) ---------------------------------------
const ANA = { id: 1, nome: 'Dra. Ana Souza', especialidade: 'Clínico Geral', crm: '123456-SP' };
const RAFAEL = { id: 2, nome: 'Dr. Rafael Lima', especialidade: 'Cardiologista', crm: '445120-SP' };
const PAULO = { id: 3, nome: 'Dr. Paulo Menezes', especialidade: 'Ortopedista', crm: '332118-SP' };
const CARLA = { id: 4, nome: 'Dra. Carla Ribeiro', especialidade: 'Pediatra', crm: '667432-SP' };

const UBS = 'UBS Nossa Senhora do Brasil Armando Darienzo';
const UBS_CNES = 2788144;
const LABORATORIO = 'Laboratório da UBS Nossa Senhora do Brasil';

// Os dependentes. Helena é recém-nascida de propósito: mostra o estado vazio
// das telas clínicas, que também precisa aparecer na demonstração.
const HELENA = 1;
const LUCAS = 2;

/**
 * O calendário do PNI com os ids que a tabela `calendario_vacinal` teria. O
 * `protege` herda da primeira dose da mesma vacina, como a tela espera.
 */
export function calendario() {
  const doses = [];
  const montar = (lista, publico, base) => {
    const protecao = {};
    lista.forEach((v, i) => {
      if (v.protege) protecao[v.vacina] = v.protege;
      doses.push({
        id: base + i,
        publico,
        vacina: v.vacina,
        dose: v.dose,
        idadeMeses: v.idadeMeses ?? null,
        periodo: v.periodo,
        protege: v.protege || protecao[v.vacina] || null,
      });
    });
  };
  montar(CALENDARIO_CRIANCA, 'crianca', 1);
  montar(CALENDARIO_ADULTO, 'adulto', 101);
  return doses;
}

/** Data em que a dose de idade `meses` foi tomada por quem nasceu em `nasc`. */
function aplicadaAos(nasc, meses, folgaDias = 3) {
  const d = new Date(`${nasc}T00:00:00`);
  d.setMonth(d.getMonth() + meses);
  d.setDate(d.getDate() + folgaDias);
  return iso(d);
}

/** Estado inicial, montado a cada carregamento da página. */
export function criarEstado() {
  const paciente = {
    id: 1,
    nome: 'Gabriel Almeida Santos',
    email: 'gabriel@example.com',
    telefone: '11987654321',
    cpf: '12345678909',
    genero: 'Masculino',
    tipo_sanguineo: 'O+',
    data_nascimento: '1994-04-12',
    cep: '01310200',
    rua: 'Avenida Paulista',
    numero: '1578',
    bairro: 'Bela Vista',
    cidade: 'São Paulo',
    estado: 'SP',
  };

  const dependentes = [
    {
      id: HELENA, nome: 'Helena Almeida Santos', cpf: '98765432100',
      genero: 'Feminino', tipo_sanguineo: 'A+', data_nascimento: dia(-100),
    },
    {
      id: LUCAS, nome: 'Lucas Almeida Santos', cpf: '45678912300',
      genero: 'Masculino', tipo_sanguineo: 'O+', data_nascimento: nascido(8, 2),
    },
  ];

  // Consulta: `medico` é a linha de `medicos` (consulta do profissional) ou o
  // nome digitado pelo paciente (origem 'paciente'), como no COALESCE do
  // ConsultaDAO.
  const consulta = (c) => ({
    dependente_id: null, origem: 'medico', resumo: null, conduta: null, unidade_cnes: null, ...c,
  });

  const consultas = [
    consulta({
      id: 1, data: dia(-575), hora: '09:00:00', medico: ANA, local: UBS, unidade_cnes: UBS_CNES,
      motivo: 'Check-up anual', status: 'realizada',
      resumo: 'Paciente assintomático. Exame físico sem alterações e pressão arterial de 118/76 mmHg.',
      conduta: 'Solicitados exames laboratoriais de rotina. Manter atividade física regular.',
    }),
    consulta({
      id: 2, data: dia(-385), hora: '16:00:00', medico: PAULO, local: 'Clínica Ortopédica Vila Mariana',
      motivo: 'Dor no joelho direito', status: 'realizada',
      resumo: 'Dor anterior no joelho direito há três semanas, após aumento da carga de corrida. Sem instabilidade nem derrame articular.',
      conduta: 'Solicitada ressonância do joelho direito. Repouso da corrida por 15 dias e início de fisioterapia.',
    }),
    consulta({
      id: 3, data: dia(-235), hora: '10:15:00', medico: ANA, local: UBS, unidade_cnes: UBS_CNES,
      motivo: 'Cansaço e queda de rendimento', status: 'realizada',
      resumo: 'Queixa de cansaço há cerca de dois meses. Exame físico com discreta palidez de mucosas.',
      conduta: 'Solicitados hemograma, ferritina, vitamina D e ultrassom de abdome. Retorno com os resultados.',
    }),
    consulta({
      id: 4, data: dia(-160), hora: '14:00:00', medico: RAFAEL, local: 'Instituto do Coração, Sala 15',
      motivo: 'Palpitações ocasionais', status: 'realizada',
      resumo: 'Palpitações de curta duração, sem dor torácica ou desmaio. Ecocardiograma sem alterações estruturais.',
      conduta: 'Reduzir cafeína e melhorar a higiene do sono. Retorno em seis meses para reavaliação.',
    }),
    consulta({
      id: 5, data: dia(-90), hora: '11:00:00', medico: ANA, local: UBS, unidade_cnes: UBS_CNES,
      motivo: 'Retorno com resultados', status: 'realizada',
      resumo: 'Melhora do cansaço após a reposição de ferro. Hemoglobina e ferritina normalizadas; vitamina D ainda abaixo da referência.',
      conduta: 'Manter a vitamina D3 por mais três meses e repetir a dosagem. Suspender o sulfato ferroso.',
    }),
    // Anotada pelo paciente e com a data já passada: é a que mostra os botões
    // "Sim, fui" e "Foi cancelada".
    consulta({
      id: 6, data: dia(-6), hora: '07:30:00', origem: 'paciente',
      medico: { nome: 'Dra. Juliana Prado', especialidade: 'Fisioterapeuta' },
      local: 'Clínica Ortopédica Vila Mariana', motivo: 'Fisioterapia do joelho', status: 'agendada',
    }),
    // Agendada pelo profissional, daqui a 2 dias: gera o aviso vermelho e o
    // lembrete do card "Novidades".
    consulta({
      id: 7, data: dia(2), hora: '14:30:00', medico: RAFAEL, local: 'Instituto do Coração, Sala 15',
      motivo: 'Retorno cardiológico', status: 'agendada',
    }),
    consulta({
      id: 8, data: dia(19), hora: '09:30:00', origem: 'paciente',
      medico: { nome: 'Dra. Beatriz Nunes', especialidade: 'Dermatologista' },
      local: 'Clínica Derma Paulista, Sala 7', motivo: 'Avaliação de lesão de pele', status: 'agendada',
    }),
    consulta({
      id: 9, data: dia(50), hora: '08:30:00', origem: 'paciente',
      medico: { nome: ANA.nome, especialidade: ANA.especialidade },
      local: UBS, unidade_cnes: UBS_CNES, motivo: 'Check-up anual', status: 'agendada',
    }),
    // Do Lucas: uma atendida pela pediatra e uma anotada pelo pai.
    consulta({
      id: 51, dependente_id: LUCAS, data: dia(-120), hora: '15:20:00', medico: CARLA,
      local: UBS, unidade_cnes: UBS_CNES, motivo: 'Consulta de rotina', status: 'realizada',
      resumo: 'Crescimento e desenvolvimento dentro do esperado para a idade. Peso e altura no percentil 60.',
      conduta: 'Manter acompanhamento anual. Reforçada a orientação sobre tempo de tela e atividade física.',
    }),
    consulta({
      id: 52, dependente_id: LUCAS, data: dia(9), hora: '10:00:00', origem: 'paciente',
      medico: { nome: 'Dr. Tiago Moura', especialidade: 'Odontopediatra' },
      local: 'UBS Humaita Dr Joao de Azevedo Lage', unidade_cnes: 2787113,
      motivo: 'Avaliação odontológica', status: 'agendada',
    }),
  ];

  const item = (id, nome, valor, unidade, refMin, refMax) => ({
    id, nome, valor, unidade, ref_min: refMin, ref_max: refMax,
  });

  const exames = [
    {
      id: 1, dependente_id: null, consulta_id: 1, tipo: 'sangue', data: dia(-573), local: LABORATORIO,
      nome: null, laudo: null, solicitante: ANA,
      itens: [
        item(1, 'Hemoglobina', 15.2, 'g/dL', 13, 17),
        item(2, 'Leucócitos', 6800, '/mm³', 4000, 11000),
        item(3, 'Plaquetas', 245000, '/mm³', 150000, 450000),
        item(4, 'Glicose (jejum)', 88, 'mg/dL', 70, 99),
        item(5, 'Colesterol total', 178, 'mg/dL', 0, 200),
        item(6, 'HDL', 54, 'mg/dL', 40, 100),
        item(7, 'Triglicerídeos', 112, 'mg/dL', 0, 150),
        item(8, 'Creatinina', 0.95, 'mg/dL', 0.7, 1.3),
      ],
    },
    {
      id: 2, dependente_id: null, consulta_id: 3, tipo: 'sangue', data: dia(-233), local: LABORATORIO,
      nome: null, laudo: null, solicitante: ANA,
      itens: [
        item(9, 'Hemoglobina', 12.8, 'g/dL', 13, 17),
        item(10, 'Ferritina', 18, 'ng/mL', 30, 400),
        item(11, 'Vitamina D (25-OH)', 21, 'ng/mL', 30, 100),
        item(12, 'Glicose (jejum)', 94, 'mg/dL', 70, 99),
        item(13, 'Colesterol total', 196, 'mg/dL', 0, 200),
        item(14, 'LDL', 128, 'mg/dL', 0, 130),
        item(15, 'TSH', 2.1, 'µUI/mL', 0.4, 4.5),
        item(16, 'Creatinina', 1.02, 'mg/dL', 0.7, 1.3),
      ],
    },
    {
      id: 3, dependente_id: null, consulta_id: 5, tipo: 'sangue', data: dia(-88), local: LABORATORIO,
      nome: null, laudo: null, solicitante: ANA,
      itens: [
        item(17, 'Hemoglobina', 14.1, 'g/dL', 13, 17),
        item(18, 'Ferritina', 46, 'ng/mL', 30, 400),
        item(19, 'Vitamina D (25-OH)', 28, 'ng/mL', 30, 100),
        item(20, 'Glicose (jejum)', 89, 'mg/dL', 70, 99),
        item(21, 'Colesterol total', 181, 'mg/dL', 0, 200),
        item(22, 'LDL', 112, 'mg/dL', 0, 130),
        item(23, 'TSH', 1.9, 'µUI/mL', 0.4, 4.5),
        item(24, 'Creatinina', 0.98, 'mg/dL', 0.7, 1.3),
      ],
    },
    {
      id: 101, dependente_id: null, consulta_id: 2, tipo: 'imagem', data: dia(-382),
      local: 'Hospital São Camilo — Setor de Imagem', solicitante: PAULO, itens: [],
      nome: 'Ressonância magnética do joelho direito',
      laudo: 'Discreto edema no tendão patelar, compatível com tendinopatia por sobrecarga. Meniscos e ligamentos cruzados sem sinais de lesão.',
    },
    {
      id: 102, dependente_id: null, consulta_id: 3, tipo: 'imagem', data: dia(-233),
      local: 'Hospital São Camilo — Setor de Imagem', solicitante: ANA, itens: [],
      nome: 'Ultrassonografia de abdome total',
      laudo: 'Fígado, vias biliares, pâncreas, rins e baço com dimensões e ecotextura normais. Ausência de cálculos.',
    },
    {
      id: 103, dependente_id: null, consulta_id: 4, tipo: 'imagem', data: dia(-160),
      local: 'Instituto do Coração — Setor de Métodos Gráficos', solicitante: RAFAEL, itens: [],
      nome: 'Ecocardiograma transtorácico',
      laudo: 'Função sistólica do ventrículo esquerdo preservada (fração de ejeção de 62%). Câmaras cardíacas de dimensões normais e valvas sem alterações significativas.',
    },
    {
      id: 71, dependente_id: LUCAS, consulta_id: 51, tipo: 'sangue', data: dia(-118), local: LABORATORIO,
      nome: null, laudo: null, solicitante: CARLA,
      itens: [
        item(201, 'Hemoglobina', 12.9, 'g/dL', 11.5, 15.5),
        item(202, 'Leucócitos', 7200, '/mm³', 4500, 13500),
        item(203, 'Glicose (jejum)', 84, 'mg/dL', 70, 99),
      ],
    },
  ];

  // Prontuário: `dependente_id` null é o titular.
  const alergias = [
    { id: 1, dependente_id: null, descricao: 'Dipirona' },
    { id: 2, dependente_id: null, descricao: 'Frutos do mar (camarão)' },
    { id: 3, dependente_id: LUCAS, descricao: 'Amoxicilina' },
  ];
  const condicoes = [
    { id: 1, dependente_id: null, descricao: 'Rinite alérgica', desde: '2015-03-01' },
    { id: 2, dependente_id: null, descricao: 'Deficiência de vitamina D', desde: dia(-233) },
  ];
  const medicacoes = [
    { id: 1, dependente_id: null, nome: 'Vitamina D3', dosagem: '2.000 UI', frequencia: '1 cápsula por dia, após o almoço', desde: dia(-228) },
    { id: 2, dependente_id: null, nome: 'Loratadina', dosagem: '10mg', frequencia: '1 comprimido nas crises de rinite', desde: '2015-03-01' },
  ];

  const familiares = [
    { id: 1, nome: 'Marina Almeida Santos', parentesco: 'Mãe', telefone: '11991234567' },
    { id: 2, nome: 'Carlos Eduardo Santos', parentesco: 'Irmão', telefone: '11987651234' },
  ];

  // Carteira: { chave da pessoa: { doseId: data } }. A chave é 'titular' ou o
  // id do dependente. O Lucas tem tudo em dia menos duas doses dos 4 anos — é
  // o que faz aparecer o aviso de atraso e o bloco "Em atraso" na carteira.
  const doses = calendario();
  const crianca = doses.filter((d) => d.publico === 'crianca');
  const lucas = dependentes[1].data_nascimento;
  const helena = dependentes[0].data_nascimento;
  const pendentesLucas = new Set(['DTP|2º reforço', 'Varicela|2ª dose']);

  const vacinas = { titular: {}, [HELENA]: {}, [LUCAS]: {} };
  for (const d of crianca) {
    if (!pendentesLucas.has(`${d.vacina}|${d.dose}`)) {
      vacinas[LUCAS][d.id] = aplicadaAos(lucas, d.idadeMeses);
    }
    // Helena tomou tudo o que já venceu: aparece "em dia".
    const prevista = new Date(`${helena}T00:00:00`);
    prevista.setMonth(prevista.getMonth() + d.idadeMeses);
    if (prevista <= new Date()) {
      vacinas[HELENA][d.id] = aplicadaAos(helena, d.idadeMeses, 1);
    }
  }
  for (const d of doses.filter((x) => x.publico === 'adulto')) {
    if (['Hepatite B', 'Tríplice Viral', 'Febre Amarela', 'dT (Dupla adulto)'].includes(d.vacina)) {
      vacinas.titular[d.id] = '2019-05-14';
    }
    if (d.vacina === 'Influenza') vacinas.titular[d.id] = dia(-150);
  }

  const notificacoes = [
    { id: 4, tipo: 'lembrete', mensagem: 'Você tem consulta em 2 dias às 14:30 com Dr. Rafael Lima.', criado_em: momento(0, '07:00'), lida_em: null },
    { id: 3, tipo: 'vacina', mensagem: 'Dra. Carla Ribeiro registrou uma dose na carteira de vacinação de Lucas.', criado_em: momento(-118, '10:05'), lida_em: momento(-117, '19:00') },
    { id: 2, tipo: 'exame', mensagem: 'Dra. Ana Souza registrou um novo exame no prontuário de você.', criado_em: momento(-88, '09:12'), lida_em: null },
    { id: 1, tipo: 'consulta', mensagem: 'Dra. Ana Souza registrou uma consulta no prontuário de você.', criado_em: momento(-90, '11:41'), lida_em: momento(-89, '08:20') },
  ];

  // Códigos de acesso já usados (e vencidos) pelos profissionais.
  const acessos = [
    {
      id: 3, escopo: 'escrita', dependente_id: LUCAS, compartilha_contatos: false, codigo: null,
      criado_em: momento(-120, '15:10'), expira_em: momento(-120, '15:40'),
      usado_em: momento(-120, '15:12'), revogado_em: null, medico: CARLA,
    },
    {
      id: 2, escopo: 'escrita', dependente_id: null, compartilha_contatos: false, codigo: null,
      criado_em: momento(-90, '11:00'), expira_em: momento(-90, '11:30'),
      usado_em: momento(-90, '11:04'), revogado_em: null, medico: ANA,
    },
    {
      id: 1, escopo: 'leitura', dependente_id: null, compartilha_contatos: false, codigo: null,
      criado_em: momento(-160, '13:55'), expira_em: momento(-160, '14:25'),
      usado_em: momento(-160, '14:02'), revogado_em: null, medico: RAFAEL,
    },
  ];

  // Trilha do médico (acessos_log), da mais recente para a mais antiga.
  const logMedico = [
    { id: 9, acesso_id: 2, acao: 'registrou_exame', detalhe: '8 resultado(s)', criado_em: momento(-88, '09:12') },
    { id: 8, acesso_id: 2, acao: 'registrou_consulta', detalhe: 'Retorno com resultados', criado_em: momento(-90, '11:41') },
    { id: 7, acesso_id: 2, acao: 'leu_prontuario', detalhe: null, criado_em: momento(-90, '11:05') },
    { id: 6, acesso_id: 2, acao: 'entrou', detalhe: 'Dra. Ana Souza (CRM 123456-SP)', criado_em: momento(-90, '11:04') },
    { id: 5, acesso_id: 3, acao: 'registrou_vacina', detalhe: 'Tríplice Viral · 1ª dose', criado_em: momento(-120, '15:25') },
    { id: 4, acesso_id: 3, acao: 'leu_prontuario', detalhe: 'Prontuário de Lucas', criado_em: momento(-120, '15:13') },
    { id: 3, acesso_id: 3, acao: 'entrou', detalhe: 'Dra. Carla Ribeiro (CRM 667432-SP)', criado_em: momento(-120, '15:12') },
    { id: 2, acesso_id: 1, acao: 'leu_prontuario', detalhe: null, criado_em: momento(-160, '14:03') },
    { id: 1, acesso_id: 1, acao: 'entrou', detalhe: 'Dr. Rafael Lima (CRM 445120-SP)', criado_em: momento(-160, '14:02') },
  ];

  // Trilha do próprio paciente (tabela `auditoria`).
  const auditoria = [
    { id: 8, acao: 'exportou_exames', recurso: 'exames', dependente_id: null, criado_em: momento(-87, '20:03'), origem_ip: '187.45.9.120', detalhe: 'PDF de exames · titular · 3 coleta(s) e 3 exame(s) de imagem · protegido por senha' },
    { id: 7, acao: 'consultou_exames', recurso: 'exames', dependente_id: null, criado_em: momento(-87, '20:01'), origem_ip: '187.45.9.120', detalhe: null },
    { id: 6, acao: 'gerou_codigo', recurso: 'acessos', dependente_id: null, criado_em: momento(-90, '11:00'), origem_ip: '187.45.9.120', detalhe: 'Leitura e registro · titular · válido por 30 min.' },
    { id: 5, acao: 'gerou_codigo', recurso: 'acessos', dependente_id: LUCAS, criado_em: momento(-120, '15:10'), origem_ip: '187.45.9.120', detalhe: 'Leitura e registro · Lucas · válido por 30 min.' },
    { id: 4, acao: 'cadastrou_dependente', recurso: 'dependentes', dependente_id: HELENA, criado_em: momento(-98, '21:40'), origem_ip: '187.45.9.120', detalhe: 'Helena' },
    { id: 3, acao: 'gerou_codigo', recurso: 'acessos', dependente_id: null, criado_em: momento(-160, '13:55'), origem_ip: '187.45.9.120', detalhe: 'Somente leitura · titular · válido por 30 min.' },
    { id: 2, acao: 'login', recurso: 'conta', dependente_id: null, criado_em: momento(-161, '19:38'), origem_ip: '187.45.9.120', detalhe: null },
    { id: 1, acao: 'login_falhou', recurso: 'conta', dependente_id: null, criado_em: momento(-161, '19:37'), origem_ip: '201.17.88.4', detalhe: 'Senha incorreta.' },
  ];

  return {
    paciente,
    unidadeReferencia: UBS_CNES,
    dependentes,
    consultas,
    exames,
    alergias,
    condicoes,
    medicacoes,
    familiares,
    vacinas,
    notificacoes,
    acessos,
    logMedico,
    auditoria,
    medicos: [ANA, RAFAEL, PAULO, CARLA],
    proximoId: 1000,
  };
}
