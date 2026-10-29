// Leitura do PDF de um exame feito em outro lugar, para pré-preencher a
// importação. Roda inteira no navegador do paciente: o texto do laudo não sai
// do aparelho até ele conferir os valores e tocar em "Salvar" — e mesmo aí o
// que vai é o que ele conferiu, para o nosso servidor, nunca para uma IA.
//
// Duas partes, de propósito separadas:
//  - lerPdf: o pdf.js extrai o texto e o remonta em linhas (precisa do
//    navegador, por causa do worker);
//  - interpretarLaudo: regras puras sobre essas linhas, testáveis no Node.
//
// Cada laboratório desenha o laudo de um jeito, então isto é um palpite
// que acerta o formato mais comum ("Hemoglobina  14,2 g/dL  12,0 a 16,0") e
// deixa o resto para o paciente completar. A tela nunca salva sem ele ver.

/** Abaixo disto o PDF é imagem (papel escaneado ou foto): não há o que ler. */
const MINIMO_DE_TEXTO = 40;

/**
 * Extrai o texto do PDF e o devolve em linhas, na ordem de leitura.
 *
 * @param {ArrayBuffer} dados  O conteúdo do arquivo.
 * @returns {Promise<{ linhas: string[], temTexto: boolean }>}
 */
export async function lerPdf(dados) {
  // Import dinâmico: o pdf.js tem ~1 MB e só quem importa um exame o baixa.
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  return linhasDoPdf(pdfjs, dados);
}

/**
 * O miolo do lerPdf, com o pdf.js recebido por parâmetro (o teste no Node usa
 * o build "legacy", que não precisa de worker).
 */
export async function linhasDoPdf(pdfjs, dados) {
  // isEvalSupported: false — o PDF veio de fora; nada nele vira código.
  // O pdf.js transfere o buffer para o worker: a cópia (slice) mantém o
  // original inteiro para o envio do arquivo depois.
  const tarefa = pdfjs.getDocument({ data: new Uint8Array(dados.slice(0)), isEvalSupported: false });
  const linhas = [];
  try {
    const doc = await tarefa.promise;
    for (let n = 1; n <= doc.numPages; n += 1) {
      const pagina = await doc.getPage(n);
      const { items } = await pagina.getTextContent();
      linhas.push(...montarLinhas(items));
    }
  } finally {
    await tarefa.destroy();
  }
  const total = linhas.join('').replace(/\s/g, '').length;
  return { linhas, temTexto: total >= MINIMO_DE_TEXTO };
}

/**
 * O pdf.js entrega pedaços de texto soltos, cada um com a sua posição. Uma
 * "linha" é o que está na mesma altura; dentro dela, a ordem é da esquerda
 * para a direita. Um vão grande entre dois pedaços vira três espaços: é assim
 * que as colunas do laudo (exame | resultado | referência) continuam
 * separáveis depois.
 */
export function montarLinhas(itens) {
  const porAltura = [];
  for (const it of itens) {
    if (!it.str || !it.str.trim()) continue;
    const x = it.transform[4];
    const y = it.transform[5];
    const tamanho = Math.abs(it.transform[0]) || 10;
    let linha = porAltura.find((l) => Math.abs(l.y - y) <= tamanho * 0.4);
    if (!linha) {
      linha = { y, pedacos: [] };
      porAltura.push(linha);
    }
    linha.pedacos.push({ x, fim: x + (it.width || 0), texto: it.str, tamanho });
  }

  return porAltura
    .sort((a, b) => b.y - a.y) // no PDF o y cresce para cima
    .map(({ pedacos }) => {
      pedacos.sort((a, b) => a.x - b.x);
      let texto = '';
      let fimAnterior = null;
      for (const p of pedacos) {
        if (fimAnterior !== null) {
          const vao = p.x - fimAnterior;
          if (vao > p.tamanho * 1.2) texto += '   ';
          else if (vao > p.tamanho * 0.15 && !texto.endsWith(' ')) texto += ' ';
        }
        texto += p.texto;
        fimAnterior = p.fim;
      }
      return texto.replace(/\s+$/, '');
    })
    .filter(Boolean);
}

