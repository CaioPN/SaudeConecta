// Calendário Nacional de Vacinação (PNI — Ministério da Saúde / SUS).
// Usado para montar a Carteira de Vacinação automaticamente a partir da
// data de nascimento da pessoa: cada dose tem uma idade recomendada, então
// conseguimos calcular a data prevista e se ela já deveria ter sido tomada.

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
 * @param {string} dataNascimento  Data de nascimento em ISO (YYYY-MM-DD).
 * @param {object} opts
 * @param {boolean} opts.adulto     Usa o calendário adulto (tudo em dia).
 * @returns {Array} lista de doses com `status` ('tomada' | 'pendente') e datas.
 */
export function montarCarteira(dataNascimento, { adulto = false } = {}) {
  if (adulto || !dataNascimento) {
    // Titular / adulto: carteira considerada completa.
    return CALENDARIO_ADULTO.map((v) => ({ ...v, status: 'tomada' }));
  }

  const hoje = new Date();
  return CALENDARIO_CRIANCA.map((v) => {
    const prevista = adicionarMeses(dataNascimento, v.idadeMeses);
    const status = prevista <= hoje ? 'tomada' : 'pendente';
    return { ...v, dataPrevista: formatarData(prevista), status };
  });
}
