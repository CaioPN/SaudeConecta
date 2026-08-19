import React, { useEffect, useState } from 'react';
import { ChevronLeft, Image as ImageIcon, Droplet, Download, Calendar, Building2, Stethoscope, AlertTriangle, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { useAuth } from '../context/AuthContext';
import { usePrivacidade } from '../context/PrivacidadeContext';
import BotaoPrivacidade from '../components/BotaoPrivacidade';
import { mascararTexto } from '../utils/privacidade';
import ResultRow from '../components/ResultRow';
import InfoField from '../components/InfoField';
import StatusBadge from '../components/StatusBadge';
import { buscarExames } from '../services/exames';
import { situacaoItem, textoReferencia, formatarData, totalAlterados } from '../utils/exames';

// Senha do PDF: os 4 primeiros dígitos do CPF do paciente. Devolve null quando
// o cadastro não tem CPF válido — nesse caso o arquivo sai sem proteção e a
// tela avisa, em vez de gerar um PDF com senha que o paciente não conhece.
function senhaDoPaciente(paciente) {
  const digitos = String(paciente?.cpf || '').replace(/\D/g, '');
  return digitos.length >= 4 ? digitos.slice(0, 4) : null;
}

export default function Exams() {
  const navigate = useNavigate();
  const { paciente } = useAuth();
  const { oculto } = usePrivacidade();
  const [tab, setTab] = useState('sangue');
  const [coletas, setColetas] = useState([]);
  const [imagem, setImagem] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let ativo = true;
    buscarExames()
      .then(({ coletas: c, imagem: i }) => {
        if (!ativo) return;
        setColetas(c);
        setImagem(i);
      })
      .catch(() => {
        if (ativo) setErro('Não foi possível carregar seus exames.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  // Gera e baixa um PDF com o histórico de exames do paciente.
  const baixarPDF = () => {
    const senha = senhaDoPaciente(paciente);

    // Sendo dado de saúde, o arquivo sai criptografado: sem a senha o leitor de
    // PDF nem abre o documento. A senha do dono vai igual à do paciente porque,
    // em branco, ela abriria o arquivo sozinha e a proteção não valeria nada.
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

    const nome = paciente?.nome || 'Paciente';
    const hoje = new Date().toLocaleDateString('pt-BR');
    let y = 20;

    // Quebra de página quando o conteúdo chega perto do rodapé.
    const espaco = (altura) => {
      if (y + altura > 275) {
        doc.addPage();
        y = 20;
      }
    };

    // Cabeçalho
    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235);
    doc.text('Saúde Conecta', 14, y);
    doc.setFontSize(13);
    doc.setTextColor(60, 60, 60);
    y += 8;
    doc.text('Histórico de Exames', 14, y);

    doc.setFontSize(10);
    doc.setTextColor(110, 110, 110);
    y += 8;
    doc.text(`Paciente: ${nome}`, 14, y);
    y += 5;
    doc.text(`Emitido em: ${hoje}`, 14, y);

    doc.setDrawColor(220, 220, 220);
    y += 4;
    doc.line(14, y, 196, y);

    // Seção: Exames de Sangue — uma tabela por coleta.
    coletas.forEach((coleta) => {
      espaco(50);
      y += 10;
      doc.setFontSize(12);
      doc.setTextColor(30, 30, 30);
      doc.text(`Coleta de ${formatarData(coleta.data)}`, 14, y);

      y += 5;
      doc.setFontSize(9);
      doc.setTextColor(110, 110, 110);
      const origem = [coleta.local, coleta.solicitante && `Solicitado por ${coleta.solicitante}`]
        .filter(Boolean)
        .join(' · ');
      doc.text(origem, 14, y);

      // Cabeçalho da tabela
      y += 8;
      doc.text('Exame', 14, y);
      doc.text('Resultado', 80, y);
      doc.text('Referência', 120, y);
      doc.text('Situação', 170, y);

      doc.setFontSize(10);
      coleta.itens.forEach((item) => {
        espaco(10);
        y += 7;
        const situacao = situacaoItem(item);
        doc.setTextColor(30, 30, 30);
        doc.text(String(item.nome), 14, y);
        doc.text(`${item.valor} ${item.unidade}`, 80, y);
        doc.text(textoReferencia(item), 120, y);

        if (situacao === 'alterado') doc.setTextColor(220, 38, 38);
        else if (situacao === 'limite') doc.setTextColor(202, 138, 4);
        else doc.setTextColor(22, 163, 74);
        doc.text(situacao === 'normal' ? 'Normal' : situacao === 'limite' ? 'Limite' : 'Alterado', 170, y);
        doc.setTextColor(30, 30, 30);
      });
    });

    // Seção: Exames de Imagem
    espaco(30);
    y += 14;
    doc.setFontSize(12);
    doc.text('Exames de Imagem', 14, y);
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    imagem.forEach((e) => {
      espaco(10);
      y += 7;
      doc.text(`• ${e.nome} — ${formatarData(e.data)} · ${e.local}`, 14, y);
    });

    // Rodapé
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      'Documento gerado automaticamente pelo Saúde Conecta. Não substitui laudo médico oficial.',
      14,
      287
    );

    const nomeArquivo = `exames-${nome.toLowerCase().replace(/\s+/g, '-')}.pdf`;
    doc.save(nomeArquivo);
  };

  const temExames = coletas.length > 0 || imagem.length > 0;
  const protegido = senhaDoPaciente(paciente) !== null;

  return (
    <div className="screen-container">
      <button onClick={() => navigate(-1)} className="back-btn">
        <ChevronLeft size={20} /> Voltar
      </button>

      <div className="section-header">
        <h2 className="header-title">Exames</h2>
        <div className="flex items-center gap-4">
          <BotaoPrivacidade rotulo="resultados" />
          {temExames && (
            <button onClick={baixarPDF} className="pdf-download-btn">
              <Download size={18} />
              <span>Baixar PDF</span>
            </button>
          )}
        </div>
      </div>

      {temExames && (
        <p className="pdf-nota">
          <Lock size={13} />
          {protegido
            ? 'O PDF baixado abre com senha: os 4 primeiros dígitos do seu CPF.'
            : 'Sem CPF no cadastro, o PDF é baixado sem senha de proteção.'}
        </p>
      )}

      <div className="tabs-wrapper">
        <button onClick={() => setTab('sangue')} className={`tab-btn ${tab === 'sangue' ? 'active' : ''}`}>
          <Droplet size={18} />
          <span>Exames de Sangue</span>
        </button>
        <button onClick={() => setTab('imagem')} className={`tab-btn ${tab === 'imagem' ? 'active' : ''}`}>
          <ImageIcon size={18} />
          <span>Exames de Imagem</span>
        </button>
      </div>

      {carregando && <p className="empty-state">Carregando exames…</p>}
      {erro && !carregando && <p className="empty-state">{erro}</p>}

      {!carregando && !erro && tab === 'sangue' && (
        coletas.length === 0 ? (
          <p className="empty-state">Nenhum exame de sangue registrado até o momento.</p>
        ) : (
          coletas.map((coleta) => {
            const alterados = totalAlterados(coleta);
            return (
              <div key={coleta.id} className="card exam-card">
                <div className="exam-card-header">
                  <div>
                    <h3 className="exam-card-title">
                      <Calendar size={16} /> {formatarData(coleta.data)}
                    </h3>
                    <p className="exam-card-meta">
                      <Building2 size={13} /> {coleta.local}
                    </p>
                    {coleta.solicitante && (
                      <p className="exam-card-meta">
                        <Stethoscope size={13} /> Solicitado por {coleta.solicitante}
                        {coleta.crm ? ` · ${coleta.crm}` : ''}
                      </p>
                    )}
                  </div>
                  {oculto ? (
                    <span className="status-badge oculto">•••</span>
                  ) : (
                    <StatusBadge
                      status={alterados > 0 ? 'alterado' : 'normal'}
                      texto={
                        alterados > 0
                          ? `${alterados} ${alterados === 1 ? 'alterado' : 'alterados'}`
                          : 'Tudo normal'
                      }
                    />
                  )}
                </div>

                {coleta.itens.map((item) => (
                  <ResultRow key={item.id} item={item} />
                ))}
              </div>
            );
          })
        )
      )}

      {!carregando && !erro && tab === 'imagem' && (
        imagem.length === 0 ? (
          <p className="empty-state">Nenhum exame de imagem registrado até o momento.</p>
        ) : (
          imagem.map((exame) => (
            <div key={exame.id} className="card exam-card">
              <div className="exam-card-header">
                <h3 className="exam-card-title">
                  <ImageIcon size={16} /> {exame.nome}
                </h3>
              </div>

              <InfoField icon={Calendar} label="Realizado em">
                {formatarData(exame.data)}
              </InfoField>
              <InfoField icon={Building2} label="Local">
                {exame.local}
              </InfoField>
              {exame.solicitante && (
                <InfoField icon={Stethoscope} label="Solicitado por">
                  {exame.solicitante}
                </InfoField>
              )}

              {exame.laudo && (
                <>
                  <p className="exam-laudo-label">Conclusão do laudo</p>
                  <p className={`record-card ${oculto ? 'valor-oculto' : ''}`}>
                    {oculto ? mascararTexto(exame.laudo) : exame.laudo}
                  </p>
                  <p className="exam-aviso">
                    <AlertTriangle size={13} /> Resumo informativo — não substitui o laudo oficial.
                  </p>
                </>
              )}
            </div>
          ))
        )
      )}
    </div>
  );
}
