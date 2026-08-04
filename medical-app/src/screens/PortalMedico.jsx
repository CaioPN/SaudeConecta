import React, { useEffect, useState } from 'react';
import {
  Stethoscope, ShieldCheck, Clock, LogOut, AlertCircle, Heart, Pill,
  Droplet, Plus, Trash2, Check,
} from 'lucide-react';
import {
  entrarComCodigo, buscarPacienteDoAcesso, registrarConsulta, registrarExame,
} from '../services/medico';

const ITEM_VAZIO = { nome: '', valor: '', unidade: '', refMin: '', refMax: '' };

/** Minutos e segundos restantes até `iso`; null quando já passou. */
function tempoRestante(iso, agora) {
  const ms = new Date(iso) - agora;
  if (ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function calcularIdade(dataIso) {
  if (!dataIso) return null;
  const nasc = new Date(`${dataIso}T00:00:00`);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

/** Formulário de entrada: o médico digita o código que o paciente mostrou. */
function FormularioEntrada({ onEntrar }) {
  const [form, setForm] = useState({ codigo: '', nome: '', crm: '', especialidade: '' });
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const alterar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const sessao = await entrarComCodigo(form);
      onEntrar(sessao);
    } catch (err) {
      setErro(err.response?.data?.erro || 'Não foi possível validar o código.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="card" onSubmit={enviar}>
      <div className="input-group">
        <label className="input-label">Código do paciente</label>
        <input
          className="input-field codigo-input"
          value={form.codigo}
          onChange={alterar('codigo')}
          placeholder="XXXX-XXXX"
          maxLength={9}
          required
        />
      </div>
      <div className="input-group">
        <label className="input-label">Seu nome</label>
        <input className="input-field" value={form.nome} onChange={alterar('nome')} required />
      </div>
      <div className="input-group">
        <label className="input-label">CRM</label>
        <input className="input-field" value={form.crm} onChange={alterar('crm')} placeholder="123456-SP" required />
      </div>
      <div className="input-group">
        <label className="input-label">Especialidade</label>
        <input className="input-field" value={form.especialidade} onChange={alterar('especialidade')} />
      </div>

      {erro && <p className="form-erro">{erro}</p>}

      <button className="btn-primary" type="submit" disabled={enviando}>
        {enviando ? 'Validando…' : 'Acessar prontuário'}
      </button>
    </form>
  );
}

/** Formulário de registro do atendimento. */
function FormularioConsulta({ token, onPronto }) {
  const [form, setForm] = useState({ motivo: '', local: '', resumo: '', conduta: '' });
  const [estado, setEstado] = useState(null); // 'enviando' | 'ok' | mensagem de erro

  const alterar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setEstado('enviando');
    try {
      await registrarConsulta(token, form);
      setEstado('ok');
      setForm({ motivo: '', local: '', resumo: '', conduta: '' });
      onPronto?.();
    } catch (err) {
      setEstado(err.response?.data?.erro || 'Não foi possível registrar a consulta.');
    }
  };

  return (
    <form className="card" onSubmit={enviar}>
      <div className="input-group">
        <label className="input-label">Motivo do atendimento</label>
        <input className="input-field" value={form.motivo} onChange={alterar('motivo')} required />
      </div>
      <div className="input-group">
        <label className="input-label">Local</label>
        <input className="input-field" value={form.local} onChange={alterar('local')} required />
      </div>
      <div className="input-group">
        <label className="input-label">Resumo</label>
        <textarea className="input-field" rows={3} value={form.resumo} onChange={alterar('resumo')} />
      </div>
      <div className="input-group">
        <label className="input-label">Conduta</label>
        <textarea className="input-field" rows={2} value={form.conduta} onChange={alterar('conduta')} />
      </div>

      {estado === 'ok' && <p className="form-ok"><Check size={14} /> Consulta registrada no prontuário.</p>}
      {estado && estado !== 'ok' && estado !== 'enviando' && <p className="form-erro">{estado}</p>}

      <button className="btn-primary" type="submit" disabled={estado === 'enviando'}>
        {estado === 'enviando' ? 'Registrando…' : 'Registrar consulta'}
      </button>
    </form>
  );
}

/** Formulário de coleta de sangue, com uma linha por resultado. */
function FormularioExame({ token }) {
  const [local, setLocal] = useState('');
  const [itens, setItens] = useState([{ ...ITEM_VAZIO }]);
  const [estado, setEstado] = useState(null);

  const alterarItem = (i, campo) => (e) => {
    const copia = itens.slice();
    copia[i] = { ...copia[i], [campo]: e.target.value };
    setItens(copia);
  };

  const adicionar = () => setItens([...itens, { ...ITEM_VAZIO }]);
  const remover = (i) => setItens(itens.filter((_, idx) => idx !== i));

  const enviar = async (e) => {
    e.preventDefault();
    setEstado('enviando');
    try {
      await registrarExame(token, {
        tipo: 'sangue',
        local,
        itens: itens.map((it) => ({
          nome: it.nome,
          valor: Number(it.valor),
          unidade: it.unidade,
          refMin: Number(it.refMin),
          refMax: Number(it.refMax),
        })),
      });
      setEstado('ok');
      setLocal('');
      setItens([{ ...ITEM_VAZIO }]);
    } catch (err) {
      setEstado(err.response?.data?.erro || 'Não foi possível registrar o exame.');
    }
  };

  return (
    <form className="card" onSubmit={enviar}>
      <div className="input-group">
        <label className="input-label">Laboratório</label>
        <input className="input-field" value={local} onChange={(e) => setLocal(e.target.value)} required />
      </div>

      {itens.map((item, i) => (
        <div key={i} className="item-exame-form">
          <div className="item-exame-linha">
            <input
              className="input-field"
              placeholder="Exame (ex.: Hemoglobina)"
              value={item.nome}
              onChange={alterarItem(i, 'nome')}
              required
            />
            {itens.length > 1 && (
              <button type="button" className="item-remover" onClick={() => remover(i)}>
                <Trash2 size={16} />
              </button>
            )}
          </div>
          <div className="item-exame-linha">
            <input className="input-field" type="number" step="any" placeholder="Valor"
              value={item.valor} onChange={alterarItem(i, 'valor')} required />
            <input className="input-field" placeholder="Unidade"
              value={item.unidade} onChange={alterarItem(i, 'unidade')} />
          </div>
          <div className="item-exame-linha">
            <input className="input-field" type="number" step="any" placeholder="Ref. mín."
              value={item.refMin} onChange={alterarItem(i, 'refMin')} required />
            <input className="input-field" type="number" step="any" placeholder="Ref. máx."
              value={item.refMax} onChange={alterarItem(i, 'refMax')} required />
          </div>
        </div>
      ))}

      <button type="button" className="btn-secondary" onClick={adicionar}>
        <Plus size={16} /> Adicionar resultado
      </button>

      {estado === 'ok' && <p className="form-ok"><Check size={14} /> Exame registrado no prontuário.</p>}
      {estado && estado !== 'ok' && estado !== 'enviando' && <p className="form-erro">{estado}</p>}

      <button className="btn-primary" type="submit" disabled={estado === 'enviando'}>
        {estado === 'enviando' ? 'Registrando…' : 'Registrar coleta'}
      </button>
    </form>
  );
}

export default function PortalMedico() {
  // A sessão do médico vive só em memória: recarregar a página exige um novo
  // código, que é o comportamento esperado de um acesso temporário.
  const [sessao, setSessao] = useState(null);
  const [dados, setDados] = useState(null);
  const [aba, setAba] = useState('consulta');
  const [agora, setAgora] = useState(new Date());
  const [expirado, setExpirado] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const carregarPaciente = (token) => {
    buscarPacienteDoAcesso(token)
      .then(setDados)
      .catch(() => setExpirado(true));
  };

  const entrar = (novaSessao) => {
    setSessao(novaSessao);
    setExpirado(false);
    carregarPaciente(novaSessao.token);
  };

  const sair = () => {
    setSessao(null);
    setDados(null);
    setExpirado(false);
  };

  const restante = sessao ? tempoRestante(sessao.expira_em, agora) : null;

  return (
    <div className="screen-container portal-medico">
      <header className="portal-header">
        <div className="icon-box"><Stethoscope size={22} /></div>
        <div>
          <h2 className="header-title">Portal do Médico</h2>
          <p className="text-sm text-muted">Saúde Conecta · acesso autorizado pelo paciente</p>
        </div>
      </header>

      {!sessao && (
        <>
          <p className="text-sm text-muted mb-6">
            Peça ao paciente o código gerado no aplicativo dele e informe seus
            dados profissionais para abrir o prontuário.
          </p>
          <FormularioEntrada onEntrar={entrar} />
        </>
      )}

      {sessao && (expirado || !restante) && (
        <div className="card">
          <p className="empty-state">Este acesso terminou (expirou ou foi revogado pelo paciente).</p>
          <button className="btn-primary" onClick={sair}>Entrar com outro código</button>
        </div>
      )}

      {sessao && !expirado && restante && (
        <>
          <div className="sessao-barra">
            <span className="sessao-timer"><Clock size={14} /> Acesso expira em {restante}</span>
            <button className="sessao-sair" onClick={sair}><LogOut size={14} /> Encerrar</button>
          </div>

          <div className="card">
            <h3 className="font-bold text-lg">{sessao.paciente.nome}</h3>
            <p className="text-sm text-muted">
              {calcularIdade(sessao.paciente.data_nascimento)} anos · {sessao.paciente.genero} ·
              {' '}Tipo sanguíneo <strong>{sessao.paciente.tipo_sanguineo}</strong>
            </p>
          </div>

          {dados && (
            <>
              <div className="quick-actions-grid mb-6">
                <div className="card card-sm border-red" style={{ marginBottom: 0 }}>
                  <div className="flex items-center gap-4 text-red mb-2">
                    <AlertCircle size={18} /><span className="font-bold text-sm">Alergias</span>
                  </div>
                  {dados.alergias.length === 0
                    ? <p className="text-sm text-muted">Nenhuma</p>
                    : dados.alergias.map((a) => <p key={a} className="font-bold">{a}</p>)}
                </div>
                <div className="card card-sm border-blue" style={{ marginBottom: 0 }}>
                  <div className="flex items-center gap-4 text-blue mb-2">
                    <Heart size={18} /><span className="font-bold text-sm">Condições</span>
                  </div>
                  {dados.condicoes.length === 0
                    ? <p className="text-sm text-muted">Nenhuma</p>
                    : dados.condicoes.map((c) => <p key={c} className="font-bold">{c}</p>)}
                </div>
              </div>

              {dados.medicacoes.length > 0 && (
                <div className="card">
                  <h3 className="section-title">Medicações em uso</h3>
                  {dados.medicacoes.map((m) => (
                    <div key={m} className="medicacao-item">
                      <div className="icon-box icon-box-gray"><Pill size={18} /></div>
                      <p className="text-sm font-bold">{m}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {sessao.escopo === 'escrita' ? (
            <>
              <div className="tabs-wrapper">
                <button className={`tab-btn ${aba === 'consulta' ? 'active' : ''}`} onClick={() => setAba('consulta')}>
                  <Stethoscope size={18} /><span>Consulta</span>
                </button>
                <button className={`tab-btn ${aba === 'exame' ? 'active' : ''}`} onClick={() => setAba('exame')}>
                  <Droplet size={18} /><span>Exame</span>
                </button>
              </div>
              {aba === 'consulta'
                ? <FormularioConsulta token={sessao.token} />
                : <FormularioExame token={sessao.token} />}
            </>
          ) : (
            <p className="acesso-nota">
              <ShieldCheck size={14} /> Este acesso é somente leitura — o paciente
              não autorizou o registro de novos dados.
            </p>
          )}
        </>
      )}
    </div>
  );
}
