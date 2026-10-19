import React, { useState } from 'react';
import { ChevronLeft, CheckCircle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ICONES } from '../utils/icones';
import {
  CRITERIOS, PERFIS, RECURSOS, FORMULARIO_CONFIGURADO, enviarAvaliacao,
} from '../demo/avaliacao';

// Avaliação do projeto pelos visitantes da feira. Só existe na demonstração:
// a rota é registrada no App apenas quando MODO_DEMO é verdadeiro.

const NOTAS = [0, 1, 2, 3, 4, 5];
const LIMITE_FEEDBACK = 1000;

const notasVazias = () => Object.fromEntries(CRITERIOS.map((c) => [c.id, null]));

export default function AvaliarProjeto() {
  const navigate = useNavigate();
  const [notas, setNotas] = useState(notasVazias);
  const [perfil, setPerfil] = useState('');
  const [recurso, setRecurso] = useState('');
  const [feedback, setFeedback] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState(false);

  // Perfil e recurso são obrigatórios no Google Forms: sem eles o Google recusa
  // a resposta inteira, então contam como pendência junto com as notas.
  const faltando =
    CRITERIOS.filter((c) => notas[c.id] === null).length + (perfil ? 0 : 1) + (recurso ? 0 : 1);

  const darNota = (id, nota) => setNotas((atual) => ({ ...atual, [id]: nota }));

  // O estande costuma ter um aparelho só, usado por várias pessoas: depois de
  // enviar, o formulário volta em branco para a próxima.
  const recomecar = () => {
    setNotas(notasVazias());
    setPerfil('');
    setRecurso('');
    setFeedback('');
    setErro('');
    setEnviado(false);
  };

  const enviar = async (e) => {
    e.preventDefault();
    if (faltando > 0) {
      setErro(`Falta responder ${faltando} ${faltando === 1 ? 'item' : 'itens'}.`);
      return;
    }
    setEnviando(true);
    setErro('');
    try {
      await enviarAvaliacao({ notas, perfil, recurso, feedback });
      setEnviado(true);
    } catch (falha) {
      setErro(
        falha.message === 'formulario_nao_configurado'
          ? 'O formulário de avaliação ainda não foi configurado.'
          : 'Não foi possível enviar. Confira a conexão com a internet e tente de novo.'
      );
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <div className="screen-container">
        <div className="card avaliacao-obrigado">
          <CheckCircle size={48} />
          <h2 className="header-title">Obrigado pela avaliação!</h2>
          <p className="header-subtitle">
            Sua opinião ajuda a melhorar o Saúde Conecta.
          </p>
          <button type="button" className="btn-primary" onClick={() => navigate('/dashboard')}>
            Voltar ao app
          </button>
          <button type="button" className="btn-secondary" onClick={recomecar}>
            Enviar outra avaliação
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-container tela-rolagem">
      <div className="tela-topo">
        <button onClick={() => navigate(-1)} className="back-btn">
          <ChevronLeft size={20} /> Voltar
        </button>

        <div className="flex items-center gap-4 mb-2">
          <div className="icon-box">
            <ICONES.avaliacao size={24} />
          </div>
          <h2 className="header-title">Avaliar o projeto</h2>
        </div>
        <p className="header-subtitle mb-6">De 0 (muito ruim) a 5 (excelente)</p>
      </div>

      <form className="tela-lista" onSubmit={enviar}>
        {!FORMULARIO_CONFIGURADO && (
          <p className="demo-nota" style={{ marginTop: 0, marginBottom: '16px' }}>
            <Info size={14} />
            <span>O envio ainda não está ligado ao formulário.</span>
          </p>
        )}

        <div className="card">
          {CRITERIOS.map((c) => (
            <fieldset key={c.id} className="avaliacao-criterio">
              <legend className="avaliacao-titulo">{c.titulo}</legend>
              <p className="avaliacao-pergunta">{c.pergunta}</p>
              <div className="avaliacao-notas" role="radiogroup" aria-label={c.titulo}>
                {NOTAS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={notas[c.id] === n}
                    className={`avaliacao-nota ${notas[c.id] === n ? 'ativa' : ''}`}
                    onClick={() => darNota(c.id, n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="card">
          <p className="avaliacao-titulo">Quem é você?</p>
          <div className="avaliacao-opcoes">
            {PERFIS.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={perfil === p}
                className={`avaliacao-opcao ${perfil === p ? 'ativa' : ''}`}
                onClick={() => setPerfil(perfil === p ? '' : p)}
              >
                {p}
              </button>
            ))}
          </div>

          <p className="avaliacao-titulo" style={{ marginTop: '20px' }}>
            Recurso de que mais gostou
          </p>
          <div className="avaliacao-opcoes">
            {RECURSOS.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={recurso === r}
                className={`avaliacao-opcao ${recurso === r ? 'ativa' : ''}`}
                onClick={() => setRecurso(recurso === r ? '' : r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <label htmlFor="avaliacao-feedback" className="avaliacao-titulo">
            Deixe seu feedback <span className="text-muted">(opcional)</span>
          </label>
          <textarea
            id="avaliacao-feedback"
            className="input-field avaliacao-texto"
            rows={5}
            maxLength={LIMITE_FEEDBACK}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="O que gostou, o que melhoraria, o que faltou..."
          />
          {/* A avaliação é anônima: não pedimos nome e o texto vai para uma
              planilha, então não deve carregar dado de ninguém. */}
          <p className="avaliacao-aviso">
            Não escreva dados pessoais. A avaliação é anônima.
          </p>
        </div>

        {erro && <p className="form-erro">{erro}</p>}

        <button type="submit" className="btn-primary" disabled={enviando}>
          {enviando ? 'Enviando...' : 'Enviar avaliação'}
        </button>
      </form>
    </div>
  );
}