// ===================== interpretação =====================

const NUMERO = String.raw`-?\d[\d.,]*`;

/**
 * "14,2" → 14.2; "3.480" → 3480; "1.234,5" → 1234.5; "4.5" → 4.5.
 *
 * O laudo brasileiro usa vírgula decimal e ponto de milhar, mas nem todo
 * sistema segue: ponto seguido de exatamente três dígitos é lido como milhar
 * (o "3.480 /mm³" do leucograma), e o resto como decimal. "1.010" de
 * densidade urinária sai errado (1010) — o paciente confere na tela.
 */
export function lerNumero(texto) {
  let t = String(texto).trim();
  if (!/^-?\d/.test(t)) return null;
  t = t.replace(/[.,]$/, '');
  if (t.includes(',')) {
    t = t.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, '');
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Sem acento e em minúsculas, para comparar palavras. */
function normalizar(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Linhas que têm nome e número mas não são resultado: cabeçalho do laudo,
 * dados do paciente e as faixas por idade ou sexo ("Adultos: 70 a 99").
 */
const NAO_E_RESULTADO = [
  'data', 'coleta', 'coletado', 'nascimento', 'nasc', 'idade', 'sexo', 'cpf', 'rg', 'crm', 'cns',
  'cartao', 'pagina', 'pag', 'folha', 'protocolo', 'pedido', 'atendimento', 'telefone', 'tel',
  'fone', 'cep', 'rua', 'av', 'avenida', 'numero', 'emissao', 'emitido', 'liberado', 'liberacao',
  'impresso', 'convenio', 'medico', 'solicitante', 'paciente', 'registro', 'amostra', 'material',
  'metodo', 'hora', 'horario', 'os', 'senha', 'codigo', 'cod', 'laudo', 'adultos', 'adulto',
  'criancas', 'crianca', 'homens', 'mulheres', 'masculino', 'feminino', 'desejavel', 'otimo',
  'limitrofe', 'alto', 'baixo', 'normal', 'referencia', 'valores', 'valor', 'vr', 'resultado',
  'unidade', 'nota', 'obs', 'observacao', 'gestantes', 'idosos', 'recem', 'ate', 'acima', 'abaixo',
  'fase', 'pos', 'jejum', 'de', 'entre', 'versao', 'assinatura', 'assinado', 'responsavel',
];

function pareceResultado(nome) {
  const n = normalizar(nome).replace(/[^a-z0-9 ]/g, ' ').trim();
  if ((n.match(/[a-z]/g) || []).length < 2) return false;
  const primeira = n.split(/\s+/)[0];
  return !NAO_E_RESULTADO.includes(primeira);
}

/** "g/dL", "%", "mil/mm³", "/mm³", "U/L", "x10^3/µL". Não "a", "até", "Ref". */
const UNIDADE = /^(?:%|\/[\wµμ³²]+|[a-zA-Zµμ][\wµμ³²^/.*]*|x?10\^?\d+\/[\wµμ³]+)$/;
const NAO_E_UNIDADE = ['a', 'à', 'ate', 'até', 'ref', 'vr', 'de', 'e', 'inferior', 'superior', 'menor', 'maior'];

function lerUnidade(token) {
  if (!token) return '';
  const t = token.replace(/[;,]$/, '');
  if (t.length > 20 || !UNIDADE.test(t) || NAO_E_UNIDADE.includes(normalizar(t))) return '';
  return t;
}

/**
 * A faixa de referência no texto, ou null.
 *   "12,0 a 16,0" / "70 - 99"     → { min: 12, max: 16 }
 *   "até 200" / "inferior a 5,7"  → { min: 0, max: 200 }   (o app já lê min 0 como "até")
 *   "superior a 40" / "> 40"      → { min: 40, max: null } (o app não tem faixa sem teto:
 *                                    o paciente completa)
 */
export function lerReferencia(texto) {
  if (!texto) return null;
  const intervalo = new RegExp(`(${NUMERO})\\s*(?:a|à|-|–|—|até|ate)\\s*(${NUMERO})`, 'i').exec(texto);
  if (intervalo) {
    const min = lerNumero(intervalo[1]);
    const max = lerNumero(intervalo[2]);
    if (min !== null && max !== null && min <= max) return { min, max };
  }
  const teto = new RegExp(`(?:até|ate|inferior a|menor que|menor ou igual a|<=|<|≤)\\s*(${NUMERO})`, 'i').exec(texto);
  if (teto) {
    const max = lerNumero(teto[1]);
    if (max !== null) return { min: 0, max };
  }
  const piso = new RegExp(`(?:superior a|maior que|maior ou igual a|acima de|>=|>|≥)\\s*(${NUMERO})`, 'i').exec(texto);
  if (piso) {
    const min = lerNumero(piso[1]);
    if (min !== null) return { min, max: null };
  }
  return null;
}

/** A referência que o laboratório escreveu numa linha só dela. */
function linhaSoDeReferencia(linha) {
  const n = normalizar(linha).trim();
  return /^(v\.?r\.?|ref|referencia|valores? de referencia|valor de referencia)\b/.test(n)
    || /^(ate|inferior|superior|menor|maior|acima|<|>|≤|≥)/.test(n)
    || new RegExp(`^${NUMERO}\\s*(a|-|–|ate)\\s*${NUMERO}`).test(n);
}

/**
 * Uma linha de resultado: nome, depois o primeiro número que vem depois de
 * um espaço (para "Vitamina B12" e "T4 livre" continuarem inteiros), a
 * unidade logo em seguida e a referência no resto.
 */
function lerLinha(linha) {
  const casou = new RegExp(`^([A-Za-zÀ-ÿ][^:]*?)\\s*[:.…]*\\s+(${NUMERO})(?:\\s+|$)(.*)$`).exec(linha);
  if (!casou) return null;
  const nome = casou[1].replace(/[.…_\s]+$/, '').replace(/\s{2,}/g, ' ').trim();
  if (!pareceResultado(nome) || nome.length > 120) return null;
  // Data e hora no lugar do valor ("Coletado em 12/03/2026") não são resultado.
  if (/^\d{1,2}[/:]\d{1,2}/.test(`${casou[2]}${casou[3].slice(0, 3)}`)) return null;

  const valor = lerNumero(casou[2]);
  if (valor === null) return null;

  const resto = casou[3].trim();
  const [primeiro, ...depois] = resto.split(/\s+/);
  const unidade = lerUnidade(primeiro);
  const textoDaReferencia = unidade ? depois.join(' ') : resto;
  return { nome, valor, unidade, referencia: lerReferencia(textoDaReferencia) };
}

const DATA_BR = /(\d{2})\/(\d{2})\/(\d{4})/;

function dataIso(casou) {
  const [, dia, mes, ano] = casou;
  const iso = `${ano}-${mes}-${dia}`;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime()) || d.getDate() !== Number(dia)) return null;
  return d <= new Date() ? iso : null;
}

