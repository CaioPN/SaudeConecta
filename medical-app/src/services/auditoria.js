import api from './api';

/**
 * GET /api/auditoria — a trilha de auditoria do paciente logado, do mais
 * recente para o mais antigo.
 *
 * Vem com os dois lados já intercalados pelo backend: o que os médicos fizeram
 * com os códigos temporários (`origem: 'medico'`) e o que o próprio paciente
 * fez na conta (`origem: 'paciente'`).
 */
export async function listarAuditoria() {
  const { data } = await api.get('/auditoria');
  return (data.registros || []).map((r) => ({
    id: r.id,
    origem: r.origem,
    acao: r.acao,
    recurso: r.recurso || null,
    detalhe: r.detalhe || null,
    criadoEm: r.criado_em,
    // Primeiro nome do dependente cujos dados foram abertos (null = titular).
    dependente: r.dependente || null,
    dependenteId: r.dependente_id ?? null,
    ip: r.origem_ip || null,
    escopo: r.escopo || null,
    medico: r.medico?.nome || null,
    crm: r.medico?.crm || null,
    especialidade: r.medico?.especialidade || null,
  }));
}

/**
 * POST /api/exames/exportacao — avisa a API que o PDF de exames foi baixado.
 *
 * O arquivo é montado aqui no navegador pelo jsPDF, então o servidor não teria
 * como saber que uma exportação aconteceu. Só a contagem e o id da pessoa
 * viajam: o nome da ação e o nome do dependente são resolvidos no backend.
 *
 * Falha de propósito em silêncio — o paciente já tem o arquivo na mão, e um
 * erro de rede na auditoria não pode virar um alerta de download quebrado.
 */
export async function registrarExportacao({
  coletas = 0,
  imagens = 0,
  protegido = false,
  dependenteId,
}) {
  try {
    await api.post('/exames/exportacao', { coletas, imagens, protegido, dependenteId });
  } catch {
    // silêncio proposital (ver acima)
  }
}
