// Gera demo/icones.js a partir do lucide-react instalado em medical-app.
// Os SVG entram inline no HTML estático porque a demonstração não tem build
// nem pode buscar biblioteca externa. Rode: node demo/gerar-icones.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const DIR = new URL('../medical-app/node_modules/lucide-react/dist/esm/icons/', import.meta.url);

// nome usado no HTML -> arquivo do lucide
const ICONES = {
  home: 'house', heartPulse: 'heart-pulse', mapPin: 'map-pin', menu: 'menu',
  fileText: 'file-text', activity: 'activity', calendar: 'calendar', syringe: 'syringe',
  users: 'users', keyRound: 'key-round', history: 'history', lock: 'lock',
  shieldCheck: 'shield-check', user: 'user', helpCircle: 'circle-question-mark',
  scrollText: 'scroll-text', logOut: 'log-out', chevronLeft: 'chevron-left',
  chevronRight: 'chevron-right', chevronDown: 'chevron-down', eye: 'eye', eyeOff: 'eye-off',
  fingerprint: 'fingerprint-pattern', droplet: 'droplet', flask: 'flask-conical', image: 'image',
  download: 'download', building: 'building-2', stethoscope: 'stethoscope',
  alertTriangle: 'triangle-alert', alertCircle: 'circle-alert', heart: 'heart', clock: 'clock',
  pill: 'pill', check: 'check', baby: 'baby', trash: 'trash-2', hospital: 'hospital',
  ambulance: 'ambulance', navigation: 'navigation', phone: 'phone', bookOpen: 'book-open',
  penLine: 'pen-line', ban: 'ban', copy: 'copy', messageCircle: 'message-circle', x: 'x',
  send: 'send', bot: 'bot', info: 'info', mail: 'mail', idCard: 'id-card', venus: 'venus',
  userCheck: 'user-check', plus: 'plus', logIn: 'log-in', arrowRight: 'arrow-right',
};

const saida = {};
for (const [nome, arquivo] of Object.entries(ICONES)) {
  let texto;
  try {
    texto = readFileSync(new URL(`${arquivo}.mjs`, DIR), 'utf8');
  } catch {
    console.error('NAO ENCONTRADO:', arquivo);
    continue;
  }
  const bruto = texto.split('const __iconNode = ')[1].split(/;\r?\nconst /)[0];
  // eslint-disable-next-line no-eval
  const nos = eval(bruto);
  saida[nome] = nos
    .map(([tag, attrs]) => {
      const props = Object.entries(attrs)
        .filter(([k]) => k !== 'key')
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ');
      return `<${tag} ${props}/>`;
    })
    .join('');
}

const faltando = Object.keys(ICONES).filter((n) => !saida[n]);
if (faltando.length) console.error('Faltando:', faltando.join(', '));

writeFileSync(
  new URL('./icones.js', import.meta.url),
  `// GERADO por gerar-icones.mjs — não editar à mão.\nconst LUCIDE = ${JSON.stringify(saida, null, 0)};\n`,
  'utf8'
);
console.log('ok', Object.keys(saida).length, 'ícones');
