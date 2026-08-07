import React, { useState } from 'react';
import {
  ChevronLeft, ChevronDown, HelpCircle, Info, KeyRound, Users,
  Stethoscope, Syringe, UserCheck, Lock, MessageCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FAQ } from '../content/FaqContent';

// Ícone de cada categoria. A chave é o `id` definido em content/FaqContent.js.
const ICONES = {
  geral: Info,
  conta: KeyRound,
  dependentes: Users,
  consultas: Stethoscope,
  vacinas: Syringe,
  medico: UserCheck,
  privacidade: Lock,
};

export default function Faq() {
  const navigate = useNavigate();
  // Guarda a pergunta aberta como "categoria-índice"; null = todas fechadas.
  // Só uma fica aberta por vez, para a tela não virar um paredão de texto.
  const [aberta, setAberta] = useState(null);

  const alternar = (chave) => setAberta((atual) => (atual === chave ? null : chave));

  return (
    <div className="screen-container">
      <button onClick={() => navigate(-1)} className="back-btn">
        <ChevronLeft size={20} /> Voltar
      </button>

      <div className="flex items-center gap-4 mb-2">
        <div className="icon-box">
          <HelpCircle size={24} />
        </div>
        <h2 className="header-title">Dúvidas Frequentes</h2>
      </div>
      <p className="header-subtitle mb-6">Toque em uma pergunta para ver a resposta</p>

      {FAQ.map((categoria) => {
        const Icone = ICONES[categoria.id] || Info;
        return (
          <div key={categoria.id} className="card" style={{ marginBottom: '16px' }}>
            <div className="faq-categoria">
              <Icone size={18} />
              <h3 className="faq-categoria-titulo">{categoria.titulo}</h3>
            </div>

            {categoria.perguntas.map((item, indice) => {
              const chave = `${categoria.id}-${indice}`;
              const estaAberta = aberta === chave;
              return (
                <div key={chave} className={`faq-item ${estaAberta ? 'aberta' : ''}`}>
                  <button
                    type="button"
                    className="faq-pergunta"
                    onClick={() => alternar(chave)}
                    aria-expanded={estaAberta}
                  >
                    <span>{item.p}</span>
                    <ChevronDown size={18} className="faq-seta" />
                  </button>
                  {estaAberta && <p className="faq-resposta">{item.r}</p>}
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="card border-blue">
        <div className="flex items-center gap-4 text-blue mb-2">
          <MessageCircle size={18} />
          <span className="font-bold text-sm">Não encontrou o que procurava?</span>
        </div>
        <p className="text-sm text-muted">
          Pergunte ao assistente virtual pelo botão azul no canto da tela, ou escreva
          para <strong>suporte@saudeconecta.com.br</strong>.
        </p>
      </div>
    </div>
  );
}
