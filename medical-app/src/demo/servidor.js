// Servidor de mentira da demonstração.
//
// No build de demonstração (`npm run build:demo`) o axios não vai à rede: o
// services/api.js troca o `adapter` dele por `responder`, abaixo, que atende a
// mesma rota com o mesmo JSON que o ApiServer devolveria — snake_case, mesmos
// nomes de campo, mesmas mensagens de erro em `{ erro }`. As telas e os
// services são os do app, sem nenhuma linha a mais; é isso que impede a
// demonstração de envelhecer sozinha, como aconteceu com a versão HTML escrita
// à mão que ela substitui.
//
// Tudo mora na memória da página: recarregar volta ao estado inicial, e nada
// do que o visitante digita sai do navegador. O que depende de servidor de
// verdade (a IA do chatbot e do glossário novo) responde como o app responde
// quando a IA está fora do ar.

import { AxiosError } from 'axios';
import { criarEstado, calendario } from './dados';
import { GLOSSARIO } from './glossario';
import {
  MUNICIPIO_SAO_PAULO, MUNICIPIO_GUARULHOS, UNIDADES_SAO_PAULO, UNIDADES_GUARULHOS,
} from './unidades';

const estado = criarEstado();
const CALENDARIO = calendario();

// Mesmas constantes do backend.
const VALIDADE_ACESSO_MINUTOS = 30;
const MINUTOS_AGRUPAMENTO = 10;
const DIAS_CONSULTA_PROXIMA = 30;
const DIAS_EXAME_ALERTA = 180;
const DIAS_CONSULTA_ALERTA = 365;
const IDADE_LIMITE_CRIANCA = 13;
const ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LATENCIA_MS = 150;

// Campanhas oficiais de 2026, as mesmas do seed.sql (só aparecem no período).
const CAMPANHAS = [
  { vacina: 'Influenza (gripe)', publico_alvo: 'Grupos prioritários das regiões Nordeste, Centro-Oeste, Sul e Sudeste', inicio: '2026-03-28', fim: '2026-05-30' },
  { vacina: 'Multivacinação', publico_alvo: 'Menores de 15 anos, nas escolas', inicio: '2026-04-01', fim: '2026-05-31' },
  { vacina: 'Multivacinação', publico_alvo: 'Crianças e adolescentes menores de 15 anos', inicio: '2026-08-03', fim: '2026-09-01' },
];

// ===================== utilidades =====================

class ErroHttp extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

const falhar = (status, mensagem) => {
  throw new ErroHttp(status, mensagem);
};

const DOIS = (n) => String(n).padStart(2, '0');

function hojeIso() {
  const d = new Date();
  return `${d.getFullYear()}-${DOIS(d.getMonth() + 1)}-${DOIS(d.getDate())}`;
}

function agoraIso(somarMinutos = 0) {
  const d = new Date(Date.now() + somarMinutos * 60000);
  return `${d.getFullYear()}-${DOIS(d.getMonth() + 1)}-${DOIS(d.getDate())}T`
    + `${DOIS(d.getHours())}:${DOIS(d.getMinutes())}:${DOIS(d.getSeconds())}`;
}

/** Dias de `a` até `b` (datas ISO), como o DATEDIFF do MySQL. */
function diasEntre(a, b) {
  const t = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  return Math.round((t(b) - t(a)) / 86400000);
}

function formatarData(iso) {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

function primeiroNome(nome) {
  if (!nome) return null;
  const limpo = nome.trim();
  return limpo.split(/\s+/)[0] || null;
}

function apenasDigitos(t) {
  return String(t ?? '').replace(/\D/g, '');
}

/** Campo de texto do corpo: vazio vira null, como o `campo()` do ApiServer. */
function campo(corpo, nome) {
  const v = corpo?.[nome];
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t === '' ? null : t;
}

function idade(nasc) {
  if (!nasc) return null;
  const n = new Date(`${nasc.slice(0, 10)}T00:00:00`);
  const h = new Date();
  let anos = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) anos--;
  return anos;
}

function novoId() {
  estado.proximoId += 1;
  return estado.proximoId;
}

function dependente(id) {
  return estado.dependentes.find((d) => d.id === Number(id)) || null;
}

/** `?dependenteId=` → número, ou null para o titular. 404 se não for da conta. */
function idDependente(params) {
  const v = params?.dependenteId;
  if (v === undefined || v === null || v === '') return null;
  if (!dependente(v)) falhar(404, 'Dependente não encontrado.');
  return Number(v);
}

const ehDe = (depId) => (x) => (x.dependente_id ?? null) === depId;

// ===================== trilha de auditoria =====================

/** Mesma ideia do AuditoriaDAO: leituras repetidas em 10 min viram uma linha. */
function auditar(acao, recurso, detalhe = null, depId = null, leitura = false) {
  if (leitura) {
    const limite = agoraIso(-MINUTOS_AGRUPAMENTO);
    const repetida = estado.auditoria.find((r) => r.acao === acao && r.detalhe === detalhe
      && (r.dependente_id ?? null) === depId && r.criado_em >= limite);
    if (repetida) return;
  }
  estado.auditoria.unshift({
    id: novoId(), acao, recurso, detalhe, dependente_id: depId, criado_em: agoraIso(), origem_ip: null,
  });
}

function alvoDaLeitura(depId) {
  return depId == null ? null : primeiroNome(dependente(depId)?.nome);
}

function registrarLog(acessoId, acao, detalhe = null) {
  estado.logMedico.unshift({ id: novoId(), acesso_id: acessoId, acao, detalhe, criado_em: agoraIso() });
}

function notificar(tipo, mensagem) {
  estado.notificacoes.unshift({ id: novoId(), tipo, mensagem, criado_em: agoraIso(), lida_em: null });
}

// ===================== serialização (igual ao ApiServer) =====================

function medicoJson(m) {
  if (!m) return null;
  return { id: m.id ?? null, nome: m.nome, especialidade: m.especialidade, crm: m.crm ?? null };
}

function consultaJson(c) {
  return {
    id: c.id, dependente_id: c.dependente_id ?? null, data: c.data, hora: c.hora, local: c.local,
    motivo: c.motivo, status: c.status, origem: c.origem, resumo: c.resumo, conduta: c.conduta,
    unidade_cnes: c.unidade_cnes ?? null, medico: medicoJson(c.medico),
  };
}

