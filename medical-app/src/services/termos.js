import api from './api';

function normalizar(data) {
  return {
    versaoVigente: data.versao_vigente,
    aceito: data.aceito === true,
    aceitoEm: data.aceito_em || null,
  };
}

/** GET /api/termos — versão vigente dos termos e se o paciente já a aceitou. */
export async function situacaoDosTermos() {
  const { data } = await api.get('/termos');
  return normalizar(data);
}

/**
 * POST /api/termos/aceite — registra o aceite. A versão vai junto para o
 * servidor conferir que é a que ele considera vigente (409 se não for).
 */
export async function aceitarTermos(versao) {
  const { data } = await api.post('/termos/aceite', { versao });
  return normalizar(data);
}
