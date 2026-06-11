import React, { useState } from 'react';
import { ChevronLeft, Image as ImageIcon, Droplet, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { useAuth } from '../context/AuthContext';

// Dados dos exames (origem única usada tanto na tela quanto no PDF).
const EXAMES_SANGUE = [
  { label: 'Hemoglobina', value: 13.5, min: 12.0, max: 16.0, unit: 'g/dL', percent: 60, color: 'bg-green-500' },
  { label: 'Glicose', value: 85, min: 70, max: 99, unit: 'mg/dL', percent: 45, color: 'bg-green-500' },
  { label: 'Colesterol', value: 190, min: 0, max: 200, unit: 'mg/dL', percent: 85, color: 'bg-red-500' },
  { label: 'Creatinina', value: 0.9, min: 0.6, max: 1.1, unit: 'mg/dL', percent: 50, color: 'bg-green-500' },
];

const EXAMES_IMAGEM = [
  { nome: 'Raio-X de Tórax (PA)', data: '12 Jan 2026' },
];

export default function Exams() {
  const navigate = useNavigate();
  const { paciente } = useAuth();
  const [tab, setTab] = useState('sangue');

  // Considera "fora da referência" quando o valor sai do intervalo min–max.
  const situacao = (e) => (e.value < e.min || e.value > e.max ? 'Alterado' : 'Normal');

  // Gera e baixa um PDF com o histórico de exames do paciente.
  const baixarPDF = () => {
    const doc = new jsPDF();
    const nome = paciente?.nome || 'Paciente';
    const hoje = new Date().toLocaleDateString('pt-BR');
    let y = 20;

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

    // Seção: Exames de Sangue
    y += 10;
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    doc.text('Exames de Sangue (Hemograma e Bioquímica)', 14, y);

    // Cabeçalho da tabela
    y += 8;
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text('Exame', 14, y);
    doc.text('Resultado', 80, y);
    doc.text('Referência', 120, y);
    doc.text('Situação', 170, y);

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    EXAMES_SANGUE.forEach((e) => {
      y += 7;
      const alterado = situacao(e) === 'Alterado';
      doc.text(String(e.label), 14, y);
      doc.text(`${e.value} ${e.unit}`, 80, y);
      doc.text(`${e.min} - ${e.max} ${e.unit}`, 120, y);
      if (alterado) doc.setTextColor(220, 38, 38);
      else doc.setTextColor(22, 163, 74);
      doc.text(situacao(e), 170, y);
      doc.setTextColor(30, 30, 30);
    });

    // Seção: Exames de Imagem
    y += 14;
    doc.setFontSize(12);
    doc.text('Exames de Imagem', 14, y);
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    EXAMES_IMAGEM.forEach((e) => {
      y += 7;
      doc.text(`• ${e.nome} — Realizado em ${e.data}`, 14, y);
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

  const BarChartItem = ({ label, value, min, max, unit, percent, color }) => (
    <div className="bar-chart-item">
      <div className="bar-chart-header">
        <span className="font-bold">{label}</span>
        <span className="font-bold">{value} <span className="text-xs text-muted font-normal">{unit}</span></span>
      </div>
      <div className="bar-bg">
        <div className={`bar-fill ${color}`} style={{ width: `${percent}%` }}></div>
      </div>
      <div className="text-xs text-muted">Ref: {min} - {max} {unit}</div>
    </div>
  );

  return (
    <div className="screen-container">
      <button onClick={() => navigate(-1)} className="back-btn">
        <ChevronLeft size={20} /> Voltar
      </button>

      <div className="flex items-center justify-between mb-6">
        <h2 className="header-title">Exames</h2>
        <button onClick={baixarPDF} className="pdf-download-btn">
          <Download size={18} />
          <span>Baixar PDF</span>
        </button>
      </div>

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

      {tab === 'sangue' && (
        <div className="card">
          <h3 className="section-title">Hemograma e Bioquímica</h3>
          {EXAMES_SANGUE.map((e) => (
            <BarChartItem key={e.label} {...e} />
          ))}
        </div>
      )}

      {tab === 'imagem' && (
        <div className="card flex-col items-center">
          <div className="icon-box icon-box-gray icon-box-lg mb-6"><ImageIcon size={32} /></div>
          <h3 className="font-bold mb-2">{EXAMES_IMAGEM[0].nome}</h3>
          <p className="text-sm text-muted mb-6">Realizado em {EXAMES_IMAGEM[0].data}</p>
          <button className="btn-primary" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>Visualizar Laudo</button>
        </div>
      )}
    </div>
  );
}
