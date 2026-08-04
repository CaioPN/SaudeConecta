import api from './api';

/**
 * GET /api/prontuario — alergias, condições e medicações do paciente logado.
 *
 * @param {number} [dependenteId] Traz o prontuário de um dependente.
 * @returns {Promise<{alergias: Array, condicoes: Array, medicacoes: Array}>}
 */
export async function buscarProntuario(dependenteId) {
  const { data } = await api.get('/prontuario', {
    params: dependenteId ? { dependenteId } : undefined,
  });
  return {
    alergias: data.alergias || [],
    condicoes: data.condicoes || [],
    // "50mg · 1 comprimido pela manhã" é o texto que a tela mostra.
    medicacoes: (data.medicacoes || []).map((m) => ({
      id: m.id,
      nome: m.nome,
      dosagem: m.dosagem,
      posologia: [m.dosagem, m.frequencia].filter(Boolean).join(' · '),
      desde: m.desde,
    })),
  };
}
