// Quais avisos do Início a pessoa já viu — é o que acende (ou não) a bolinha
// vermelha do card recolhido.
//
// Aviso é calculado na hora e não tem id; o texto dele fala de exame,
// consulta e resultado. Guardar esse texto no localStorage deixaria dado de
// saúde no navegador, então o que se guarda é uma MARCA de 32 bits (FNV-1a)
// de cada um: dá para conferir "este eu já vi", não dá para ler o que era.
// Não é segredo forte: os títulos seguem modelos fixos do AvisoDAO, e quem
// tem o código pode testar os possíveis até achar a marca. Serve contra quem
// abre o localStorage por curiosidade — e no mesmo aparelho já mora o token,
// que dá acesso a muito mais.
// Notificação tem id no banco e entra pelo id.

const CHAVE = 'sc_avisos_vistos';
// O bastante para todos os avisos de uma casa com folga; o mais antigo sai.
const LIMITE = 200;

function marca(texto) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** Marcas dos itens que o card mostra agora (avisos e notificações). */
export function marcasDosItens(avisos, novidades) {
  return [
    ...avisos.map((a) => marca(`${a.tipo}|${a.pessoa || ''}|${a.titulo}`)),
    ...novidades.map((n) => `n${n.id}`),
  ];
}

export function lerVistos() {
  try {
    const lista = JSON.parse(localStorage.getItem(CHAVE));
    return new Set(Array.isArray(lista) ? lista : []);
  } catch {
    return new Set();
  }
}

/** Junta as marcas novas às já vistas e grava; devolve o conjunto atualizado. */
export function gravarVistos(vistos, marcas) {
  const todos = [...new Set([...vistos, ...marcas])].slice(-LIMITE);
  try {
    localStorage.setItem(CHAVE, JSON.stringify(todos));
  } catch {
    // Armazenamento bloqueado: a bolinha volta a acender na próxima visita.
  }
  return new Set(todos);
}