/** A data do exame: a que vem ao lado de "coleta" ou "realizado"; senão, a primeira que não é nascimento. */
function lerData(linhas) {
  const rotulada = linhas.find((l) => /colet|realiza|data do exame|data de atendimento/i.test(l) && DATA_BR.test(l));
  if (rotulada) {
    const iso = dataIso(DATA_BR.exec(rotulada.slice(rotulada.search(/colet|realiza|data do exame|data de atendimento/i))) || DATA_BR.exec(rotulada));
    if (iso) return iso;
  }
  for (const l of linhas) {
    if (/nasc/i.test(l)) continue;
    const casou = DATA_BR.exec(l);
    if (casou && dataIso(casou)) return dataIso(casou);
  }
  return '';
}

/** O nome do laboratório costuma ser a primeira linha de texto puro do laudo. */
function lerLocal(linhas) {
  const candidata = linhas.slice(0, 6).find((l) => {
    const t = l.replace(/\s+/g, ' ').trim();
    return t.length >= 4 && t.length <= 80 && !/\d/.test(t) && /[a-zA-Z]{3}/.test(t)
      && !/^(laudo|resultado|exame|relat[oó]rio|paciente)/i.test(t);
  });
  return candidata ? candidata.replace(/\s+/g, ' ').trim() : '';
}