function exameJson(e) {
  return {
    id: e.id, dependente_id: e.dependente_id ?? null, consulta_id: e.consulta_id ?? null, tipo: e.tipo,
    data: e.data, local: e.local, nome: e.nome, laudo: e.laudo, solicitante: medicoJson(e.solicitante),
    itens: e.itens.map((i) => ({ ...i })),
  };
}

function dependenteJson(d) {
  const { id, nome, cpf, genero, tipo_sanguineo, data_nascimento } = d;
  return { id, nome, cpf, genero, tipo_sanguineo, data_nascimento };
}

function acessoJson(a) {
  return {
    id: a.id, escopo: a.escopo,
    dependente: a.dependente_id == null ? null : primeiroNome(dependente(a.dependente_id)?.nome),
    compartilha_contatos: a.compartilha_contatos, criado_em: a.criado_em, expira_em: a.expira_em,
    usado_em: a.usado_em, revogado_em: a.revogado_em, medico: medicoJson(a.medico),
  };
}

function acessoLogJson(l) {
  const acesso = estado.acessos.find((a) => a.id === l.acesso_id);
  return {
    id: l.id, acesso_id: l.acesso_id, acao: l.acao, detalhe: l.detalhe, criado_em: l.criado_em,
    escopo: acesso?.escopo ?? null, medico: medicoJson(acesso?.medico),
  };
}

function resumoPessoa(p) {
  return { nome: p.nome, data_nascimento: p.data_nascimento, genero: p.genero, tipo_sanguineo: p.tipo_sanguineo };
}

const porDataDesc = (a, b) => `${b.data}${b.hora || ''}`.localeCompare(`${a.data}${a.hora || ''}`);

// ===================== carteira de vacinação =====================

function carteira(depId) {
  const pessoa = depId == null ? estado.paciente : dependente(depId);
  const nasc = pessoa.data_nascimento;
  const anos = idade(nasc);
  const publico = anos != null && anos < IDADE_LIMITE_CRIANCA ? 'crianca' : 'adulto';
  const aplicadas = estado.vacinas[depId == null ? 'titular' : depId] || {};
  const hoje = hojeIso();

  let nAplicadas = 0;
  let nAtrasadas = 0;
  const doses = CALENDARIO.filter((d) => d.publico === publico).map((d) => {
    const aplicadaEm = aplicadas[d.id] || null;
    let prevista = null;
    let status;
    if (aplicadaEm) {
      status = 'aplicada';
    } else if (d.idadeMeses == null || !nasc) {
      status = 'prevista';
    } else {
      const p = new Date(`${nasc}T00:00:00`);
      p.setMonth(p.getMonth() + d.idadeMeses);
      prevista = `${p.getFullYear()}-${DOIS(p.getMonth() + 1)}-${DOIS(p.getDate())}`;
      status = prevista > hoje ? 'prevista' : 'atrasada';
    }
    if (status === 'aplicada') nAplicadas++;
    if (status === 'atrasada') nAtrasadas++;
    return {
      id: d.id, vacina: d.vacina, dose: d.dose, periodo: d.periodo, protege: d.protege,
      prevista, aplicada_em: aplicadaEm, origem: aplicadaEm ? 'medico' : null, status,
    };
  });

  return { publico, doses, resumo: { total: doses.length, aplicadas: nAplicadas, atrasadas: nAtrasadas } };
}

// ===================== avisos (mesmas regras do AvisoDAO) =====================

function humanizar(dias) {
  if (dias >= 365) {
    const anos = Math.floor(dias / 365);
    return anos === 1 ? '1 ano' : `${anos} anos`;
  }
  if (dias >= 60) return `${Math.floor(dias / 30)} meses`;
  return `${dias} dias`;
}

function avisosDaPessoa(depId, pessoa, avisos) {
  const hoje = hojeIso();

  const proxima = estado.consultas.filter(ehDe(depId))
    .filter((c) => c.status === 'agendada' && c.data >= hoje && diasEntre(hoje, c.data) <= DIAS_CONSULTA_PROXIMA)
    .sort((a, b) => a.data.localeCompare(b.data))[0];
  if (proxima) {
    const dias = diasEntre(hoje, proxima.data);
    const quando = dias === 0 ? 'Consulta hoje' : dias === 1 ? 'Consulta amanhã' : `Consulta em ${dias} dias`;
    avisos.push({
      tipo: 'consulta', titulo: `${quando} com ${proxima.medico?.nome}`, detalhe: proxima.local,
      severidade: dias <= 2 ? 'alta' : 'media', pessoa,
    });
  }

  const ultima = estado.exames.filter(ehDe(depId)).filter((e) => e.tipo === 'sangue')
    .sort(porDataDesc)[0];
  if (ultima) {
    const fora = ultima.itens.filter((i) => i.valor < i.ref_min || i.valor > i.ref_max).length;
    if (fora > 0) {
      avisos.push({
        tipo: 'resultado',
        titulo: fora === 1
          ? '1 resultado fora da faixa no último exame de sangue'
          : `${fora} resultados fora da faixa no último exame de sangue`,
        detalhe: `Coleta de ${formatarData(ultima.data)}`, severidade: 'alta', pessoa,
      });
    }
  }

  const { publico, resumo } = carteira(depId);
  if (publico === 'crianca' && resumo.atrasadas > 0) {
    avisos.push({
      tipo: 'vacina',
      titulo: resumo.atrasadas === 1 ? '1 dose de vacina em atraso' : `${resumo.atrasadas} doses de vacina em atraso`,
      detalhe: 'Confira a carteira de vacinação e leve o cartão ao posto.',
      severidade: resumo.atrasadas >= 3 ? 'alta' : 'media', pessoa,
    });
  }
}

