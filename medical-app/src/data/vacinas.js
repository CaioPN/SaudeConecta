// Calendário Nacional de Vacinação (PNI — Ministério da Saúde / SUS).
//
// ATENÇÃO — quem usa este arquivo hoje é a versão de demonstração (demo/).
// No aplicativo, o calendário mora no banco (tabela `calendario_vacinal`) e a
// carteira é montada pela API, porque ela tem dois leitores: a tela e o
// AvisoDAO, que conta as doses atrasadas para o Dashboard. A demo não tem
// backend nenhum, então continua montando a carteira aqui, com as mesmas
// regras — ao mexer no calendário, mexa nos dois (o seed.sql é gerado a
// partir desta lista).
//
// Cada dose tem uma idade recomendada, então dá para calcular a data prevista
// e comparar com o que foi registrado como aplicado.

// --- Calendário da Criança (0 a 4 anos) ---
// `idadeMeses` = idade recomendada para a dose (em meses).
export const CALENDARIO_CRIANCA = [
  { vacina: 'BCG', dose: 'Dose única', idadeMeses: 0, periodo: 'Ao nascer', protege: 'Formas graves de tuberculose' },
  { vacina: 'Hepatite B', dose: '1ª dose', idadeMeses: 0, periodo: 'Ao nascer', protege: 'Hepatite B' },

  { vacina: 'Pentavalente', dose: '1ª dose', idadeMeses: 2, periodo: '2 meses', protege: 'Difteria, tétano, coqueluche, Hib e hepatite B' },
  { vacina: 'VIP (Poliomielite)', dose: '1ª dose', idadeMeses: 2, periodo: '2 meses', protege: 'Poliomielite (paralisia infantil)' },
  { vacina: 'Pneumocócica 10', dose: '1ª dose', idadeMeses: 2, periodo: '2 meses', protege: 'Pneumonia, meningite e otite' },
  { vacina: 'Rotavírus', dose: '1ª dose', idadeMeses: 2, periodo: '2 meses', protege: 'Diarreia grave por rotavírus' },

  { vacina: 'Meningocócica C', dose: '1ª dose', idadeMeses: 3, periodo: '3 meses', protege: 'Meningite meningocócica C' },

  { vacina: 'Pentavalente', dose: '2ª dose', idadeMeses: 4, periodo: '4 meses' },
  { vacina: 'VIP (Poliomielite)', dose: '2ª dose', idadeMeses: 4, periodo: '4 meses' },
  { vacina: 'Pneumocócica 10', dose: '2ª dose', idadeMeses: 4, periodo: '4 meses' },
  { vacina: 'Rotavírus', dose: '2ª dose', idadeMeses: 4, periodo: '4 meses' },

  { vacina: 'Meningocócica C', dose: '2ª dose', idadeMeses: 5, periodo: '5 meses' },

  { vacina: 'Pentavalente', dose: '3ª dose', idadeMeses: 6, periodo: '6 meses' },
  { vacina: 'VIP (Poliomielite)', dose: '3ª dose', idadeMeses: 6, periodo: '6 meses' },

  { vacina: 'Febre Amarela', dose: '1ª dose', idadeMeses: 9, periodo: '9 meses', protege: 'Febre amarela' },

  { vacina: 'Tríplice Viral', dose: '1ª dose', idadeMeses: 12, periodo: '12 meses', protege: 'Sarampo, caxumba e rubéola' },
  { vacina: 'Pneumocócica 10', dose: 'Reforço', idadeMeses: 12, periodo: '12 meses' },
  { vacina: 'Meningocócica C', dose: 'Reforço', idadeMeses: 12, periodo: '12 meses' },

  { vacina: 'DTP', dose: '1º reforço', idadeMeses: 15, periodo: '15 meses', protege: 'Difteria, tétano e coqueluche' },
  { vacina: 'VOP (Poliomielite)', dose: '1º reforço', idadeMeses: 15, periodo: '15 meses' },
  { vacina: 'Hepatite A', dose: 'Dose única', idadeMeses: 15, periodo: '15 meses', protege: 'Hepatite A' },
  { vacina: 'Tetra Viral', dose: 'Dose única', idadeMeses: 15, periodo: '15 meses', protege: 'Sarampo, caxumba, rubéola e varicela' },

  { vacina: 'DTP', dose: '2º reforço', idadeMeses: 48, periodo: '4 anos' },
  { vacina: 'VOP (Poliomielite)', dose: '2º reforço', idadeMeses: 48, periodo: '4 anos' },
  { vacina: 'Varicela', dose: '2ª dose', idadeMeses: 48, periodo: '4 anos', protege: 'Catapora (varicela)' },
  { vacina: 'Febre Amarela', dose: 'Reforço', idadeMeses: 48, periodo: '4 anos' },
];

