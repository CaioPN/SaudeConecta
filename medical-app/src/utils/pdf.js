import { jsPDF } from 'jspdf';

// O que os relatórios em PDF têm em comum (exames e carteira de vacinação):
// a senha, o cabeçalho, o rodapé e a quebra de página. Mora num lugar só para
// que um segundo relatório não nasça com uma regra de senha diferente.

/**
 * Senha do PDF: os 4 primeiros dígitos do CPF do TITULAR. Devolve null quando
 * o cadastro não tem CPF válido — nesse caso o arquivo sai sem proteção e a
 * tela avisa, em vez de gerar um PDF com senha que o paciente não conhece.
 *
 * O relatório de um dependente usa a mesma senha: a conta é do titular, e o
 * dependente não tem login.
 */
export function senhaDoPaciente(paciente) {
  const digitos = String(paciente?.cpf || '').replace(/\D/g, '');
  return digitos.length >= 4 ? digitos.slice(0, 4) : null;
}

/**
 * Cria o documento já com o cabeçalho, e devolve junto o cursor vertical e o
 * helper de quebra de página.
 *
 * Sendo dado de saúde, o arquivo sai criptografado: sem a senha o leitor de
 * PDF nem abre o documento. A senha do dono vai igual à do paciente porque, em
 * branco, ela abriria o arquivo sozinha e a proteção não valeria nada.
 */
export function novoRelatorio({ senha, titulo, nome }) {
  const doc = new jsPDF(
    senha
      ? {
          encryption: {
            userPassword: senha,
            ownerPassword: senha,
            userPermissions: ['print', 'copy'],
          },
        }
      : {}
  );

  const pagina = { y: 20 };

  // Quebra de página quando o conteúdo chega perto do rodapé.
  const espaco = (altura) => {
    if (pagina.y + altura > 275) {
      doc.addPage();
      pagina.y = 20;
    }
  };

  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235);
  doc.text('Saúde Conecta', 14, pagina.y);
  doc.setFontSize(13);
  doc.setTextColor(60, 60, 60);
  pagina.y += 8;
  doc.text(titulo, 14, pagina.y);

  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  pagina.y += 8;
  doc.text(`Paciente: ${nome}`, 14, pagina.y);
  pagina.y += 5;
  doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 14, pagina.y);

  doc.setDrawColor(220, 220, 220);
  pagina.y += 4;
  doc.line(14, pagina.y, 196, pagina.y);

  return { doc, pagina, espaco };
}

/** Rodapé em todas as páginas, com o aviso de que não é documento oficial. */
export function fecharRelatorio(doc, aviso, nomeArquivo) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(aviso, 14, 287);
  }
  doc.save(nomeArquivo);
}

/** "Maria Clara" -> "maria-clara", sem acento, para o nome do arquivo. */
export function nomeDeArquivo(prefixo, nome) {
  const limpo = String(nome || 'paciente')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${prefixo}-${limpo || 'paciente'}.pdf`;
}
