import React, { useEffect, useState } from 'react';
import {
  Stethoscope, ShieldCheck, Clock, LogOut, AlertCircle, Heart, Pill,
  Droplet, Plus, Trash2, Check, FileText, PhoneCall, Image as ImageIcon,
} from 'lucide-react';
import {
  entrarComCodigo, buscarPacienteDoAcesso, registrarConsulta, registrarExame,
  registrarItemProntuario, removerItemProntuario,
} from '../services/medico';

const ITEM_VAZIO = { nome: '', valor: '', unidade: '', refMin: '', refMax: '' };

/**
 * Data de hoje como "AAAA-MM-DD", que é o formato do <input type="date"> e o
 * que o backend espera.
 *
 * Feito na mão, e não com toISOString(): aquele converte para UTC, e no fuso
 * do Brasil isso vira o dia seguinte durante a noite — o exame registrado às
 * 22h apareceria com a data de amanhã.
 */
function hojeIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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
  const [tipo, setTipo] = useState('sangue');
  const [data, setData] = useState(hojeIso);
  const [local, setLocal] = useState('');
  const [nome, setNome] = useState('');
  const [laudo, setLaudo] = useState('');
  const [itens, setItens] = useState([{ ...ITEM_VAZIO }]);
  const [estado, setEstado] = useState(null);

  const alterarItem = (i, campo) => (e) => {
    const copia = itens.slice();
    copia[i] = { ...copia[i], [campo]: e.target.value };
    setItens(copia);
  };

  const adicionar = () => setItens([...itens, { ...ITEM_VAZIO }]);
  const remover = (i) => setItens(itens.filter((_, idx) => idx !== i));

  const limpar = () => {
    setData(hojeIso());
    setLocal('');
    setNome('');
    setLaudo('');
    setItens([{ ...ITEM_VAZIO }]);
  };

  const enviar = async (e) => {
    e.preventDefault();
    setEstado('enviando');
    try {
      // O corpo muda com o tipo: a coleta de sangue leva os resultados, o exame
      // de imagem leva o nome e o laudo. Mandar os dois confundiria o backend,
      // que decide o que validar pelo campo "tipo".
      await registrarExame(token, tipo === 'imagem'
        ? { tipo: 'imagem', data, local, nome, laudo }
        : {
            tipo: 'sangue',
            data,
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
      limpar();
    } catch (err) {
      setEstado(err.response?.data?.erro || 'Não foi possível registrar o exame.');
    }
  };

  return (
    <form className="card" onSubmit={enviar}>
      {/* Sangue e imagem são registros diferentes: um tem resultados com faixa
          de referência, o outro tem laudo. O backend já aceitava os dois — o
          que faltava era a tela, e por isso só dava para lançar sangue. */}
      <div className="tabs-wrapper">
        <button
          type="button"
          className={`tab-btn ${tipo === 'sangue' ? 'active' : ''}`}
          onClick={() => { setTipo('sangue'); setEstado(null); }}
        >
          <Droplet size={18} /><span>Sangue</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${tipo === 'imagem' ? 'active' : ''}`}
          onClick={() => { setTipo('imagem'); setEstado(null); }}
        >
          <ImageIcon size={18} /><span>Imagem</span>
        </button>
      </div>

      {/* Data da COLETA, não do registro. Sem este campo tudo entrava como
          "hoje", e um exame trazido pelo paciente ficava com a data errada na
          linha do tempo do prontuário. O max impede data no futuro. */}
      <div className="input-group">
        <label className="input-label">
          {tipo === 'imagem' ? 'Data do exame' : 'Data da coleta'}
        </label>
        <input
          className="input-field"
          type="date"
          value={data}
          max={hojeIso()}
          onChange={(e) => setData(e.target.value)}
          required
        />
      </div>

      <div className="input-group">
        <label className="input-label">
          {tipo === 'imagem' ? 'Clínica ou setor de imagem' : 'Laboratório'}
        </label>
        <input className="input-field" value={local} onChange={(e) => setLocal(e.target.value)} required />
      </div>

      {tipo === 'imagem' && (
        <>
          <div className="input-group">
            <label className="input-label">Exame</label>
            <input
              className="input-field"
              placeholder="Ex.: Raio-X de tórax"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label">Laudo</label>
            <textarea
              className="input-field"
              rows={4}
              placeholder="Achados e conclusão"
              value={laudo}
              onChange={(e) => setLaudo(e.target.value)}
            />
          </div>
        </>
      )}

      {tipo === 'sangue' && itens.map((item, i) => (
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

      {tipo === 'sangue' && (
        <button type="button" className="btn-secondary" onClick={adicionar}>
          <Plus size={16} /> Adicionar resultado
        </button>
      )}

      {estado === 'ok' && <p className="form-ok"><Check size={14} /> Exame registrado no prontuário.</p>}
      {estado && estado !== 'ok' && estado !== 'enviando' && <p className="form-erro">{estado}</p>}

      <button className="btn-primary" type="submit" disabled={estado === 'enviando'}>
        {estado === 'enviando'
          ? 'Registrando…'
          : tipo === 'imagem' ? 'Registrar exame' : 'Registrar coleta'}
      </button>
    </form>
  );
}

/**
 * Formulário do prontuário: alergia, condição acompanhada ou medicação em uso.
 *
 * É a parte que faltava para o portal cobrir o prontuário inteiro — até aqui o
 * médico registrava consulta e exame, mas uma alergia descoberta no
 * atendimento não tinha onde ser anotada.
 *
 * Não existe edição, só incluir e remover: corrigir é remover o registro
 * errado e lançar o certo, e as duas ações ficam separadas no histórico que o
 * paciente vê. Um "editar" apagaria o que estava escrito antes sem rastro.
 */
function FormularioProntuario({ token, dados, onMudou }) {
  const [tipo, setTipo] = useState('alergia');
  const [form, setForm] = useState({
    descricao: '', nome: '', dosagem: '', frequencia: '', desde: '',
  });
  const [estado, setEstado] = useState(null); // 'enviando' | 'ok' | mensagem de erro

  const alterar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setEstado('enviando');
    try {
      const corpo = tipo === 'medicacao'
        ? { tipo, nome: form.nome, dosagem: form.dosagem, frequencia: form.frequencia, desde: form.desde }
        : { tipo, descricao: form.descricao, desde: form.desde };
      await registrarItemProntuario(token, corpo);
      setEstado('ok');
      setForm({ descricao: '', nome: '', dosagem: '', frequencia: '', desde: '' });
      onMudou?.();
    } catch (err) {
      setEstado(err.response?.data?.erro || 'Não foi possível registrar o item.');
    }
  };

  const remover = async (qualTipo, id) => {
    try {
      await removerItemProntuario(token, qualTipo, id);
      onMudou?.();
    } catch (err) {
      setEstado(err.response?.data?.erro || 'Não foi possível remover o item.');
    }
  };

  // As três listas já vêm do backend com id, justamente para dar para remover.
  const secoes = [
    { chave: 'alergia', titulo: 'Alergias', itens: dados?.alergias || [] },
    { chave: 'condicao', titulo: 'Condições', itens: dados?.condicoes || [] },
    { chave: 'medicacao', titulo: 'Medicações', itens: dados?.medicacoes || [] },
  ];

  return (
    <>
      <form className="card" onSubmit={enviar}>
        <div className="input-group">
          <label className="input-label">O que registrar</label>
          <select className="input-field" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="alergia">Alergia</option>
            <option value="condicao">Condição acompanhada</option>
            <option value="medicacao">Medicação em uso</option>
          </select>
        </div>

        {tipo === 'medicacao' ? (
          <>
            <div className="input-group">
              <label className="input-label">Medicamento</label>
              <input className="input-field" value={form.nome} onChange={alterar('nome')} required />
            </div>
            <div className="input-group">
              <label className="input-label">Dosagem</label>
              <input
                className="input-field"
                placeholder="50mg"
                value={form.dosagem}
                onChange={alterar('dosagem')}
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">Frequência</label>
              <input
                className="input-field"
                placeholder="1 comprimido pela manhã"
                value={form.frequencia}
                onChange={alterar('frequencia')}
                required
              />
            </div>
          </>
        ) : (
          <div className="input-group">
            <label className="input-label">
              {tipo === 'alergia' ? 'Alergia' : 'Condição'}
            </label>
            <input
              className="input-field"
              placeholder={tipo === 'alergia' ? 'Dipirona' : 'Hipertensão'}
              value={form.descricao}
              onChange={alterar('descricao')}
              required
            />
          </div>
        )}

        <div className="input-group">
          <label className="input-label">Desde (opcional)</label>
          <input type="date" className="input-field" value={form.desde} onChange={alterar('desde')} />
        </div>

        {estado === 'ok' && <p className="form-ok"><Check size={14} /> Registrado no prontuário.</p>}
        {estado && estado !== 'ok' && estado !== 'enviando' && <p className="form-erro">{estado}</p>}

        <button className="btn-primary" type="submit" disabled={estado === 'enviando'}>
          {estado === 'enviando' ? 'Registrando…' : 'Adicionar ao prontuário'}
        </button>
      </form>

      {secoes.map((secao) => (
        <div className="card" key={secao.chave}>
          <h3 className="section-title">{secao.titulo}</h3>
          {secao.itens.length === 0 ? (
            <p className="text-sm text-muted">Nada registrado.</p>
          ) : (
            secao.itens.map((item) => (
              <div key={item.id} className="prontuario-item">
                <p className="text-sm">{item.texto}</p>
                <button
                  type="button"
                  className="item-remover"
                  onClick={() => remover(secao.chave, item.id)}
                  title="Remover do prontuário"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      ))}
    </>
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
            {/* Código gerado para um dependente: o médico precisa saber que
                está diante do prontuário da criança, e quem responde por ela. */}
            {sessao.titular && (
              <p className="text-xs text-muted" style={{ marginTop: '6px' }}>
                Dependente · responsável: <strong>{sessao.titular}</strong>
              </p>
            )}
          </div>

          {/* Contatos de emergência: só chegam aqui quando o paciente marcou
              essa opção ao gerar o código. Sem isso a lista vem vazia. */}
          {dados?.contatos?.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-4 mb-2">
                <PhoneCall size={18} />
                <span className="font-bold text-sm">Contatos de emergência</span>
              </div>
              {dados.contatos.map((c) => (
                <p key={`${c.nome}-${c.telefone}`} className="text-sm">
                  <strong>{c.nome}</strong> ({c.parentesco}) · {c.telefone}
                </p>
              ))}
            </div>
          )}

          {dados && (
            <>
              <div className="quick-actions-grid mb-6">
                <div className="card card-sm border-red" style={{ marginBottom: 0 }}>
                  <div className="flex items-center gap-4 text-red mb-2">
                    <AlertCircle size={18} /><span className="font-bold text-sm">Alergias</span>
                  </div>
                  {dados.alergias.length === 0
                    ? <p className="text-sm text-muted">Nenhuma</p>
                    : dados.alergias.map((a) => <p key={a.id} className="font-bold">{a.texto}</p>)}
                </div>
                <div className="card card-sm border-blue" style={{ marginBottom: 0 }}>
                  <div className="flex items-center gap-4 text-blue mb-2">
                    <Heart size={18} /><span className="font-bold text-sm">Condições</span>
                  </div>
                  {dados.condicoes.length === 0
                    ? <p className="text-sm text-muted">Nenhuma</p>
                    : dados.condicoes.map((c) => <p key={c.id} className="font-bold">{c.texto}</p>)}
                </div>
              </div>

              {dados.medicacoes.length > 0 && (
                <div className="card">
                  <h3 className="section-title">Medicações em uso</h3>
                  {dados.medicacoes.map((m) => (
                    <div key={m.id} className="medicacao-item">
                      <div className="icon-box icon-box-gray"><Pill size={18} /></div>
                      <p className="text-sm font-bold">{m.texto}</p>
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
                <button className={`tab-btn ${aba === 'prontuario' ? 'active' : ''}`} onClick={() => setAba('prontuario')}>
                  <FileText size={18} /><span>Prontuário</span>
                </button>
              </div>
              {aba === 'consulta' && <FormularioConsulta token={sessao.token} />}
              {aba === 'exame' && <FormularioExame token={sessao.token} />}
              {aba === 'prontuario' && (
                <FormularioProntuario
                  token={sessao.token}
                  dados={dados}
                  // Recarrega o resumo depois de incluir ou remover: as listas
                  // logo acima e as da aba são a mesma informação, e mostrar
                  // versões diferentes das duas confundiria o médico.
                  onMudou={() => carregarPaciente(sessao.token)}
                />
              )}
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