// --- Calendário do Adolescente / Adulto ---
// Sem cálculo de data por idade: exibimos o período de referência e, para o
// titular da conta, tratamos toda a carteira como já em dia.
export const CALENDARIO_ADULTO = [
  { vacina: 'Hepatite B', dose: 'Esquema completo (3 doses)', periodo: 'Infância', protege: 'Hepatite B' },
  { vacina: 'Tríplice Viral', dose: '2 doses', periodo: 'Infância / Adolescência', protege: 'Sarampo, caxumba e rubéola' },
  { vacina: 'Febre Amarela', dose: 'Dose única', periodo: 'Infância', protege: 'Febre amarela' },
  { vacina: 'HPV Quadrivalente', dose: '2 doses', periodo: '9 a 14 anos', protege: 'Cânceres associados ao HPV' },
  { vacina: 'Meningocócica ACWY', dose: 'Dose de reforço', periodo: '11 a 14 anos', protege: 'Meningite A, C, W e Y' },
  { vacina: 'dT (Dupla adulto)', dose: 'Reforço', periodo: 'A cada 10 anos', protege: 'Difteria e tétano' },
  { vacina: 'COVID-19', dose: 'Esquema completo', periodo: 'Atualizado' },
  { vacina: 'Influenza', dose: 'Dose anual', periodo: 'Campanha 2026', protege: 'Gripe (influenza)' },
];

// Soma `meses` a uma data ISO (YYYY-MM-DD) e devolve um objeto Date.
function adicionarMeses(dataIso, meses) {
  const d = new Date(`${dataIso}T00:00:00`);
  d.setMonth(d.getMonth() + meses);
  return d;
}

function formatarData(d) {
  return d.toLocaleDateString('pt-BR');
}

/**
 * Monta a carteira de vacinação de uma pessoa.
 *
 * São três estados, e não dois. A primeira versão dava a dose por tomada
 * sempre que a data prevista já tinha passado, o que é o oposto de um alerta
 * útil: a criança que não foi ao posto aparecia em dia. Agora "aplicada" é só
 * o que alguém registrou, e o que venceu sem registro fica "atrasada".
 *
 * @param {string} dataNascimento  Data de nascimento em ISO (YYYY-MM-DD).
 * @param {object} opts
 * @param {boolean} opts.adulto     Usa o calendário adulto (sem idade fixa).
 * @param {object} opts.aplicadas   Mapa `{ [idDaDose]: dataISO }` do que já foi
 *                                  registrado como aplicado.
 * @returns {Array} doses com `id`, `status` ('aplicada' | 'atrasada' |
 *                  'prevista'), `dataPrevista` e `aplicadaEm`.
 */
export function montarCarteira(dataNascimento, { adulto = false, aplicadas = {} } = {}) {
  const usarAdulto = adulto || !dataNascimento;
  const base = usarAdulto ? CALENDARIO_ADULTO : CALENDARIO_CRIANCA;
  const hoje = new Date();

  return base.map((v, i) => {
    const id = (usarAdulto ? 'a' : 'c') + i;
    const aplicadaEm = aplicadas[id] || null;

    // Doses do calendário adulto não têm idade recomendada: dependem de
    // campanha e de histórico que o app não guarda, então nunca "atrasam".
    if (v.idadeMeses == null) {
      return { ...v, id, aplicadaEm, status: aplicadaEm ? 'aplicada' : 'prevista' };
    }

    const prevista = adicionarMeses(dataNascimento, v.idadeMeses);
    let status = 'prevista';
    if (aplicadaEm) status = 'aplicada';
    else if (prevista <= hoje) status = 'atrasada';

    return { ...v, id, aplicadaEm, dataPrevista: formatarData(prevista), status };
  });
}
