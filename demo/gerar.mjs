// Monta demo/index.html a partir de app.template.html.
//
// A demonstração é um arquivo único, sem build e sem servidor, mas não é uma
// cópia manual do app: o CSS, o calendário do PNI, o texto do FAQ, os termos,
// as regras de exame e a base do chatbot são recortados aqui dos arquivos
// originais do medical-app. Assim, mexer no app e rodar este script de novo
// já atualiza a apresentação.
//
// Uso:  node demo/gerar.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const raiz = new URL('../', import.meta.url);
const ler = (caminho) => readFileSync(new URL(caminho, raiz), 'utf8');

// Recorta um trecho do arquivo, do início de `de` até o fim de `ate`.
function recortar(texto, de, ate, arquivo) {
  const inicio = texto.indexOf(de);
  const fim = texto.indexOf(ate, inicio);
  if (inicio === -1 || fim === -1) throw new Error(`Trecho não encontrado em ${arquivo}: ${de}`);
  return texto.slice(inicio, fim + ate.length);
}

// Módulos que são JavaScript puro: basta tirar o `export`, porque na
// demonstração tudo vive no mesmo escopo.
const semExport = (texto) => texto.replace(/^export /gm, '');

const utilExames = semExport(ler('medical-app/src/utils/exames.js'));
const utilPrivacidade = semExport(ler('medical-app/src/utils/privacidade.js'));
// O prontuário importa do exames.js, que já está no mesmo escopo aqui.
const utilProntuario = semExport(ler('medical-app/src/utils/prontuario.js'))
  .replace(/^import .*\n/gm, '');
// O vacinas.js tem um formatarData próprio (recebe Date) que atropelaria o
// do exames.js (recebe ISO), já que aqui todo mundo divide o mesmo escopo.
const vacinas = semExport(ler('medical-app/src/data/vacinas.js'))
  .replace(/\bformatarData\b/g, 'formatarDataDaDose');
const faq = semExport(ler('medical-app/src/content/FaqContent.js'));

// Base de regras do chatbot + sugestões rápidas, direto do componente React.
const chatbotJsx = ler('medical-app/src/components/MedicalChatbot.jsx');
const chatbotBase = recortar(
  chatbotJsx,
  '// Base de conhecimento do assistente',
  "const SUGESTOES = ['Como agendar consulta?', 'Ver meus exames', 'Adicionar dependente'];",
  'MedicalChatbot.jsx'
);

// Termos de Uso e Portal de Privacidade: o conteúdo é só <h3> e <p>, então o
// JSX vira HTML trocando className por class e recortando o fragmento.
function textoLegal(nomeFuncao) {
  const arquivo = ler('medical-app/src/content/LegalContent.jsx');
  const corpo = recortar(arquivo, `export function ${nomeFuncao}() {`, '\n}', 'LegalContent.jsx');
  const html = recortar(corpo, '<>', '</>', 'LegalContent.jsx')
    .replace(/^\s*<>\s*$/m, '')
    .replace(/^\s*<\/>\s*$/m, '')
    .replace(/className=/g, 'class=')
    .trim();
  // Vira uma string JavaScript de uma linha só.
  return JSON.stringify(html);
}

const logo = readFileSync(new URL('medical-app/src/assets/logo.png', raiz)).toString('base64');

let html = ler('demo/app.template.html');

const substituicoes = {
  '/* __APP_CSS__ */': ler('medical-app/src/app.css'),
  '/* __ICONES__ */': ler('demo/icones.js'),
  '/* __UTILS_EXAMES__ */': utilExames,
  '/* __UTILS_PRIVACIDADE__ */': utilPrivacidade,
  '/* __UTILS_PRONTUARIO__ */': utilProntuario,
  '/* __VACINAS__ */': vacinas,
  '/* __FAQ__ */': faq,
  '/* __CHATBOT_BASE__ */': chatbotBase,
  '__LOGO_DATA_URI__': `data:image/png;base64,${logo}`,
};

for (const [marca, valor] of Object.entries(substituicoes)) {
  if (!html.includes(marca)) throw new Error(`Marca ausente no template: ${marca}`);
  html = html.replace(marca, () => valor);
}

// Os textos legais entram como constantes, logo antes das telas que os usam.
html = html.replace(
  '/* ---------- 5. Telas ---------- */',
  `const TEXTO_TERMOS = ${textoLegal('TermsContent')};\n` +
  `const TEXTO_PRIVACIDADE = ${textoLegal('PrivacyContent')};\n\n` +
  '/* ---------- 5. Telas ---------- */'
);

// A fonte do app vem do Google Fonts por @import dentro do CSS; na página
// publicada o <link> carrega antes e evita o piscar da fonte de sistema.
html =
  '<link rel="preconnect" href="https://fonts.googleapis.com" />\n' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />\n' +
  html;

writeFileSync(new URL('demo/index.html', raiz), html, 'utf8');
console.log('demo/index.html gerado —', (html.length / 1024).toFixed(0), 'KB');
