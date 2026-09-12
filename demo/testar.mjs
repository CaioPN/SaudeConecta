// Teste de fumaça da versão de demonstração.
//
// A demo é um arquivo só, escrito à mão em JavaScript puro: não tem build, não
// tem lint e nada avisa quando uma tela quebra — o erro só aparece na hora de
// mostrar o projeto para alguém. Este script monta um DOM de mentira, executa o
// script embutido no `index.html` e chama CADA tela em alguns cenários, só para
// ver se alguma estoura ou volta vazia.
//
// Não testa layout nem conteúdo: testa que o JavaScript roda. É o suficiente
// para pegar o erro mais comum aqui, que é uma função renomeada num lugar e
// esquecida em outro.
//
// Rode depois de mexer no app.template.html (e depois do gerar.mjs):
//
//   node demo/gerar.mjs && node demo/testar.mjs

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const arquivo = path.join(path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ''), 'index.html');
const html = fs.readFileSync(arquivo, 'utf8');
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];

// O mínimo de DOM para o script carregar. Ele registra listeners e procura
// elementos ao subir; nada disso precisa funcionar de verdade aqui.
const elemento = () => ({
  addEventListener() {}, removeEventListener() {}, appendChild() {}, remove() {},
  setAttribute() {}, removeAttribute() {}, focus() {}, scrollTo() {},
  classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  style: {}, dataset: {}, closest: () => null, querySelector: () => null,
  querySelectorAll: () => [], innerHTML: '', value: '', checked: false, textContent: '',
});

const contexto = {
  console,
  document: {
    addEventListener() {},
    getElementById: () => elemento(),
    querySelector: () => elemento(),
    querySelectorAll: () => [],
    createElement: () => elemento(),
    body: elemento(),
    documentElement: elemento(),
  },
  location: { hash: '#/dashboard', href: '', search: '' },
  navigator: { clipboard: null, geolocation: null, userAgent: 'node' },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
  addEventListener() {}, removeEventListener() {}, scrollTo() {},
  alert() {},
};
contexto.window = contexto;
contexto.globalThis = contexto;

vm.createContext(contexto);
// `const` de topo dentro do vm não vira propriedade do global: exportamos na mão.
vm.runInContext(`${script}\nglobalThis.ROTAS = ROTAS; globalThis.estado = estado;`, contexto);

const rotas = Object.keys(contexto.ROTAS || {});
if (!rotas.length) {
  console.error('não encontrei o mapa de rotas — o gerar.mjs rodou?');
  process.exit(1);
}

// Cenários que mudam o que as telas desenham. O terceiro liga tudo ao mesmo
// tempo de propósito: é onde os caminhos menos percorridos aparecem.
const cenarios = [
  {
    nome: 'titular',
    antes: () => { contexto.estado.pessoa = 'titular'; },
  },
  {
    nome: 'dependente selecionado',
    antes: () => {
      const dependentes = contexto.estado.dependentes;
      contexto.estado.pessoa = dependentes[dependentes.length - 1].id;
    },
  },
  {
    nome: 'olho fechado, médico logado, perfil em edição',
    antes: () => {
      contexto.estado.oculto = true;
      contexto.estado.editandoPerfil = true;
      contexto.estado.pessoaHistorico = 'Lucas';
      contexto.estado.unidadeReferencia = 1;
      contexto.estado.servicosUnidade = { 2: ['Aberto 24 horas'] };
      contexto.estado.medico = {
        id: 1, escopo: 'escrita', dependente: 'Lucas', contatos: true,
        expiraEm: new Date(Date.now() + 600000).toISOString(),
      };
    },
  },
  {
    // A carteira agora é escrita pelo profissional: esta aba do portal é o
    // único lugar do app onde uma dose é marcada, e sem cenário próprio ela
    // nunca seria desenhada aqui.
    nome: 'médico na aba de vacinas',
    antes: () => {
      contexto.estado.oculto = false;
      contexto.estado.abaMedico = 'vacinas';
    },
  },
];

let falhas = 0;
for (const cenario of cenarios) {
  cenario.antes();
  for (const rota of rotas) {
    try {
      const saida = contexto.ROTAS[rota]();
      if (typeof saida !== 'string' || saida.length < 20) {
        console.error(`VAZIA  ${rota}  (${cenario.nome})`);
        falhas++;
      }
    } catch (erro) {
      console.error(`ERRO   ${rota}  (${cenario.nome}): ${erro.message}`);
      falhas++;
    }
  }
}

console.log(`${rotas.length} telas x ${cenarios.length} cenários — ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
