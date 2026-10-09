import api from './api';

/**
 * POST /api/explicacoes — o glossário: o que é um exame, para que serve uma vacina.
 *
 * Só o NOME do item é enviado. O resultado, a data e de quem é o exame nunca
 * saem do app — a explicação é a mesma para todo mundo, e é por isso que ela
 * pode ficar gravada no banco e voltar na hora da segunda vez em diante
 * (ver ExplicacaoDAO.java).
 *
 * @param {'exame'|'vacina'} tipo
 * @param {string} termo Nome como aparece na tela.
 * @returns {Promise<{texto: string, revisado: boolean}>} O texto e se uma
 *   pessoa já o conferiu.
 * @throws {Error} Com a mensagem da API quando ela não conseguiu explicar.
 */
export async function explicar(tipo, termo) {
  try {
    const { data } = await api.post('/explicacoes', { tipo, termo });
    return { texto: data.texto, revisado: Boolean(data.revisado) };
  } catch (err) {
    // A tela precisa distinguir "não temos isso" de "a IA está fora do ar",
    // então a mensagem do backend é repassada em vez de virar um texto só.
    throw new Error(err?.response?.data?.erro || 'Não foi possível carregar a explicação.');
  }
}

/**
 * POST /api/explicacoes/reportar — "este texto tem algum problema".
 *
 * O motivo é um de três códigos fixos, nunca texto livre: o paciente
 * escreveria o próprio resultado ali, e o relato não deve guardar dado
 * clínico.
 *
 * @param {'exame'|'vacina'} tipo
 * @param {string} termo
 * @param {'errado'|'confuso'|'resultado'} motivo
 * @returns {Promise<{suspensa: boolean}>} suspensa = o texto saiu do ar.
 */
export async function reportarExplicacao(tipo, termo, motivo) {
  try {
    const { data } = await api.post('/explicacoes/reportar', { tipo, termo, motivo });
    return { suspensa: Boolean(data.suspensa) };
  } catch (err) {
    throw new Error(err?.response?.data?.erro || 'Não foi possível enviar o relato.');
  }
}