function listarAvisos() {
  const avisos = [];
  const hoje = hojeIso();
  avisosDaPessoa(null, null, avisos);

  const exames = estado.exames.filter(ehDe(null)).sort(porDataDesc);
  if (!exames.length) {
    avisos.push({ tipo: 'exame', titulo: 'Nenhum exame registrado ainda', detalhe: 'Guarde seus resultados para acompanhar sua saúde ao longo do tempo.', severidade: 'media', pessoa: null });
  } else {
    const dias = diasEntre(exames[0].data, hoje);
    if (dias >= DIAS_EXAME_ALERTA) {
      avisos.push({ tipo: 'exame', titulo: `${humanizar(dias)} desde o último exame`, detalhe: `Último registro em ${formatarData(exames[0].data)}.`, severidade: dias >= 365 ? 'alta' : 'media', pessoa: null });
    }
  }

  const realizadas = estado.consultas.filter(ehDe(null)).filter((c) => c.status === 'realizada').sort(porDataDesc);
  if (realizadas.length && diasEntre(realizadas[0].data, hoje) >= DIAS_CONSULTA_ALERTA) {
    avisos.push({ tipo: 'consulta', titulo: `${humanizar(diasEntre(realizadas[0].data, hoje))} desde a última consulta`, detalhe: 'Vale agendar um check-up de rotina.', severidade: 'media', pessoa: null });
  }

  [...estado.dependentes].sort((a, b) => a.nome.localeCompare(b.nome))
    .forEach((d) => avisosDaPessoa(d.id, primeiroNome(d.nome), avisos));

  CAMPANHAS.filter((c) => hoje >= c.inicio && hoje <= c.fim)
    .sort((a, b) => a.fim.localeCompare(b.fim))
    .forEach((c) => {
      const dias = diasEntre(hoje, c.fim);
      const prazo = dias === 0 ? `Último dia da campanha de ${c.vacina}`
        : dias === 1 ? `1 dia para o fim da campanha de ${c.vacina}`
          : `${dias} dias para o fim da campanha de ${c.vacina}`;
      avisos.push({ tipo: 'campanha', titulo: prazo, detalhe: c.publico_alvo, severidade: dias <= 7 ? 'alta' : 'baixa', pessoa: null });
    });

  return ['alta', 'media', 'baixa'].flatMap((n) => avisos.filter((a) => a.severidade === n));
}

// ===================== rede de saúde =====================

const TODAS_UNIDADES = [...UNIDADES_SAO_PAULO, ...UNIDADES_GUARULHOS];

function unidadePorCnes(cnes) {
  return TODAS_UNIDADES.find((u) => u.codigo_cnes === Number(cnes)) || null;
}

/**
 * A demonstração tem duas cidades carregadas. A faixa de CEP decide qual:
 * Guarulhos vai de 07000 a 07399; o resto da Grande São Paulo cai na capital.
 */
function cidadeDoCep(cep) {
  const prefixo = Number(apenasDigitos(cep).slice(0, 5));
  if (prefixo >= 7000 && prefixo <= 7399) {
    return { cidade: 'Guarulhos', codigo_municipio: MUNICIPIO_GUARULHOS, unidades: UNIDADES_GUARULHOS };
  }
  if (prefixo >= 1000 && prefixo <= 5999) {
    return { cidade: 'São Paulo', codigo_municipio: MUNICIPIO_SAO_PAULO, unidades: UNIDADES_SAO_PAULO };
  }
  return null;
}

function unidadeJson(u) {
  return { ...u, servicos: [...u.servicos] };
}

// ===================== acesso do médico =====================

function gerarCodigo() {
  let s = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) s += '-';
    s += ALFABETO_CODIGO[Math.floor(Math.random() * ALFABETO_CODIGO.length)];
  }
  return s;
}

const normalizarCodigo = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

const acessoValido = (a) => a && !a.revogado_em && a.expira_em > agoraIso();

/** Confere o token do portal a cada chamada, como o autenticarMedico. */
function autenticarMedico(config) {
  const header = config.headers?.Authorization || config.headers?.authorization || '';
  const m = /^Bearer demo-medico-(\d+)$/.exec(String(header));
  if (!m) falhar(401, 'Token inválido ou expirado.');
  const acesso = estado.acessos.find((a) => a.id === Number(m[1]));
  if (!acessoValido(acesso)) falhar(401, 'Este acesso foi revogado pelo paciente ou expirou.');
  return acesso;
}

function exigirEscrita(acesso) {
  if (acesso.escopo !== 'escrita') falhar(403, 'Este acesso é somente leitura.');
}

const deQuem = (acesso) => (acesso.dependente_id == null ? 'você' : primeiroNome(dependente(acesso.dependente_id)?.nome));
const pessoaDoAcesso = (acesso) => (acesso.dependente_id == null ? estado.paciente : dependente(acesso.dependente_id));

// ===================== rotas =====================

