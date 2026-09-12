import React, { useEffect, useState } from 'react';
import {
  User, ChevronLeft, Mail, Phone, IdCard, Calendar, Droplet, Venus, MapPin,
  HeartHandshake, Trash2, Plus, Pencil, Contrast, Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePrivacidade } from '../context/PrivacidadeContext';
import { useAcessibilidade, TAMANHOS } from '../context/AcessibilidadeContext';
import BotaoPrivacidade from '../components/BotaoPrivacidade';
import { mascarar } from '../utils/privacidade';
import { listarFamiliares, cadastrarFamiliar, removerFamiliar } from '../services/familiares';
import { atualizarPerfil } from '../services/perfil';

// Calcula a idade a partir da data de nascimento (formato ISO).
function calcularIdade(dataNascimento) {
  if (!dataNascimento) return null;
  const nasc = new Date(dataNascimento);
  if (Number.isNaN(nasc.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

// Formata um CPF de 11 dígitos como 000.000.000-00.
function formatarCPF(cpf) {
  if (!cpf) return '—';
  const d = String(cpf).replace(/\D/g, '');
  if (d.length !== 11) return cpf;
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Formata um telefone como (00) 00000-0000 ou (00) 0000-0000.
function formatarTelefone(tel) {
  if (!tel) return '—';
  const d = String(tel).replace(/\D/g, '');
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return tel;
}

// Formata uma data ISO (yyyy-mm-dd...) como dd/mm/yyyy, sem desvio de fuso.
function formatarData(data) {
  if (!data) return '—';
  const m = String(data).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return data;
}

// Formata um CEP de 8 dígitos como 00000-000.
function formatarCEP(cep) {
  if (!cep) return '—';
  const d = String(cep).replace(/\D/g, '');
  if (d.length !== 8) return cep;
  return d.replace(/(\d{5})(\d{3})/, '$1-$2');
}

// Monta a linha do endereço com base nos campos disponíveis.
function montarEndereco(p) {
  if (!p) return '';
  const linha = [p.rua, p.numero].filter(Boolean).join(', ');
  const cidadeUf = [p.cidade, p.estado].filter(Boolean).join(' - ');
  return [linha, p.bairro, cidadeUf].filter(Boolean).join(' • ');
}

// Uma linha de "rótulo + valor" com ícone, usada na lista de dados cadastrais.
// Marcada como sensível, ela obedece ao olhinho e mostra a máscara no lugar.
function InfoRow({ icon: Icon, label, value, sensivel = false }) {
  const { oculto } = usePrivacidade();
  const escondido = sensivel && oculto;

  return (
    <div className="info-row">
      <div className="info-icon"><Icon size={18} /></div>
      <div>
        <p className="info-label">{label}</p>
        <p className={`info-value ${escondido ? 'valor-oculto' : ''}`}>
          {escondido ? mascarar(value) : (value || '—')}
        </p>
      </div>
    </div>
  );
}

const CONTATO_VAZIO = { nome: '', parentesco: '', telefone: '' };

/**
 * Contatos de emergência: quem avisar se algo acontecer com o paciente.
 *
 * Ficam no perfil, e não numa tela própria, porque são poucos e raramente
 * mudam — abrir uma rota só para duas ou três linhas seria mais navegação do
 * que informação.
 *
 * De propósito eles NÃO entram no resumo que o médico recebe pelo acesso
 * temporário: o telefone é de outra pessoa, e quem consentiu com o cadastro
 * foi o paciente, não o familiar.
 */
function ContatosEmergencia() {
  const { oculto } = usePrivacidade();
  const [contatos, setContatos] = useState([]);
  const [form, setForm] = useState(CONTATO_VAZIO);
  const [abrindo, setAbrindo] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    listarFamiliares()
      .then((lista) => {
        if (ativo) setContatos(lista);
      })
      .catch(() => {
        if (ativo) setErro('Não foi possível carregar os contatos.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  const alterar = (campo) => (e) => {
    setForm({ ...form, [campo]: e.target.value });
    if (erro) setErro('');
  };

  const adicionar = async (e) => {
    e.preventDefault();
    try {
      const novo = await cadastrarFamiliar(form);
      setContatos((atual) => [...atual, novo]);
      setForm(CONTATO_VAZIO);
      setAbrindo(false);
    } catch (err) {
      setErro(err?.response?.data?.erro || 'Não foi possível cadastrar o contato.');
    }
  };

  const remover = async (id) => {
    try {
      await removerFamiliar(id);
      setContatos((atual) => atual.filter((c) => c.id !== id));
    } catch (err) {
      setErro(err?.response?.data?.erro || 'Não foi possível remover o contato.');
    }
  };

  return (
    <>
      <h3 className="section-title">Contatos de emergência</h3>

      <div className="card">
        {carregando && <p className="text-sm text-muted">Carregando…</p>}

        {!carregando && contatos.length === 0 && !abrindo && (
          <p className="text-sm text-muted">
            Nenhum contato cadastrado. Cadastre quem deve ser avisado em uma
            emergência.
          </p>
        )}

        {contatos.map((c) => (
          <div key={c.id} className="contato-item">
            <div className="icon-box icon-box-gray"><HeartHandshake size={18} /></div>
            <div style={{ flex: 1 }}>
              <p className="font-bold">{c.nome}</p>
              <p className="text-xs text-muted">{c.parentesco}</p>
              {/* O telefone segue o olhinho; o nome e o parentesco ficam, para
                  o paciente saber qual contato está removendo. */}
              <p className={`text-sm ${oculto ? 'valor-oculto' : ''}`}>
                {oculto ? mascarar(c.telefone) : formatarTelefone(c.telefone)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => remover(c.id)}
              className="icon-box icon-box-gray"
              style={{ cursor: 'pointer', border: 'none' }}
              title={`Remover ${c.nome}`}
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}

        {erro && <p className="form-erro">{erro}</p>}

        {abrindo ? (
          <form onSubmit={adicionar} style={{ marginTop: '16px' }}>
            <div className="input-group">
              <label className="input-label">Nome</label>
              <input className="input-field" value={form.nome} onChange={alterar('nome')} required />
            </div>
            <div className="input-group">
              <label className="input-label">Parentesco</label>
              <input
                className="input-field"
                placeholder="Mãe, irmão, vizinha…"
                value={form.parentesco}
                onChange={alterar('parentesco')}
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">Telefone</label>
              <input
                className="input-field"
                placeholder="(11) 90000-0000"
                value={form.telefone}
                onChange={alterar('telefone')}
                required
              />
            </div>
            <button className="btn-primary" type="submit">Salvar contato</button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { setAbrindo(false); setForm(CONTATO_VAZIO); setErro(''); }}
            >
              Cancelar
            </button>
          </form>
        ) : (
          <button type="button" className="btn-secondary" onClick={() => setAbrindo(true)}>
            <Plus size={16} /> Adicionar contato
          </button>
        )}
      </div>
    </>
  );
}

/**
 * Formulário de contato e endereço.
 *
 * Só telefone e endereço são editáveis, e o backend recusa o resto de todo
 * jeito: nome, CPF, nascimento, gênero e tipo sanguíneo identificam a pessoa
 * no atendimento, e o e-mail é a chave do login. Corrigir um telefone digitado
 * errado, por outro lado, é a coisa mais banal do mundo — e até agora exigia
 * criar outra conta.
 */
function EditarContato({ paciente, aoSalvar, aoFechar }) {
  const [form, setForm] = useState({
    telefone: paciente?.telefone || '',
    cep: paciente?.cep || '',
    rua: paciente?.rua || '',
    numero: paciente?.numero || '',
    bairro: paciente?.bairro || '',
    cidade: paciente?.cidade || '',
    estado: paciente?.estado || '',
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const alterar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const enviar = (e) => {
    e.preventDefault();
    setSalvando(true);
    setErro('');
    atualizarPerfil(form)
      .then((novo) => aoSalvar(novo))
      .catch((err) => setErro(err?.response?.data?.erro || 'Não foi possível salvar.'))
      .finally(() => setSalvando(false));
  };

  return (
    <form className="card" onSubmit={enviar}>
      <h3 className="section-title">Editar contato e endereço</h3>
      {erro && <p className="text-sm text-red">{erro}</p>}

      <div className="input-group">
        <label className="input-label">Telefone</label>
        <input className="input-field" value={form.telefone} onChange={alterar('telefone')} required />
      </div>
      <div className="input-group">
        <label className="input-label">CEP</label>
        <input className="input-field" value={form.cep} onChange={alterar('cep')} placeholder="00000-000" />
      </div>
      <div className="input-group">
        <label className="input-label">Rua</label>
        <input className="input-field" value={form.rua} onChange={alterar('rua')} />
      </div>
      <div className="input-group">
        <label className="input-label">Número</label>
        <input className="input-field" value={form.numero} onChange={alterar('numero')} />
      </div>
      <div className="input-group">
        <label className="input-label">Bairro</label>
        <input className="input-field" value={form.bairro} onChange={alterar('bairro')} />
      </div>
      <div className="input-group">
        <label className="input-label">Cidade</label>
        <input className="input-field" value={form.cidade} onChange={alterar('cidade')} />
      </div>
      <div className="input-group">
        <label className="input-label">Estado (UF)</label>
        <input className="input-field" value={form.estado} onChange={alterar('estado')} maxLength={2} />
      </div>

      <button className="btn-primary" type="submit" disabled={salvando}>
        {salvando ? 'Salvando…' : 'Salvar alterações'}
      </button>
      <button type="button" className="btn-secondary" onClick={aoFechar}>Cancelar</button>
    </form>
  );
}

/**
 * Acessibilidade: tamanho do texto e contraste.
 *
 * São dois controles, e não um "modo idoso": quem não enxerga o texto pequeno
 * quer aumentar; quem não distingue o cinza claro do fundo quer escurecer. Um
 * botão só obrigaria a aceitar o que não estava incomodando.
 *
 * O ajuste vale para o app inteiro e fica gravado no aparelho — ao contrário do
 * olhinho, que volta ao normal a cada abertura de propósito.
 */
function Acessibilidade() {
  const { fonte, contraste, definirFonte, alternarContraste } = useAcessibilidade();

  return (
    <>
      <h3 className="section-title">Acessibilidade</h3>
      <div className="card">
        <p className="text-sm text-muted mb-4">Tamanho do texto</p>
        {/* Cada botão é escrito no próprio tamanho: ver o resultado antes de
            escolher vale mais do que a palavra. */}
        <div className="acessibilidade-opcoes">
          {TAMANHOS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`acessibilidade-opcao tamanho-${t.id} ${fonte === t.id ? 'active' : ''}`}
              onClick={() => definirFonte(t.id)}
              aria-pressed={fonte === t.id}
            >
              {t.rotulo}
            </button>
          ))}
        </div>

        <div className="acessibilidade-linha">
          <div>
            <p className="font-bold text-sm">Texto mais escuro</p>
            <p className="text-xs text-muted">
              Escurece as legendas e os textos de apoio, que aparecem em cinza claro.
            </p>
          </div>
          <button
            type="button"
            className={`btn-secondary ${contraste ? 'active' : ''}`}
            style={{ margin: 0, width: 'auto', flexShrink: 0 }}
            onClick={alternarContraste}
            aria-pressed={contraste}
          >
            {contraste ? <Check size={16} /> : <Contrast size={16} />}
            {contraste ? 'Ativado' : 'Ativar'}
          </button>
        </div>

        <p className="text-xs text-muted" style={{ marginTop: '12px' }}>
          O ajuste vale para todas as telas e fica guardado neste aparelho.
        </p>
      </div>
    </>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { paciente, atualizarPaciente } = useAuth();
  const [editando, setEditando] = useState(false);

  const nome = paciente?.nome || 'Paciente';
  const idade = calcularIdade(paciente?.data_nascimento);
  const detalhes = [idade != null ? `${idade} anos` : null, paciente?.id ? `ID: #${paciente.id}` : null]
    .filter(Boolean)
    .join(' • ');
  const endereco = montarEndereco(paciente);

  return (
    <div className="screen-container tela-rolagem">
      {/* Só o "Voltar" fica parado. O cartão do avatar é alto e, fixo, comeria
          metade da área de leitura numa tela de celular. */}
      <div className="tela-topo">
        <button onClick={() => navigate(-1)} className="back-btn">
          <ChevronLeft size={20} /> Voltar
        </button>
      </div>

      <div className="tela-lista">
      <div className="card profile-header">
        <div className="profile-avatar">
          <User size={40} />
        </div>
        <h2 className="header-title" style={{ fontSize: '20px' }}>{nome}</h2>
        <p className="text-sm text-muted">{detalhes || 'Dados do paciente'}</p>
      </div>

      {editando && (
        <EditarContato
          paciente={paciente}
          aoSalvar={(novo) => { atualizarPaciente(novo); setEditando(false); }}
          aoFechar={() => setEditando(false)}
        />
      )}

      <div className="section-header">
        <h3 className="section-title">Dados Cadastrais</h3>
        <div className="flex items-center" style={{ gap: '8px' }}>
          {!editando && (
            <button type="button" className="privacidade-btn" onClick={() => setEditando(true)}>
              <Pencil size={14} /> Editar
            </button>
          )}
          <BotaoPrivacidade rotulo="meus dados" />
        </div>
      </div>
      <div className="card">
        <InfoRow icon={Mail} label="E-mail" value={paciente?.email} sensivel />
        <InfoRow icon={Phone} label="Telefone" value={formatarTelefone(paciente?.telefone)} sensivel />
        <InfoRow icon={IdCard} label="CPF" value={formatarCPF(paciente?.cpf)} sensivel />
        <InfoRow icon={Calendar} label="Data de Nascimento" value={formatarData(paciente?.data_nascimento)} sensivel />
        <InfoRow icon={Venus} label="Gênero" value={paciente?.genero} />
        <InfoRow icon={Droplet} label="Tipo Sanguíneo" value={paciente?.tipo_sanguineo} sensivel />
      </div>

      <h3 className="section-title">Endereço</h3>
      <div className="card">
        <InfoRow icon={MapPin} label="Endereço" value={endereco} sensivel />
        <InfoRow icon={MapPin} label="CEP" value={formatarCEP(paciente?.cep)} sensivel />
      </div>

      <ContatosEmergencia />
      <Acessibilidade />
      </div>
    </div>
  );
}
