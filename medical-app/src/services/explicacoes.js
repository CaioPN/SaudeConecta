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
 * @returns {Promise<string>} O texto da explicação.
 * @throws {Error} Com a mensagem da API quando ela não conseguiu explicar.
 */
export async function explicar(tipo, termo) {
  try {
    const { data } = await api.post('/explicacoes', { tipo, termo });
    return data.texto;
  } catch (err) {
    // A tela precisa distinguir "não temos isso" de "a IA está fora do ar",
    // então a mensagem do backend é repassada em vez de virar um texto só.
    throw new Error(err?.response?.data?.erro || 'Não foi possível carregar a explicação.');
  }
}