// Cada rota: [método, padrão do caminho, função(ctx)]. `ctx` traz params da
// URL (:id), query, corpo e o config do axios.
const ROTAS = [
  // --- conta ---
  ['post', '/auth/login', ({ corpo }) => {
    if (!campo(corpo, 'email') || !campo(corpo, 'senha')) falhar(400, 'Email e senha são obrigatórios.');
    auditar('login', 'conta');
    return { paciente: { ...estado.paciente }, token: 'demo-paciente' };
  }],
  ['post', '/auth/register', ({ corpo }) => {
    const obrig = ['nome', 'email', 'senha', 'telefone', 'cpf', 'genero', 'tipoSanguineo', 'dataNascimento'];
    if (obrig.some((c) => !campo(corpo, c))) falhar(400, 'Preencha todos os dados pessoais obrigatórios.');
    if (!/^\d{11}$/.test(campo(corpo, 'cpf'))) falhar(400, 'O CPF deve ter exatamente 11 dígitos numéricos.');
    if (apenasDigitos(corpo.telefone).length < 10) falhar(400, 'Informe um telefone válido (com DDD).');
    // A conta nova fica com o histórico de demonstração: sem ele, quem se
    // cadastra na feira veria só telas vazias.
    Object.assign(estado.paciente, {
      nome: campo(corpo, 'nome'), email: campo(corpo, 'email'), telefone: campo(corpo, 'telefone'),
      cpf: campo(corpo, 'cpf'), genero: campo(corpo, 'genero'), tipo_sanguineo: campo(corpo, 'tipoSanguineo'),
      data_nascimento: campo(corpo, 'dataNascimento'), cep: apenasDigitos(corpo.cep) || null,
      rua: campo(corpo, 'rua'), numero: campo(corpo, 'numero'), bairro: campo(corpo, 'bairro'),
      cidade: campo(corpo, 'cidade'), estado: campo(corpo, 'estado'),
    });
    return [201, { paciente: { ...estado.paciente }, token: 'demo-paciente' }];
  }],
  ['get', '/auth/me', () => ({ paciente: { ...estado.paciente } })],
  ['put', '/auth/me', ({ corpo }) => {
    const p = estado.paciente;
    const telefone = campo(corpo, 'telefone') || p.telefone;
    if (apenasDigitos(telefone).length < 10) falhar(400, 'Informe um telefone válido com DDD.');
    const cep = apenasDigitos(corpo.cep);
    if (cep && cep.length !== 8) falhar(400, 'O CEP deve ter 8 dígitos.');
    const mudou = [];
    if (telefone !== p.telefone) mudou.push('telefone');
    if ((cep || null) !== (apenasDigitos(p.cep) || null)) mudou.push('CEP');
    const endereco = ['rua', 'numero', 'bairro', 'cidade', 'estado'];
    if (endereco.some((c) => (campo(corpo, c) || '') !== (p[c] || ''))) mudou.push('endereço');
    Object.assign(p, { telefone, cep: cep || null });
    endereco.forEach((c) => { p[c] = campo(corpo, c); });
    if (mudou.length) auditar('atualizou_perfil', 'conta', mudou.join(', '));
    return { paciente: { ...p } };
  }],
  ['post', '/auth/recuperar', ({ corpo }) => {
    if (!campo(corpo, 'email') || !apenasDigitos(corpo.cpf) || !campo(corpo, 'dataNascimento')) {
      falhar(400, 'Informe o e-mail, o CPF e a data de nascimento do cadastro.');
    }
    auditar('solicitou_senha', 'conta');
    return { token: 'demo-recuperacao', nome: primeiroNome(estado.paciente.nome), validade_minutos: 15 };
  }],
  ['post', '/auth/redefinir', ({ corpo }) => {
    if (!campo(corpo, 'token') || !campo(corpo, 'senha')) falhar(400, 'Informe o token da recuperação e a nova senha.');
    auditar('redefiniu_senha', 'conta');
    return { sucesso: true };
  }],

  // --- dependentes e contatos ---
  ['get', '/dependentes', () => ({ dependentes: estado.dependentes.map(dependenteJson) })],
  ['post', '/dependentes', ({ corpo }) => {
    const obrig = ['nome', 'cpf', 'genero', 'tipoSanguineo', 'dataNascimento'];
    if (obrig.some((c) => !campo(corpo, c))) falhar(400, 'Preencha todos os dados do dependente.');
    if (!/^\d{11}$/.test(campo(corpo, 'cpf'))) falhar(400, 'O CPF deve ter exatamente 11 dígitos numéricos.');
    const d = {
      id: novoId(), nome: campo(corpo, 'nome'), cpf: campo(corpo, 'cpf'), genero: campo(corpo, 'genero'),
      tipo_sanguineo: campo(corpo, 'tipoSanguineo'), data_nascimento: campo(corpo, 'dataNascimento'),
    };
    estado.dependentes.push(d);
    estado.vacinas[d.id] = {};
    auditar('cadastrou_dependente', 'dependentes', primeiroNome(d.nome), d.id);
    return [201, { dependente: dependenteJson(d) }];
  }],
  ['delete', '/dependentes/:id', ({ id }) => {
    const d = dependente(id);
    if (!d) falhar(404, 'Dependente não encontrado.');
    estado.dependentes = estado.dependentes.filter((x) => x !== d);
    // O ON DELETE CASCADE do banco leva junto o histórico clínico dele.
    for (const lista of ['consultas', 'exames', 'alergias', 'condicoes', 'medicacoes']) {
      estado[lista] = estado[lista].filter((x) => x.dependente_id !== d.id);
    }
    auditar('excluiu_dependente', 'dependentes', primeiroNome(d.nome));
    return { sucesso: true };
  }],
  ['get', '/familiares', () => ({ familiares: estado.familiares.map((f) => ({ ...f })) })],
  ['post', '/familiares', ({ corpo }) => {
    if (!campo(corpo, 'nome') || !campo(corpo, 'parentesco') || !campo(corpo, 'telefone')) {
      falhar(400, 'Informe o nome, o parentesco e o telefone do contato.');
    }
    if (apenasDigitos(corpo.telefone).length < 10) falhar(400, 'Informe um telefone válido (com DDD).');
    const f = { id: novoId(), nome: campo(corpo, 'nome'), parentesco: campo(corpo, 'parentesco'), telefone: campo(corpo, 'telefone') };
    estado.familiares.push(f);
    auditar('cadastrou_contato', 'contatos', primeiroNome(f.nome));
    return [201, { familiar: { ...f } }];
  }],
  ['delete', '/familiares/:id', ({ id }) => {
    const f = estado.familiares.find((x) => x.id === Number(id));
    if (!f) falhar(404, 'Contato não encontrado.');
    estado.familiares = estado.familiares.filter((x) => x !== f);
    auditar('excluiu_contato', 'contatos', primeiroNome(f.nome));
    return { sucesso: true };
  }],

  // --- notificações e avisos ---
  ['get', '/notificacoes', () => ({
    notificacoes: estado.notificacoes.map((n) => ({ ...n })),
    nao_lidas: estado.notificacoes.filter((n) => !n.lida_em).length,
  })],
  ['post', '/notificacoes/lidas', () => {
    const naoLidas = estado.notificacoes.filter((n) => !n.lida_em);
    naoLidas.forEach((n) => { n.lida_em = agoraIso(); });
    return { marcadas: naoLidas.length };
  }],
  ['post', '/notificacoes/:id/lida', ({ id }) => {
    const n = estado.notificacoes.find((x) => x.id === Number(id));
    if (n && !n.lida_em) n.lida_em = agoraIso();
    return { sucesso: true, nao_lidas: estado.notificacoes.filter((x) => !x.lida_em).length };
  }],
  ['get', '/avisos', () => ({ avisos: listarAvisos() })],

  // --- dados clínicos ---
  ['get', '/vacinas', ({ query }) => {
    const depId = idDependente(query);
    auditar('consultou_vacinas', 'vacinas', alvoDaLeitura(depId), depId, true);
    return carteira(depId);
  }],
  ['get', '/consultas/sugestoes', () => {
    const vistos = new Set();
    const sugestoes = [];
    for (const c of [...estado.consultas].sort(porDataDesc)) {
      const chave = `${c.medico?.nome}|${c.medico?.especialidade}|${c.local}`;
      if (!c.medico?.nome || vistos.has(chave)) continue;
      vistos.add(chave);
      sugestoes.push({ profissional: c.medico.nome, especialidade: c.medico.especialidade, local: c.local, unidade_cnes: c.unidade_cnes ?? null });
    }
    return { sugestoes: sugestoes.slice(0, 20) };
  }],
  ['get', '/consultas', ({ query }) => {
    const depId = idDependente(query);
    auditar('consultou_consultas', 'consultas', alvoDaLeitura(depId), depId, true);
    return { consultas: estado.consultas.filter(ehDe(depId)).sort(porDataDesc).map(consultaJson) };
  }],
  ['get', '/consultas/:id', ({ id }) => {
    const c = estado.consultas.find((x) => x.id === Number(id));
    if (!c) falhar(404, 'Consulta não encontrada.');
    auditar('consultou_consultas', 'consultas', alvoDaLeitura(c.dependente_id), c.dependente_id, true);
    return { consulta: consultaJson(c) };
  }],
  ['post', '/consultas', ({ corpo }) => {
    const c = consultaDoCorpo(corpo);
    const depId = typeof corpo.dependenteId === 'number' ? corpo.dependenteId : null;
    if (depId != null && !dependente(depId)) falhar(404, 'Dependente não encontrado.');
    Object.assign(c, { id: novoId(), dependente_id: depId, origem: 'paciente', status: 'agendada', resumo: null, conduta: null });
    estado.consultas.push(c);
    auditar('cadastrou_consulta', 'consultas', c.motivo, depId);
    return [201, { id: c.id, sucesso: true }];
  }],
  ['put', '/consultas/:id/situacao', ({ id, corpo }) => {
    const status = campo(corpo, 'status');
    if (status !== 'realizada' && status !== 'cancelada') falhar(400, 'Situação inválida: use realizada ou cancelada.');
    const c = estado.consultas.find((x) => x.id === Number(id));
    if (!c) falhar(404, 'Consulta não encontrada.');
    if (c.status !== 'agendada') falhar(409, 'Esta consulta já foi concluída ou cancelada.');
    c.status = status;
    auditar(status === 'realizada' ? 'concluiu_consulta' : 'cancelou_consulta', 'consultas', c.motivo, c.dependente_id ?? null);
    return { sucesso: true, status };
  }],
  ['put', '/consultas/:id', ({ id, corpo }) => {
    const c = estado.consultas.find((x) => x.id === Number(id) && x.origem === 'paciente');
    if (!c) falhar(404, 'Consulta não encontrada ou registrada por um profissional.');
    Object.assign(c, consultaDoCorpo(corpo));
    auditar('atualizou_consulta', 'consultas', c.motivo);
    return { sucesso: true };
  }],
  ['delete', '/consultas/:id', ({ id }) => {
    const c = estado.consultas.find((x) => x.id === Number(id) && x.origem === 'paciente');
    if (!c) falhar(404, 'Consulta não encontrada ou registrada por um profissional.');
    estado.consultas = estado.consultas.filter((x) => x !== c);
    auditar('excluiu_consulta', 'consultas', c.motivo);
    return { sucesso: true };
  }],
  ['get', '/exames', ({ query }) => {
    const depId = idDependente(query);
    const lista = estado.exames.filter(ehDe(depId)).sort(porDataDesc);
    auditar('consultou_exames', 'exames', alvoDaLeitura(depId), depId, true);
    return {
      coletas: lista.filter((e) => e.tipo !== 'imagem').map(exameJson),
      imagem: lista.filter((e) => e.tipo === 'imagem').map(exameJson),
    };
  }],
  ['post', '/exames/exportacao', ({ corpo }) => {
    const depId = typeof corpo.dependenteId === 'number' ? corpo.dependenteId : null;
    const alvo = alvoDaLeitura(depId);
    auditar('exportou_exames', 'exames',
      `PDF de exames · ${alvo || 'titular'} · ${Number(corpo.coletas) || 0} coleta(s) e `
      + `${Number(corpo.imagens) || 0} exame(s) de imagem · ${corpo.protegido ? 'protegido por senha' : 'sem senha'}`,
      depId);
    return [201, { sucesso: true }];
  }],
  ['get', '/prontuario', ({ query }) => {
    const depId = idDependente(query);
    auditar('consultou_prontuario', 'prontuario', alvoDaLeitura(depId), depId, true);
    return {
      alergias: estado.alergias.filter(ehDe(depId)).map(({ id, descricao }) => ({ id, descricao })),
      condicoes: estado.condicoes.filter(ehDe(depId)).map(({ id, descricao, desde }) => ({ id, descricao, desde })),
      medicacoes: estado.medicacoes.filter(ehDe(depId)).map(({ id, nome, dosagem, frequencia, desde }) => ({ id, nome, dosagem, frequencia, desde })),
    };
  }],

  // --- IA: sem servidor, responde como o app responde com a IA fora do ar ---
  ['post', '/chat', () => falhar(503, 'O assistente com IA não está disponível na demonstração.')],
  ['post', '/explicacoes', ({ corpo }) => {
    const texto = GLOSSARIO[corpo.tipo]?.[chaveGlossario(corpo.termo)];
    if (!texto) falhar(503, 'Na demonstração, só os exames e as vacinas mais comuns têm explicação.');
    return { texto, origem: 'banco', revisado: false };
  }],
  ['post', '/explicacoes/reportar', ({ corpo }) => {
    if (!['errado', 'confuso', 'resultado'].includes(corpo.motivo)) falhar(400, 'Motivo inválido.');
    return { registrado: true, suspensa: false };
  }],

  // --- rede de saúde ---
  ['get', '/rede-saude', ({ query }) => {
    // O GPS é ignorado de propósito: o visitante da feira não mora no CEP do
    // paciente fictício, e medir dali daria uma lista ordenada por distâncias
    // de outra cidade. A demo mede sempre a partir do CEP.
    const escolhida = Boolean(query?.cep);
    const lugar = cidadeDoCep(escolhida ? query.cep : estado.paciente.cep);
    if (!lugar) {
      falhar(422, escolhida
        ? 'Na demonstração só há unidades de São Paulo e Guarulhos. Tente um CEP de lá (ex.: 07055-100).'
        : 'Não foi possível localizar sua cidade pelo CEP. Confira o endereço no seu perfil.');
    }
    return {
      origem: { tipo: 'cep', cidade: lugar.cidade, estado: 'SP', codigo_municipio: lugar.codigo_municipio, escolhida },
      unidades: lugar.unidades.map(unidadeJson),
      referencia: estado.unidadeReferencia,
    };
  }],
  ['get', '/rede-saude/unidades/:id', ({ id }) => {
    const u = unidadePorCnes(id);
    if (!u) falhar(404, 'Unidade não encontrada.');
    return { unidade: unidadeJson(u) };
  }],
  ['post', '/rede-saude/referencia', ({ corpo }) => {
    const cnes = typeof corpo.codigoCnes === 'number' ? corpo.codigoCnes : null;
    if (cnes != null && !unidadePorCnes(cnes)) falhar(404, 'Unidade não encontrada.');
    estado.unidadeReferencia = cnes;
    auditar('definiu_referencia', 'rede', cnes == null ? 'Removeu a unidade de referência.' : `Unidade CNES ${cnes}`);
    return { referencia: cnes };
  }],

  // --- acesso temporário (lado do paciente) e trilha ---
  ['post', '/acessos', ({ corpo }) => {
    const escopo = corpo.escopo === 'escrita' ? 'escrita' : 'leitura';
    const depId = typeof corpo.dependenteId === 'number' ? corpo.dependenteId : null;
    if (depId != null && !dependente(depId)) falhar(404, 'Dependente não encontrado.');
    const contatos = corpo.compartilhaContatos === true;
    const codigo = gerarCodigo();
    const a = {
      id: novoId(), escopo, dependente_id: depId, compartilha_contatos: contatos, codigo: normalizarCodigo(codigo),
      criado_em: agoraIso(), expira_em: agoraIso(VALIDADE_ACESSO_MINUTOS), usado_em: null, revogado_em: null, medico: null,
    };
    estado.acessos.unshift(a);
    const nome = depId == null ? null : primeiroNome(dependente(depId).nome);
    auditar('gerou_codigo', 'acessos',
      `${escopo === 'escrita' ? 'Leitura e registro' : 'Somente leitura'} · ${nome || 'titular'}`
      + `${contatos ? ' · com contatos de emergência' : ''} · válido por ${VALIDADE_ACESSO_MINUTOS} min.`, depId);
    return [201, { id: a.id, codigo, escopo, validade_minutos: VALIDADE_ACESSO_MINUTOS, dependente: nome, compartilha_contatos: contatos }];
  }],
  ['get', '/acessos', () => ({ acessos: estado.acessos.map(acessoJson) })],
  ['get', '/acessos/log', () => ({ registros: estado.logMedico.map(acessoLogJson) })],
  ['delete', '/acessos/:id', ({ id }) => {
    const a = estado.acessos.find((x) => x.id === Number(id) && !x.revogado_em);
    if (!a) falhar(404, 'Acesso não encontrado ou já revogado.');
    a.revogado_em = agoraIso();
    registrarLog(a.id, 'revogado', 'Revogado pelo paciente.');
    return { sucesso: true };
  }],
  ['get', '/auditoria', () => {
    const medico = estado.logMedico.map((l) => ({ ...acessoLogJson(l), id: `med-${l.id}`, origem: 'medico' }));
    const paciente = estado.auditoria.map((r) => ({
      id: `pac-${r.id}`, origem: 'paciente',
      dependente: r.dependente_id == null ? null : primeiroNome(dependente(r.dependente_id)?.nome) || r.detalhe,
      dependente_id: r.dependente_id, acao: r.acao, recurso: r.recurso, detalhe: r.detalhe,
      criado_em: r.criado_em, origem_ip: r.origem_ip,
    }));
    const registros = [...medico, ...paciente].sort((a, b) => b.criado_em.localeCompare(a.criado_em));
    return { registros: registros.slice(0, 100) };
  }],

  // --- portal do médico ---
  ['post', '/medico/entrar', ({ corpo }) => {
    if (!campo(corpo, 'codigo') || !campo(corpo, 'nome') || !campo(corpo, 'crm')) {
      falhar(400, 'Informe o código do paciente, seu nome e seu CRM.');
    }
    const codigo = normalizarCodigo(corpo.codigo);
    let acesso = estado.acessos.find((a) => a.codigo === codigo);
    if (acesso && (!acessoValido(acesso) || acesso.usado_em)) {
      falhar(401, 'Código inválido, expirado ou já utilizado.');
    }
    // Na demonstração, um código que ninguém gerou também entra — quem abre
    // o portal pelo QR Code não tem o app do paciente na mão. Ele vira um
    // acesso de leitura e registro ao titular, como se tivesse sido gerado.
    if (!acesso) {
      acesso = {
        id: novoId(), escopo: 'escrita', dependente_id: null, compartilha_contatos: false, codigo,
        criado_em: agoraIso(), expira_em: agoraIso(VALIDADE_ACESSO_MINUTOS), usado_em: null, revogado_em: null, medico: null,
      };
      estado.acessos.unshift(acesso);
    }
    const medico = {
      id: novoId(), nome: campo(corpo, 'nome'), crm: campo(corpo, 'crm'),
      especialidade: campo(corpo, 'especialidade') || 'Não informada',
    };
    acesso.medico = medico;
    acesso.usado_em = agoraIso();
    registrarLog(acesso.id, 'entrou', `${medico.nome} (CRM ${medico.crm})`);
    const dep = acesso.dependente_id == null ? null : dependente(acesso.dependente_id);
    return {
      token: `demo-medico-${acesso.id}`, escopo: acesso.escopo, expira_em: acesso.expira_em,
      paciente: resumoPessoa(dep || estado.paciente), titular: dep ? primeiroNome(estado.paciente.nome) : null,
    };
  }],
  ['get', '/medico/paciente', ({ config }) => {
    const acesso = autenticarMedico(config);
    const depId = acesso.dependente_id ?? null;
    const dep = depId == null ? null : dependente(depId);
    if (depId != null && !dep) falhar(404, 'Dependente não encontrado.');
    const contatos = acesso.compartilha_contatos
      ? estado.familiares.map(({ nome, parentesco, telefone }) => ({ nome, parentesco, telefone }))
      : [];
    registrarLog(acesso.id, 'leu_prontuario', dep ? `Prontuário de ${primeiroNome(dep.nome)}` : null);
    if (contatos.length) registrarLog(acesso.id, 'leu_contatos', `${contatos.length} contato(s) de emergência`);
    return {
      paciente: resumoPessoa(dep || estado.paciente),
      titular: dep ? primeiroNome(estado.paciente.nome) : null,
      dependente: dep ? dep.nome : null,
      alergias: estado.alergias.filter(ehDe(depId)).map((a) => ({ id: a.id, texto: a.descricao })),
      condicoes: estado.condicoes.filter(ehDe(depId)).map((c) => ({ id: c.id, texto: c.descricao })),
      medicacoes: estado.medicacoes.filter(ehDe(depId)).map((m) => ({ id: m.id, texto: `${m.nome} ${m.dosagem} — ${m.frequencia}` })),
      contatos,
      escopo: acesso.escopo,
    };
  }],
  ['post', '/medico/consultas', ({ config, corpo }) => {
    const acesso = autenticarMedico(config);
    exigirEscrita(acesso);
    const motivo = campo(corpo, 'motivo');
    const local = campo(corpo, 'local');
    if (!motivo || !local) falhar(400, 'Informe ao menos o motivo e o local do atendimento.');
    const agora = agoraIso();
    const cnes = typeof corpo.unidadeCnes === 'number' && unidadePorCnes(corpo.unidadeCnes) ? corpo.unidadeCnes : null;
    const c = {
      id: novoId(), dependente_id: acesso.dependente_id ?? null, medico: acesso.medico, origem: 'medico',
      data: campo(corpo, 'data') || agora.slice(0, 10), hora: horaCompleta(campo(corpo, 'hora') || agora.slice(11, 16)),
      local, motivo, status: 'realizada', resumo: campo(corpo, 'resumo'), conduta: campo(corpo, 'conduta'), unidade_cnes: cnes,
    };
    estado.consultas.push(c);
    registrarLog(acesso.id, 'registrou_consulta', motivo);
    notificar('consulta', `${acesso.medico.nome} registrou uma consulta no prontuário de ${deQuem(acesso)}.`);
    return [201, { id: c.id, sucesso: true }];
  }],
  ['post', '/medico/exames', ({ config, corpo }) => {
    const acesso = autenticarMedico(config);
    exigirEscrita(acesso);
    const local = campo(corpo, 'local');
    if (!local) falhar(400, 'Informe o laboratório ou o local do exame.');
    const tipo = corpo.tipo === 'imagem' ? 'imagem' : 'sangue';
    const e = {
      id: novoId(), dependente_id: acesso.dependente_id ?? null, consulta_id: null, tipo,
      data: campo(corpo, 'data') || hojeIso(), local, nome: campo(corpo, 'nome'), laudo: campo(corpo, 'laudo'),
      solicitante: acesso.medico, itens: [],
    };
    if (tipo === 'sangue') {
      if (!Array.isArray(corpo.itens) || !corpo.itens.length) falhar(400, 'Informe ao menos um resultado na coleta.');
      for (const l of corpo.itens) {
        if (!campo(l, 'nome') || typeof l.valor !== 'number' || typeof l.refMin !== 'number' || typeof l.refMax !== 'number') {
          falhar(400, 'Cada resultado precisa de nome, valor e faixa de referência.');
        }
        e.itens.push({ id: novoId(), nome: campo(l, 'nome'), valor: l.valor, unidade: campo(l, 'unidade') || '', ref_min: l.refMin, ref_max: l.refMax });
      }
    } else if (!e.nome) {
      falhar(400, 'Informe o nome do exame de imagem.');
    }
    estado.exames.push(e);
    registrarLog(acesso.id, 'registrou_exame', tipo === 'imagem' ? e.nome : `${e.itens.length} resultado(s)`);
    notificar('exame', `${acesso.medico.nome} registrou um novo exame no prontuário de ${deQuem(acesso)}.`);
    return [201, { id: e.id, sucesso: true }];
  }],
  ['post', '/medico/prontuario', ({ config, corpo }) => {
    const acesso = autenticarMedico(config);
    exigirEscrita(acesso);
    const depId = acesso.dependente_id ?? null;
    let rotulo;
    let descricao;
    const id = novoId();
    if (corpo.tipo === 'alergia' || corpo.tipo === 'condicao') {
      descricao = campo(corpo, 'descricao');
      if (!descricao) falhar(400, `Informe a descrição da ${corpo.tipo === 'alergia' ? 'alergia' : 'condição'}.`);
      if (corpo.tipo === 'alergia') {
        estado.alergias.push({ id, dependente_id: depId, descricao });
        rotulo = 'alergia';
      } else {
        estado.condicoes.push({ id, dependente_id: depId, descricao, desde: campo(corpo, 'desde') });
        rotulo = 'condição';
      }
    } else if (corpo.tipo === 'medicacao') {
      const nome = campo(corpo, 'nome');
      const dosagem = campo(corpo, 'dosagem');
      const frequencia = campo(corpo, 'frequencia');
      if (!nome || !dosagem || !frequencia) falhar(400, 'Informe o nome, a dosagem e a frequência da medicação.');
      estado.medicacoes.push({ id, dependente_id: depId, nome, dosagem, frequencia, desde: campo(corpo, 'desde') });
      rotulo = 'medicação';
      descricao = nome;
    } else {
      falhar(400, 'Tipo inválido: use alergia, condicao ou medicacao.');
    }
    registrarLog(acesso.id, `registrou_${corpo.tipo}`, descricao);
    notificar('prontuario', `${acesso.medico.nome} adicionou uma ${rotulo} ao prontuário de ${deQuem(acesso)}.`);
    return [201, { id, sucesso: true }];
  }],
  ['delete', '/medico/prontuario/:tipo/:id', ({ config, tipo, id }) => {
    const acesso = autenticarMedico(config);
    exigirEscrita(acesso);
    const tabela = { alergia: 'alergias', condicao: 'condicoes', medicacao: 'medicacoes' }[tipo];
    if (!tabela) falhar(400, 'Tipo inválido: use alergia, condicao ou medicacao.');
    const item = estado[tabela].find((x) => x.id === Number(id));
    if (!item) falhar(404, 'Item não encontrado no prontuário deste paciente.');
    estado[tabela] = estado[tabela].filter((x) => x !== item);
    registrarLog(acesso.id, `removeu_${tipo}`, item.descricao || item.nome);
    notificar('prontuario', `${acesso.medico.nome} removeu um item do seu prontuário.`);
    return { sucesso: true };
  }],
  ['get', '/medico/vacinas', ({ config }) => {
    const acesso = autenticarMedico(config);
    registrarLog(acesso.id, 'leu_vacinas', `Carteira de vacinação de ${deQuem(acesso)}`);
    return carteira(acesso.dependente_id ?? null);
  }],
  ['post', '/medico/vacinas', ({ config, corpo }) => {
    const acesso = autenticarMedico(config);
    exigirEscrita(acesso);
    const dose = CALENDARIO.find((d) => d.id === Number(corpo.doseId));
    if (!dose) falhar(404, 'Dose não encontrada no calendário.');
    const data = campo(corpo, 'data') || hojeIso();
    if (data > hojeIso()) falhar(400, 'A data de aplicação não pode estar no futuro.');
    const chave = acesso.dependente_id == null ? 'titular' : acesso.dependente_id;
    estado.vacinas[chave] = { ...(estado.vacinas[chave] || {}), [dose.id]: data };
    registrarLog(acesso.id, 'registrou_vacina', `${dose.vacina} · ${dose.dose}`);
    notificar('vacina', `${acesso.medico.nome} registrou uma dose na carteira de vacinação de ${deQuem(acesso)}.`);
    return [201, { sucesso: true, data }];
  }],
  ['delete', '/medico/vacinas/:id', ({ config, id }) => {
    const acesso = autenticarMedico(config);
    exigirEscrita(acesso);
    const chave = acesso.dependente_id == null ? 'titular' : acesso.dependente_id;
    const aplicadas = estado.vacinas[chave] || {};
    if (!aplicadas[id]) falhar(404, 'Esta dose não estava registrada.');
    delete aplicadas[id];
    const dose = CALENDARIO.find((d) => d.id === Number(id));
    registrarLog(acesso.id, 'removeu_vacina', dose ? `${dose.vacina} · ${dose.dose}` : null);
    notificar('vacina', `${acesso.medico.nome} removeu uma dose da carteira de vacinação de ${deQuem(acesso)}.`);
    return { sucesso: true };
  }],
];

