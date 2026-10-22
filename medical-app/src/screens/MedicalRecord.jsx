import React, { useEffect, useState } from 'react';
import { AlertCircle, Heart, Clock, ChevronLeft, Pill, Stethoscope, Droplet, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useVoltar from '../hooks/useVoltar';
import { usePessoas } from '../context/PessoasContext';
import { usePrivacidade } from '../context/PrivacidadeContext';
import BotaoPrivacidade from '../components/BotaoPrivacidade';
import EstadoErro from '../components/EstadoErro';
import { mensagemDaAcao } from '../utils/falhas';
import SeletorPessoa from '../components/SeletorPessoa';
import Modal from '../components/Modal';
import ConfirmarExclusao from '../components/ConfirmarExclusao';
import { mascararTexto } from '../utils/privacidade';
import { buscarProntuario, informarItem, apagarItemInformado } from '../services/prontuario';
import { listarConsultas } from '../services/consultas';
import { buscarExames } from '../services/exames';
import { montarLinhaDoTempo } from '../utils/prontuario';

// Ícone de cada tipo de evento da linha do tempo.
const ICONES = { consulta: Stethoscope, exame: Droplet };

const ITEM_VAZIO = { tipo: 'alergia', descricao: '', desde: '' };
const TAMANHO_DESCRICAO = 160;

/**
 * Uma alergia ou condição na visão geral. O que o próprio paciente informou
 * ganha a etiqueta "informado por você" e um X para apagar — o que veio do
 * profissional não tem X: é prontuário, e só sai pelo portal do médico.
 */
function ItemProntuario({ item, tipo, oculto, aoApagar }) {
  const doPaciente = item.origem === 'paciente';
  return (
    <div className="prontuario-visao-item">
      <div>
        <p className={`font-bold ${oculto ? 'valor-oculto' : ''}`}>
          {oculto ? mascararTexto(item.descricao) : item.descricao}
        </p>
        {doPaciente && <span className="etiqueta-informado">informado por você</span>}
      </div>
      {doPaciente && (
        <button
          type="button"
          className="prontuario-apagar"
          onClick={() => aoApagar({ ...item, tipo })}
          title={`Apagar ${item.descricao}`}
          aria-label={`Apagar ${item.descricao}`}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export default function MedicalRecord() {
  const navigate = useNavigate();
  const voltar = useVoltar('/patient');
  const { pessoa, dependenteId } = usePessoas();
  const { oculto } = usePrivacidade();
  const [prontuario, setProntuario] = useState({ alergias: [], condicoes: [], medicacoes: [] });
  const [eventos, setEventos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  // Formulário de "informar alergia ou condição" (aberto = janela visível).
  const [formAberto, setFormAberto] = useState(false);
  const [form, setForm] = useState(ITEM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');
  // Item cuja exclusão espera confirmação; null = janela fechada.
  const [aApagar, setAApagar] = useState(null);
  const [erroAcao, setErroAcao] = useState('');
  const [tentativa, setTentativa] = useState(0);

  // Refaz tudo ao trocar de pessoa: as três origens precisam ser da mesma
  // pessoa, senão a linha do tempo misturaria consultas de um com exames de outro.
  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(null);
    // O prontuário reúne três origens: dados fixos (alergias/condições/
    // medicações), consultas e exames — que juntos formam a linha do tempo.
    Promise.all([
      buscarProntuario(dependenteId),
      listarConsultas(dependenteId),
      buscarExames(dependenteId),
    ])
      .then(([dados, consultas, { coletas, imagem }]) => {
        if (!ativo) return;
        setProntuario(dados);
        setEventos(montarLinhaDoTempo(consultas, coletas, imagem));
      })
      .catch((falha) => {
        if (ativo) setErro(falha);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [dependenteId, tentativa]);

  const { alergias, condicoes, medicacoes } = prontuario;

  // Só as listas fixas são relidas: a linha do tempo não muda com uma alergia.
  const recarregarProntuario = () =>
    // Falhar aqui deixaria na tela a lista de antes da mudança — o item recém
    // salvo não apareceria, e o paciente o salvaria de novo. Melhor admitir.
    buscarProntuario(dependenteId).then(setProntuario).catch(setErro);

  const abrirFormulario = () => {
    setForm(ITEM_VAZIO);
    setErroForm('');
    setFormAberto(true);
  };

  const salvar = async (e) => {
    e.preventDefault();
    if (!form.descricao.trim()) {
      setErroForm(form.tipo === 'alergia' ? 'Escreva a alergia.' : 'Escreva a condição.');
      return;
    }
    setSalvando(true);
    setErroForm('');
    try {
      await informarItem({
        tipo: form.tipo,
        descricao: form.descricao.trim(),
        desde: form.tipo === 'condicao' ? form.desde : undefined,
        dependenteId,
      });
      setFormAberto(false);
      await recarregarProntuario();
    } catch (err) {
      setErroForm(mensagemDaAcao(err, 'Não foi possível salvar. Tente de novo.'));
    } finally {
      setSalvando(false);
    }
  };

  const apagar = async () => {
    setErroAcao('');
    try {
      await apagarItemInformado(aApagar.tipo, aApagar.id);
      await recarregarProntuario();
    } catch (err) {
      setErroAcao(mensagemDaAcao(err, 'Não foi possível apagar.'));
    } finally {
      setAApagar(null);
    }
  };

  return (
    <div className="screen-container tela-rolagem">
      {/* Cabeçalho e seletor de pessoa ficam parados; só o conteúdo rola. */}
      <div className="tela-topo">
        <button onClick={() => voltar()} className="back-btn">
          <ChevronLeft size={20} /> Voltar
        </button>

        <div className="section-header">
          <div>
            <h2 className="header-title">Prontuário</h2>
            <p className="header-subtitle">{pessoa.nome}</p>
          </div>
          <BotaoPrivacidade rotulo="prontuário" />
        </div>

        <SeletorPessoa />
      </div>

      <div className="tela-lista">
      {carregando && <p className="empty-state">Carregando prontuário…</p>}
      {erro && !carregando && (
        <EstadoErro erro={erro} oQue="o prontuário" onTentarDeNovo={() => setTentativa((t) => t + 1)} />
      )}

      {!carregando && !erro && (
        <>
          <h3 className="section-title">Visão Geral</h3>
          <div className="quick-actions-grid mb-6">
            <div className="card card-sm border-red" style={{ marginBottom: 0 }}>
              <div className="flex items-center gap-4 text-red mb-2">
                <AlertCircle size={18} />
                <span className="font-bold text-sm">Alergias</span>
              </div>
              {alergias.length === 0 ? (
                <p className="text-sm text-muted">Nenhuma registrada</p>
              ) : (
                alergias.map((a) => (
                  <ItemProntuario key={a.id} item={a} tipo="alergia" oculto={oculto} aoApagar={setAApagar} />
                ))
              )}
            </div>

            <div className="card card-sm border-blue" style={{ marginBottom: 0 }}>
              <div className="flex items-center gap-4 text-blue mb-2">
                <Heart size={18} />
                <span className="font-bold text-sm">Condições</span>
              </div>
              {condicoes.length === 0 ? (
                <p className="text-sm text-muted">Nenhuma registrada</p>
              ) : (
                condicoes.map((c) => (
                  <ItemProntuario key={c.id} item={c} tipo="condicao" oculto={oculto} aoApagar={setAApagar} />
                ))
              )}
            </div>
          </div>

          {/* O paciente conhece a própria alergia antes de qualquer consulta:
              sem isto, ela só chegava ao app (e à ficha de emergência) quando
              um médico com código de acesso a registrasse. */}
          <button type="button" className="btn-secondary prontuario-informar" onClick={abrirFormulario}>
            <Plus size={16} /> Informar alergia ou condição
          </button>
          {erroAcao && <p className="form-erro">{erroAcao}</p>}

          {medicacoes.length > 0 && (
            <>
              <h3 className="section-title">Medicações em uso</h3>
              <div className="card">
                {medicacoes.map((m) => (
                  <div key={m.id} className="medicacao-item">
                    <div className="icon-box icon-box-gray"><Pill size={18} /></div>
                    <div>
                      <p className={`font-bold ${oculto ? 'valor-oculto' : ''}`}>
                        {oculto ? mascararTexto(m.nome) : `${m.nome} ${m.dosagem}`}
                      </p>
                      <p className={`text-xs text-muted ${oculto ? 'valor-oculto' : ''}`}>
                        {oculto ? mascararTexto(m.posologia) : m.posologia}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <h3 className="section-title">Histórico</h3>
          {eventos.length === 0 ? (
            <p className="empty-state">Nenhum registro no prontuário ainda.</p>
          ) : (
            <div className="timeline-container">
              {eventos.map((evento) => {
                const Icone = ICONES[evento.tipo] || Stethoscope;
                return (
                  <div key={evento.id} className="timeline-item">
                    <div className={`timeline-dot ${evento.tipo}`}>
                      <Icone size={10} />
                    </div>

                    <div className="timeline-head">
                      <h4 className={`font-bold ${oculto ? 'valor-oculto' : ''}`}>
                        {oculto ? mascararTexto(evento.titulo) : evento.titulo}
                      </h4>
                      <span className="text-xs text-muted flex items-center">
                        <Clock size={12} style={{ marginRight: '4px' }} /> {evento.dataFormatada}
                      </span>
                    </div>
                    <p className="text-xs text-muted">{evento.subtitulo}</p>

                    {evento.descricao && (
                      <button className="record-card" onClick={() => navigate(evento.rota)}>
                        {oculto ? (
                          <span className="valor-oculto">{mascararTexto(evento.descricao)}</span>
                        ) : (
                          <span className={evento.alerta ? 'text-red font-bold' : ''}>{evento.descricao}</span>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      </div>

      <Modal
        open={formAberto}
        title={form.tipo === 'alergia' ? 'Informar alergia' : 'Informar condição'}
        onClose={() => !salvando && setFormAberto(false)}
      >
        <form onSubmit={salvar}>
          <div className="input-group">
            <label className="input-label" htmlFor="item-tipo">O que informar</label>
            <select
              id="item-tipo"
              className="input-field"
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            >
              <option value="alergia">Alergia</option>
              <option value="condicao">Condição de saúde (ex.: asma, diabetes)</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="item-descricao">
              {form.tipo === 'alergia' ? 'A que você tem alergia?' : 'Qual condição?'}
            </label>
            <input
              id="item-descricao"
              className="input-field"
              maxLength={TAMANHO_DESCRICAO}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder={form.tipo === 'alergia' ? 'Ex.: dipirona, camarão, látex' : 'Ex.: hipertensão'}
            />
          </div>

          {form.tipo === 'condicao' && (
            <div className="input-group">
              <label className="input-label" htmlFor="item-desde">Desde quando (opcional)</label>
              <input
                id="item-desde"
                type="date"
                className="input-field"
                max={new Date().toISOString().slice(0, 10)}
                value={form.desde}
                onChange={(e) => setForm({ ...form, desde: e.target.value })}
              />
            </div>
          )}

          {/* A mesma regra da consulta anotada: o que o paciente escreve é
              declaração, e a tela diz isso antes de ele salvar. */}
          <p className="text-xs text-muted mb-4">
            Fica marcado como "informado por você" no prontuário, na ficha de emergência e para o
            médico. Quem confirma o diagnóstico é o profissional de saúde.
          </p>

          {erroForm && <p className="form-erro">{erroForm}</p>}
          <button type="submit" className="btn-primary" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </Modal>

      <ConfirmarExclusao
        aberto={aApagar !== null}
        titulo={aApagar?.tipo === 'condicao' ? 'Apagar condição' : 'Apagar alergia'}
        mensagem={`Deseja apagar "${aApagar?.descricao ?? ''}" do prontuário?`}
        aviso={aApagar?.tipo === 'alergia' ? 'Ela deixa de aparecer na ficha de emergência.' : null}
        onConfirmar={apagar}
        onCancelar={() => setAApagar(null)}
      />
    </div>
  );
}
