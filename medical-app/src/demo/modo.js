// true só no build de demonstração (`vite build --mode demo`). O Vite troca a
// expressão por uma constante na compilação, então no build normal todo bloco
// `if (MODO_DEMO)` some do bundle — e o servidor de mentira junto com ele.
export const MODO_DEMO = import.meta.env.MODE === 'demo';

/**
 * Faz uma instância do axios responder pelo servidor de mentira em vez da
 * rede. O import é dinâmico para o servidor e os dados fictícios ficarem num
 * arquivo à parte, que só a demonstração baixa.
 */
export function usarServidorDemo(instancia) {
  if (!MODO_DEMO) return;
  instancia.defaults.adapter = (config) =>
    import('./servidor.js').then(({ responder }) => responder(config));
}
