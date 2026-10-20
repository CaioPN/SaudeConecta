import { createContext, useCallback, useContext, useEffect, useState } from 'react';

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
 * trabalho é o CSS: todo `font-size` do app.css é calc(Npx * var(--escala-fonte)),
 * e fundo, borda e texto saem de variáveis que o contraste redefine.
 */
const AcessibilidadeContext = createContext(null);

const CHAVE = 'sc_acessibilidade';

export const TAMANHOS = [
  { id: 'padrao', rotulo: 'Padrão' },
  { id: 'grande', rotulo: 'Grande' },
  { id: 'maior', rotulo: 'Maior' },
];

// Três opções, e não um liga/desliga: "texto mais escuro" ajuda quem não
// distingue o cinza do branco; "fundo escuro" ajuda quem é ofuscado pelo fundo
// claro. São queixas diferentes, e uma não resolve a outra.
export const CONTRASTES = [
  { id: 'normal', rotulo: 'Padrão' },
  { id: 'alto', rotulo: 'Texto escuro' },
  { id: 'escuro', rotulo: 'Fundo escuro' },
];

// fonteEscolhida diz se o tamanho veio da pessoa (botão no Perfil) ou da
// sugestão pela idade. Só o que ela não escolheu pode ser trocado sozinho.
const PADRAO = { fonte: 'padrao', contraste: 'normal', fonteEscolhida: false };

// A partir desta idade o texto já começa em "Grande": a vista cansada
// (presbiopia) costuma aparecer pelos 40 e incomodar de vez pelos 50, e boa
// parte de quem chega a essa idade não sabe que o ajuste existe no Perfil.
export const IDADE_FONTE_GRANDE = 50;

function idadeEmAnos(dataNascimento) {
  const nascimento = new Date(`${String(dataNascimento).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(nascimento.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const m = hoje.getMonth() - nascimento.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
  return idade;
}

// Lê o que estiver gravado, aceitando só valores conhecidos: um localStorage
// adulterado (ou de uma versão antiga) não pode deixar o app com um atributo
// que o CSS não entende.
function lerGravado() {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE));
    if (!bruto) return PADRAO;
    // Até a versão anterior o contraste era um booleano (true = texto escuro).
    const contraste = bruto.contraste === true ? 'alto' : bruto.contraste;
    const fonte = TAMANHOS.some((t) => t.id === bruto.fonte) ? bruto.fonte : PADRAO.fonte;
    return {
      fonte,
      contraste: CONTRASTES.some((c) => c.id === contraste) ? contraste : PADRAO.contraste,
      // As versões antigas gravavam tudo sem dizer se foi escolha. Um tamanho
      // diferente do padrão só pode ter sido escolhido; o padrão, não dá para
      // saber, e fica livre para a sugestão pela idade.
      fonteEscolhida: bruto.fonteEscolhida === true || fonte !== PADRAO.fonte,
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
    if (ajustes.contraste === 'normal') {
      delete body.dataset.contraste;
    } else {
      body.dataset.contraste = ajustes.contraste;
    }

    try {
      localStorage.setItem(CHAVE, JSON.stringify(ajustes));
    } catch {
      // Navegador com armazenamento bloqueado: o ajuste vale para esta sessão.
    }
  }, [ajustes]);

  const definirFonte = (fonte) => setAjustes((a) => ({ ...a, fonte, fonteEscolhida: true }));

  // Chamada quando o paciente entra ou se cadastra. Não passa por cima do que a
  // pessoa escolheu no Perfil; e devolve o mesmo objeto quando nada muda, para
  // não gravar nem redesenhar à toa.
  const sugerirFontePorIdade = useCallback((dataNascimento) => {
    const idade = idadeEmAnos(dataNascimento);
    if (idade === null) return;
    const sugerida = idade >= IDADE_FONTE_GRANDE ? 'grande' : 'padrao';
    setAjustes((a) => (a.fonteEscolhida || a.fonte === sugerida ? a : { ...a, fonte: sugerida }));
  }, []);
  const definirContraste = (contraste) => setAjustes((a) => ({ ...a, contraste }));

  return (
    <AcessibilidadeContext.Provider
      value={{ ...ajustes, definirFonte, definirContraste, sugerirFontePorIdade }}
    >
      {children}
    </AcessibilidadeContext.Provider>
  );
}

export function useAcessibilidade() {
  return useContext(AcessibilidadeContext);
}
