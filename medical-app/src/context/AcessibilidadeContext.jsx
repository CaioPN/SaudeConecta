import { createContext, useContext, useEffect, useState } from 'react';

/**
 * Tamanho do texto e contraste — os dois ajustes de acessibilidade do app.
 *
 * Ao contrário do "olhinho" e do seletor de pessoa, esta escolha É GRAVADA no
 * aparelho: quem aumentou a fonte porque não enxerga o texto pequeno não
 * enxerga melhor no dia seguinte, e refazer o ajuste a cada abertura seria o
 * mesmo que não ter o recurso. Não é dado de saúde nem identifica ninguém, então
 * o localStorage serve — é preferência de exibição, como o tema de um site.
 *
 * O estado vira atributo no <body> (data-fonte / data-contraste) e quem faz o
 * trabalho é o CSS: todo `font-size` do app.css é calc(Npx * var(--escala-fonte)).
 */
const AcessibilidadeContext = createContext(null);

const CHAVE = 'sc_acessibilidade';

export const TAMANHOS = [
  { id: 'padrao', rotulo: 'Padrão' },
  { id: 'grande', rotulo: 'Grande' },
  { id: 'maior', rotulo: 'Maior' },
];

const PADRAO = { fonte: 'padrao', contraste: false };

// Lê o que estiver gravado, aceitando só valores conhecidos: um localStorage
// adulterado (ou de uma versão antiga) não pode deixar o app com um atributo
// que o CSS não entende.
function lerGravado() {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE));
    if (!bruto) return PADRAO;
    return {
      fonte: TAMANHOS.some((t) => t.id === bruto.fonte) ? bruto.fonte : PADRAO.fonte,
      contraste: Boolean(bruto.contraste),
    };
  } catch {
    return PADRAO;
  }
}

export function AcessibilidadeProvider({ children }) {
  const [ajustes, setAjustes] = useState(lerGravado);

  useEffect(() => {
    // O <body>, e não o quadro do app: o modal é desenhado por portal direto
    // no body e ficaria de fora se o atributo morasse no .app-container.
    const { body } = document;
    if (ajustes.fonte === 'padrao') {
      delete body.dataset.fonte;
    } else {
      body.dataset.fonte = ajustes.fonte;
    }
    if (ajustes.contraste) {
      body.dataset.contraste = 'alto';
    } else {
      delete body.dataset.contraste;
    }

    try {
      localStorage.setItem(CHAVE, JSON.stringify(ajustes));
    } catch {
      // Navegador com armazenamento bloqueado: o ajuste vale para esta sessão.
    }
  }, [ajustes]);

  const definirFonte = (fonte) => setAjustes((a) => ({ ...a, fonte }));
  const alternarContraste = () => setAjustes((a) => ({ ...a, contraste: !a.contraste }));

  return (
    <AcessibilidadeContext.Provider
      value={{ ...ajustes, definirFonte, alternarContraste }}
    >
      {children}
    </AcessibilidadeContext.Provider>
  );
}

export function useAcessibilidade() {
  return useContext(AcessibilidadeContext);
}
