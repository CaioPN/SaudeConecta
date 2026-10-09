// Gera o bloco de INSERT do calendário de vacinação a partir do arquivo que
// já descreve o calendário no front (`medical-app/src/data/vacinas.js`).
//
// Por que existe: o calendário do PNI precisa estar no banco (o app monta a
// carteira pela API e o AvisoDAO conta as doses atrasadas) e também em JS (a
// versão de demonstração não tem backend nenhum para consultar). Duas listas
// escritas à mão sairiam do ar uma da outra no primeiro ajuste do Ministério
// da Saúde — então a lista JS é a fonte e o SQL é gerado dela.
//
// Uso:
//
//   node database/gerar-calendario.mjs            # mostra o SQL na tela
//   node database/gerar-calendario.mjs --gravar   # substitui o bloco no seed.sql
//   node database/gerar-calendario.mjs --conferir # só confere; sai com erro se diferir
//
// O --conferir é o que faltava para a regra "mexa no JS e rode o gerador" valer
// sem depender de memória: o `npm run build` do front o roda antes de compilar
// (script prebuild), então um vacinas.js alterado sem o seed regenerado derruba
// o build em vez de chegar à apresentação com dois calendários diferentes.
//
// O INSERT sai com IGNORE e a tabela tem UNIQUE (publico, vacina, dose): rodar
// o seed de novo não duplica dose nenhuma.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), '..');
const ORIGEM = path.join(RAIZ, 'medical-app/src/data/vacinas.js');
const SEED = path.join(RAIZ, 'database/seed.sql');

const INICIO = '-- <calendario-vacinal>';
const FIM = '-- </calendario-vacinal>';

const calendario = await import(pathToFileURL(ORIGEM).href);

const texto = (valor) =>
  valor === null || valor === undefined ? 'NULL' : `'${String(valor).replace(/'/g, "''")}'`;

const linhas = [];
let ordem = 0;
for (const dose of calendario.CALENDARIO_CRIANCA) {
  linhas.push(`  ('crianca', ${texto(dose.vacina)}, ${texto(dose.dose)}, ${dose.idadeMeses}, `
    + `${texto(dose.periodo)}, ${texto(dose.protege)}, ${++ordem})`);
}
ordem = 0;
for (const dose of calendario.CALENDARIO_ADULTO) {
  // Dose do calendário adulto não tem idade recomendada: ela depende de
  // campanha e de histórico que o app não guarda, e por isso nunca "atrasa".
  linhas.push(`  ('adulto', ${texto(dose.vacina)}, ${texto(dose.dose)}, NULL, `
    + `${texto(dose.periodo)}, ${texto(dose.protege)}, ${++ordem})`);
}

const bloco = [
  INICIO,
  '-- ============================================================',
  '--  Calendário Nacional de Vacinação (PNI — Ministério da Saúde)',
  '--  Fonte: https://www.gov.br/saude/pt-br/vacinacao/calendario',
  '--',
  '--  GERADO por database/gerar-calendario.mjs a partir de',
  '--  medical-app/src/data/vacinas.js. Não edite à mão: mexa no arquivo JS',
  '--  e rode o gerador de novo.',
  '-- ============================================================',
  'INSERT IGNORE INTO calendario_vacinal (publico, vacina, dose, idade_meses, periodo, protege, ordem) VALUES',
  `${linhas.join(',\n')};`,
  FIM,
].join('\n');

let seed = fs.readFileSync(SEED, 'utf8');

if (process.argv.includes('--conferir')) {
  // Compara sem olhar a quebra de linha: com o autocrlf do Git no Windows o
  // seed.sql pode estar em CRLF, e isso não é diferença de calendário.
  const normalizar = (t) => t.replace(/\r\n/g, '\n').trim();
  const ini = seed.indexOf(INICIO);
  const fim = seed.indexOf(FIM);
  const atual = ini >= 0 && fim > ini ? seed.slice(ini, fim + FIM.length) : '';
  if (normalizar(atual) === normalizar(bloco)) {
    console.log(`Calendário em dia: seed.sql e vacinas.js têm as mesmas ${linhas.length} doses.`);
    process.exit(0);
  }
  console.error(atual
    ? 'O calendário do seed.sql está diferente de medical-app/src/data/vacinas.js.'
    : 'O seed.sql não tem o bloco <calendario-vacinal>.');
  console.error('Rode: node database/gerar-calendario.mjs --gravar');
  process.exit(1);
}

if (!process.argv.includes('--gravar')) {
  console.log(bloco);
  console.error(`\n(${linhas.length} doses — rode com --gravar para atualizar o seed.sql)`);
  process.exit(0);
}

if (seed.includes(INICIO) && seed.includes(FIM)) {
  const antes = seed.slice(0, seed.indexOf(INICIO));
  const depois = seed.slice(seed.indexOf(FIM) + FIM.length);
  seed = antes + bloco + depois;
} else {
  seed = `${seed.trimEnd()}\n\n${bloco}\n`;
}
fs.writeFileSync(SEED, seed);
console.log(`seed.sql atualizado — ${linhas.length} doses.`);
