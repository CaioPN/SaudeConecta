import { totalAlterados, formatarData } from './exames';

/**
 * Monta o histórico do paciente juntando consultas e exames num só array,
 * ordenado da data mais recente para a mais antiga.
 *
 * @param {Array} consultas Consultas vindas de services/consultas.js
 * @param {Array} coletas   Exames de sangue vindos de services/exames.js
 * @param {Array} imagens   Exames de imagem vindos de services/exames.js
 * @returns {Array} eventos com { id, tipo, data, titulo, subtitulo, descricao, rota }
 */
export function montarLinhaDoTempo(consultas, coletas, imagens) {
  const eventos = [];

  consultas
    .filter((c) => c.status === 'realizada')
    .forEach((c) => {
      eventos.push({
        id: `consulta-${c.id}`,
        tipo: 'consulta',
        data: c.data,
        titulo: c.motivo,
        subtitulo: [c.medico, c.especialidade].filter(Boolean).join(' · '),
        descricao: c.resumo,
        rota: `/appointment/${c.id}`,
      });
    });

  coletas.forEach((coleta) => {
    const alterados = totalAlterados(coleta);
    eventos.push({
      id: `exame-${coleta.id}`,
      tipo: 'exame',
      data: coleta.data,
      titulo: 'Exames de sangue',
      subtitulo: coleta.local,
      descricao:
        alterados > 0
          ? `${alterados} ${alterados === 1 ? 'resultado fora' : 'resultados fora'} da faixa de referência.`
          : 'Todos os resultados dentro da faixa de referência.',
      alerta: alterados > 0,
      rota: '/exams',
    });
  });

  imagens.forEach((exame) => {
    eventos.push({
      id: `exame-${exame.id}`,
      tipo: 'exame',
      data: exame.data,
      titulo: exame.nome,
      subtitulo: exame.local,
      descricao: exame.laudo,
      rota: '/exams',
    });
  });

  return eventos
    .sort((a, b) => b.data.localeCompare(a.data))
    .map((e) => ({ ...e, dataFormatada: formatarData(e.data) }));
}
