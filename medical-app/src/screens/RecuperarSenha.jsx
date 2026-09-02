import React, { useState } from 'react';
import { ChevronLeft, ShieldCheck, Check, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { conferirIdentidade, redefinirSenha } from '../services/senha';

// A tela tem dois passos: confirmar quem é e escolher a senha nova. Os dois
// moram no mesmo componente porque o token que liga um ao outro é curto (15
// minutos) e não é gravado em lugar nenhum — sair da tela cancela o pedido.
const PASSO_IDENTIDADE = 'identidade';
const PASSO_SENHA = 'senha';
const PASSO_PRONTO = 'pronto';

export default function RecuperarSenha() {
  const navigate = useNavigate();
  const [passo, setPasso] = useState(PASSO_IDENTIDADE);
  const [form, setForm] = useState({ email: '', cpf: '', dataNascimento: '' });
  const [senha, setSenha] = useState('');
  const [repetir, setRepetir] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [sessao, setSessao] = useState(null); // { token, nome, validade_minutos }
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const alterar = (campo) => (e) => {
    setForm({ ...form, [campo]: e.target.value });
    if (erro) setErro('');
  };

  const confirmarIdentidade = async (e) => {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const dados = await conferirIdentidade({
        email: form.email.trim(),
        cpf: form.cpf.replace(/\D/g, ''),
        dataNascimento: form.dataNascimento,
      });
      setSessao(dados);
      setPasso(PASSO_SENHA);
    } catch (err) {
      setErro(err?.response?.data?.erro || 'Não foi possível conferir os dados.');
    } finally {
      setEnviando(false);
    }
  };

  const gravarSenha = async (e) => {
    e.preventDefault();
    if (senha !== repetir) {
      setErro('As duas senhas não são iguais.');
      return;
    }
    setErro('');
    setEnviando(true);
    try {
      await redefinirSenha({ token: sessao.token, senha });
      setPasso(PASSO_PRONTO);
    } catch (err) {
      setErro(err?.response?.data?.erro || 'Não foi possível redefinir a senha.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="screen-container">
      <button onClick={() => navigate('/')} className="back-btn">
        <ChevronLeft size={20} /> Voltar para o login
      </button>

      <h2 className="header-title mb-2">Recuperar senha</h2>

      {passo === PASSO_IDENTIDADE && (
        <>
          <p className="text-sm text-muted mb-6">
            Confirme três dados do seu cadastro para provar que a conta é sua.
          </p>

          <form className="card" onSubmit={confirmarIdentidade}>
            <div className="input-group">
              <label className="input-label">E-mail do cadastro</label>
              <input
                type="email"
                className="input-field"
                placeholder="exemplo@email.com"
                value={form.email}
                onChange={alterar('email')}
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">CPF</label>
              <input
                type="text"
                className="input-field"
                placeholder="11 dígitos"
                maxLength={14}
                value={form.cpf}
                onChange={alterar('cpf')}
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">Data de nascimento</label>
              <input
                type="date"
                className="input-field"
                value={form.dataNascimento}
                onChange={alterar('dataNascimento')}
                required
              />
            </div>

            {erro && <p className="form-erro">{erro}</p>}

            <button className="btn-primary" type="submit" disabled={enviando}>
              {enviando ? 'Conferindo…' : 'Continuar'}
            </button>
          </form>

          <p className="acesso-nota">
            <ShieldCheck size={14} /> A resposta não diz qual campo errou, e nem se
            o e-mail tem conta — seria um jeito de descobrir quem usa o app.
          </p>
        </>
      )}

      {passo === PASSO_SENHA && (
        <>
          <p className="text-sm text-muted mb-6">
            Tudo certo, {sessao.nome}. Escolha a nova senha — este pedido vale por{' '}
            {sessao.validade_minutos} minutos.
          </p>

          <form className="card" onSubmit={gravarSenha}>
            <div className="input-group">
              <label className="input-label">Nova senha</label>
              <div className="password-input-wrapper">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  className="input-field"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => { setSenha(e.target.value); if (erro) setErro(''); }}
                  style={{ paddingRight: '44px' }}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                >
                  {mostrarSenha ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Repita a nova senha</label>
              <input
                type={mostrarSenha ? 'text' : 'password'}
                className="input-field"
                placeholder="••••••••"
                value={repetir}
                onChange={(e) => { setRepetir(e.target.value); if (erro) setErro(''); }}
                required
              />
            </div>

            <p className="text-xs text-muted mb-4">
              Ao menos 8 caracteres, com maiúscula, minúscula, número e caractere
              especial.
            </p>

            {erro && <p className="form-erro">{erro}</p>}

            <button className="btn-primary" type="submit" disabled={enviando}>
              {enviando ? 'Salvando…' : 'Salvar nova senha'}
            </button>
          </form>
        </>
      )}

      {passo === PASSO_PRONTO && (
        <div className="card">
          <p className="form-ok"><Check size={14} /> Senha alterada.</p>
          <p className="text-sm text-muted mb-6">
            A troca ficou registrada no seu histórico de acessos. Se não foi você,
            refaça a recuperação agora mesmo.
          </p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            Entrar com a nova senha
          </button>
        </div>
      )}
    </div>
  );
}
