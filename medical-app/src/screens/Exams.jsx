import React, { useState } from 'react';
import { ChevronLeft, Image as ImageIcon, Droplet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Exams() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('sangue');

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

      <h2 className="header-title mb-6">Exames</h2>

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
          <BarChartItem label="Hemoglobina" value={13.5} min={12.0} max={16.0} unit="g/dL" percent={60} color="bg-red-500" />
          <BarChartItem label="Glicose" value={85} min={70} max={99} unit="mg/dL" percent={45} color="bg-blue-500" />
          <BarChartItem label="Colesterol" value={190} min={0} max={200} unit="mg/dL" percent={85} color="bg-yellow-500" />
          <BarChartItem label="Creatinina" value={0.9} min={0.6} max={1.1} unit="mg/dL" percent={50} color="bg-green-500" />
        </div>
      )}

      {tab === 'imagem' && (
        <div className="card flex-col items-center">
          <div className="icon-box icon-box-gray icon-box-lg mb-6"><ImageIcon size={32} /></div>
          <h3 className="font-bold mb-2">Raio-X de Tórax (PA)</h3>
          <p className="text-sm text-muted mb-6">Realizado em 12 Jan 2026</p>
          <button className="btn-primary" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>Visualizar Laudo</button>
        </div>
      )}
    </div>
  );
}