function horaCompleta(h) {
  return h && h.length === 5 ? `${h}:00` : h;
}

/** Campos comuns de criar e corrigir uma consulta anotada pelo paciente. */
function consultaDoCorpo(corpo) {
  const profissional = campo(corpo, 'profissional');
  const data = campo(corpo, 'data');
  const hora = campo(corpo, 'hora');
  const local = campo(corpo, 'local');
  if (!profissional || !data || !hora || !local) falhar(400, 'Informe o profissional, a data, a hora e o local.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !/^\d{2}:\d{2}(:\d{2})?$/.test(hora)) falhar(400, 'Data ou hora inválida.');
  const cnes = typeof corpo.unidadeCnes === 'number' && unidadePorCnes(corpo.unidadeCnes) ? corpo.unidadeCnes : null;
  return {
    medico: { nome: profissional, especialidade: campo(corpo, 'especialidade') || 'Não informada' },
    data, hora: horaCompleta(hora), local, motivo: campo(corpo, 'motivo') || 'Consulta', unidade_cnes: cnes,
  };
}

/** Mesma normalização do ExplicacaoDAO: minúsculas e sem acento. */
function chaveGlossario(termo) {
  return String(termo || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Acha a rota e devolve [função, parâmetros do caminho]. */
function encontrar(metodo, caminho) {
  const partes = caminho.split('/').filter(Boolean);
  for (const [m, padrao, fn] of ROTAS) {
    if (m !== metodo) continue;
    const esperado = padrao.split('/').filter(Boolean);
    if (esperado.length !== partes.length) continue;
    const params = {};
    const casou = esperado.every((p, i) => {
      if (p.startsWith(':')) {
        params[p.slice(1)] = decodeURIComponent(partes[i]);
        return true;
      }
      return p === partes[i];
    });
    if (casou) return [fn, params];
  }
  return [null, null];
}

/**
 * O `adapter` do axios: recebe o config já montado (URL, método, corpo em
 * JSON) e devolve a resposta — ou rejeita com um AxiosError igual ao de um
 * 4xx/5xx de verdade, que é o que as telas sabem tratar.
 */
export function responder(config) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const metodo = (config.method || 'get').toLowerCase();
      const caminho = String(config.url || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/api/, '').split('?')[0];
      let corpo = {};
      try {
        corpo = typeof config.data === 'string' && config.data ? JSON.parse(config.data) : (config.data || {});
      } catch {
        corpo = {};
      }

      const montar = (status, data) => ({
        data, status, statusText: String(status), headers: {}, config, request: {},
      });

      try {
        const [fn, params] = encontrar(metodo, caminho);
        if (!fn) falhar(404, 'Rota não encontrada.');
        const resultado = fn({ ...params, query: config.params || {}, corpo, config });
        const [status, data] = Array.isArray(resultado) ? resultado : [200, resultado];
        resolve(montar(status, JSON.parse(JSON.stringify(data))));
      } catch (err) {
        const status = err instanceof ErroHttp ? err.status : 500;
        const mensagem = err instanceof ErroHttp ? err.message : 'Erro na demonstração.';
        const resposta = montar(status, { erro: mensagem });
        reject(new AxiosError(
          `Request failed with status code ${status}`,
          status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
          config, {}, resposta,
        ));
      }
    }, LATENCIA_MS);
  });
}