const EXAME_DE_IMAGEM = /(raio[ -]?x|rx\b|radiografia|ultrass(om|onografia)|ecografia|tomografia|resson[aâ]ncia|mamografia|ecocardiograma|eletrocardiograma|densitometria|endoscopia|colonoscopia|doppler|cintilografia)/i;

/** Para laudo de imagem: o nome do exame e a conclusão. */
function lerImagem(linhas) {
  const titulo = linhas.find((l) => EXAME_DE_IMAGEM.test(l) && l.length <= 160);
  const inicio = linhas.findIndex((l) => /^\s*(conclus[aã]o|impress[aã]o( diagn[oó]stica)?|opini[aã]o)\b/i.test(l));
  let laudo = '';
  if (inicio >= 0) {
    const partes = [linhas[inicio].replace(/^\s*[^:]*:?\s*/, '')];
    for (const l of linhas.slice(inicio + 1)) {
      if (/^\s*(dra?\.|crm|assinad|m[eé]dic[oa] respons|respons[aá]vel|p[aá]gina)/i.test(l)) break;
      partes.push(l.trim());
    }
    laudo = partes.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().slice(0, 1500);
  }
  return { nome: titulo ? titulo.replace(/\s+/g, ' ').trim() : '', laudo };
}

/**
 * Das linhas do PDF ao rascunho da importação.
 *
 * @returns {{
 *   tipo: 'sangue'|'imagem', data: string, local: string,
 *   itens: Array<{ nome, valor, unidade, refMin, refMax }>,
 *   nome: string, laudo: string
 * }}
 *   refMin/refMax vêm `null` quando a faixa não foi achada: a tela marca a
 *   linha para o paciente completar.
 */
export function interpretarLaudo(linhas) {
  const itens = [];
  const vistos = new Set();
  for (let i = 0; i < linhas.length; i += 1) {
    const lida = lerLinha(linhas[i]);
    if (!lida) continue;
    let { referencia } = lida;
    // Muito laudo põe a referência na linha de baixo ("VR: 12,0 a 16,0").
    if (!referencia && linhas[i + 1] && linhaSoDeReferencia(linhas[i + 1])) {
      referencia = lerReferencia(linhas[i + 1]);
      if (referencia) i += 1;
    }
    // Sem unidade e sem referência, "Leucócitos 7" e "Página 2" se parecem
    // demais: só entra com pelo menos uma das duas.
    if (!referencia && !lida.unidade) continue;
    const chave = normalizar(lida.nome);
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    itens.push({
      nome: lida.nome,
      valor: lida.valor,
      unidade: lida.unidade,
      refMin: referencia ? referencia.min : null,
      refMax: referencia ? referencia.max : null,
    });
  }

  const completos = itens.filter((it) => it.refMin !== null && it.refMax !== null).length;
  const imagem = lerImagem(linhas);
  const tipo = completos < 2 && imagem.nome ? 'imagem' : 'sangue';

  return {
    tipo,
    data: lerData(linhas),
    local: lerLocal(linhas),
    itens: tipo === 'sangue' ? itens : [],
    nome: tipo === 'imagem' ? imagem.nome : '',
    laudo: tipo === 'imagem' ? imagem.laudo : '',
  };
}
