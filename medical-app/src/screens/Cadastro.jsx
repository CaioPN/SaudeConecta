import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { TermsContent, PrivacyContent } from '../content/LegalContent';

const TIPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Schema de validação usando Yup
const schema = yup.object().shape({
    nome: yup.string().required('O nome é obrigatório!'),
    email: yup.string()
        .email('Digite um e-mail válido!')
        .required('O e-mail é obrigatório!'),
    cpf: yup.string()
        .matches(/^\d{11}$/, 'O CPF deve ter exatamente 11 dígitos numéricos!')
        .required('O CPF é obrigatório!'),
    telefone: yup.string()
        .matches(/^\d{10,11}$/, 'Informe um telefone válido com DDD (apenas números)!')
        .required('O telefone é obrigatório!'),
    dataNascimento: yup.string().required('A data de nascimento é obrigatória!'),
    genero: yup.string().required('Selecione o gênero!'),
    tipoSanguineo: yup.string().required('Selecione o tipo sanguíneo!'),
    senha: yup.string()
        .min(8, 'A senha deve ter ao menos 8 caracteres!')
        .matches(/[a-z]/, 'A senha deve conter ao menos uma letra minúscula!')
        .matches(/[A-Z]/, 'A senha deve conter ao menos uma letra maiúscula!')
        .matches(/\d/, 'A senha deve conter ao menos um número!')
        .matches(/[^A-Za-z0-9]/, 'A senha deve conter ao menos um caractere especial!')
        .required('A senha é obrigatória!'),
    confirmarSenha: yup.string()
        .oneOf([yup.ref('senha')], 'As senhas não conferem!')
        .required('Confirme a senha!'),
    cep: yup.string().required('O CEP é obrigatório!'),
    rua: yup.string().required('A rua é obrigatória!'),
    numero: yup.string().required('O número é obrigatório!'),
    bairro: yup.string().required('O bairro é obrigatório!'),
    cidade: yup.string().required('A cidade é obrigatória!'),
    estado: yup.string().required('O estado é obrigatório!'),
    aceitarTermos: yup.bool()
        .oneOf([true], 'Você precisa aceitar os Termos de Uso para continuar.'),
    aceitarDados: yup.bool()
        .oneOf([true], 'Você precisa concordar com o uso dos seus dados para continuar.'),
});

export default function Cadastro() {
    const navigate = useNavigate();
    const { cadastrar } = useAuth();
    const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, setFocus } = useForm({
        resolver: yupResolver(schema)
    });

    const [erroApi, setErroApi] = useState('');
    // Controla qual janelinha (modal) está aberta: 'termos', 'dados' ou null.
    const [modalAberto, setModalAberto] = useState(null);

    async function finalizarCadastro(dados) {
        setErroApi('');
        // Os consentimentos não vão para a API — apenas validam o formulário.
        const { confirmarSenha, aceitarTermos, aceitarDados, ...payload } = dados;
        try {
            await cadastrar(payload);
            navigate('/dashboard');
        } catch (err) {
            setErroApi(err?.response?.data?.erro || 'Não foi possível concluir o cadastro.');
        }
    }

    function buscarCep(e) {
        if (!e || !e.target || !e.target.value) return;
        const cep = e.target.value.replace(/\D/g, '');
        if (cep.length === 8) {
            fetch(`https://viacep.com.br/ws/${cep}/json/`)
                .then(res => res.json())
                .then(data => {
                    if (!data.erro) {
                        setValue('rua', data.logradouro);
                        setValue('bairro', data.bairro);
                        setValue('cidade', data.localidade);
                        setValue('estado', data.uf);
                        setFocus('numero');
                    }
                });
        }
    }

    const erroMsg = (campo) => errors[campo] && (
        <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors[campo].message}</p>
    );

    return (
        <div className="screen-container">
            <button onClick={() => navigate(-1)} className="back-btn">
                <ChevronLeft size={20} /> Voltar para o Login
            </button>

            <h2 className="header-title mb-6">Criar Conta</h2>

            <div className="card">
                <form onSubmit={handleSubmit(finalizarCadastro)}>

                    <h3 className="section-title">Dados Pessoais</h3>
                    <div className="flex-col gap-4 mb-6">
                        <div className="input-group" style={{ marginBottom: '16px' }}>
                            <label className="input-label">Nome Completo</label>
                            <input type="text" placeholder="Digite seu nome" className="input-field" {...register('nome')} />
                            {erroMsg('nome')}
                        </div>

                        <div className="input-group" style={{ marginBottom: '16px' }}>
                            <label className="input-label">E-mail</label>
                            <input type="email" placeholder="exemplo@email.com" className="input-field" {...register('email')} />
                            {erroMsg('email')}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">CPF</label>
                                <input type="text" placeholder="11 dígitos" maxLength="11" className="input-field" {...register('cpf')} />
                                {erroMsg('cpf')}
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">Telefone</label>
                                <input type="text" placeholder="DDD + número" maxLength="11" className="input-field" {...register('telefone')} />
                                {erroMsg('telefone')}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">Data de Nascimento</label>
                                <input type="date" className="input-field" {...register('dataNascimento')} />
                                {erroMsg('dataNascimento')}
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">Gênero</label>
                                <select className="input-field" defaultValue="" {...register('genero')}>
                                    <option value="" disabled>Selecione</option>
                                    <option value="Masculino">Masculino</option>
                                    <option value="Feminino">Feminino</option>
                                    <option value="Outro">Outro</option>
                                    <option value="Prefiro não informar">Prefiro não informar</option>
                                </select>
                                {erroMsg('genero')}
                            </div>
                        </div>

                        <div className="input-group" style={{ marginBottom: '16px' }}>
                            <label className="input-label">Tipo Sanguíneo</label>
                            <select className="input-field" defaultValue="" {...register('tipoSanguineo')}>
                                <option value="" disabled>Selecione</option>
                                {TIPOS_SANGUINEOS.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                            {erroMsg('tipoSanguineo')}
                        </div>
                    </div>

                    <h3 className="section-title">Segurança</h3>
                    <div className="flex-col gap-4 mb-6">
                        <div className="input-group" style={{ marginBottom: '16px' }}>
                            <label className="input-label">Senha</label>
                            <input type="password" placeholder="••••••••" className="input-field" {...register('senha')} />
                            {erroMsg('senha')}
                            <p className="text-xs text-muted" style={{ marginTop: '6px' }}>
                                Mín. 8 caracteres, com maiúscula, minúscula, número e caractere especial.
                            </p>
                        </div>

                        <div className="input-group" style={{ marginBottom: '16px' }}>
                            <label className="input-label">Confirmar Senha</label>
                            <input type="password" placeholder="••••••••" className="input-field" {...register('confirmarSenha')} />
                            {erroMsg('confirmarSenha')}
                        </div>
                    </div>

                    <h3 className="section-title">Endereço</h3>
                    <div className="flex-col gap-4">
                        <div className="input-group" style={{ marginBottom: '16px' }}>
                            <label className="input-label">CEP</label>
                            <input
                                type="text"
                                placeholder="00000000"
                                className="input-field"
                                {...register("cep", {
                                    onBlur: buscarCep
                                })}
                            />
                            {erroMsg('cep')}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">Rua</label>
                                <input type="text" placeholder="Nome da rua" className="input-field" {...register("rua")} />
                                {erroMsg('rua')}
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">Número</label>
                                <input type="text" placeholder="Nº" className="input-field" {...register("numero")} />
                                {erroMsg('numero')}
                            </div>
                        </div>

                        <div className="input-group" style={{ marginBottom: '16px' }}>
                            <label className="input-label">Bairro</label>
                            <input type="text" placeholder="Bairro" className="input-field" {...register("bairro")} />
                            {erroMsg('bairro')}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">Cidade</label>
                                <input type="text" placeholder="Cidade" className="input-field" {...register("cidade")} />
                                {erroMsg('cidade')}
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">Estado</label>
                                <input type="text" placeholder="UF" maxLength="2" className="input-field" {...register("estado")} />
                                {erroMsg('estado')}
                            </div>
                        </div>
                    </div>

                    <h3 className="section-title">Consentimentos</h3>
                    <div className="flex-col gap-4">
                        <div className="consent-item">
                            <label className="consent-row">
                                <input type="checkbox" {...register('aceitarTermos')} />
                                <span>
                                    Li e aceito os{' '}
                                    <button type="button" className="consent-link" onClick={() => setModalAberto('termos')}>
                                        Termos de Uso
                                    </button>.
                                </span>
                            </label>
                            {erroMsg('aceitarTermos')}
                        </div>

                        <div className="consent-item">
                            <label className="consent-row">
                                <input type="checkbox" {...register('aceitarDados')} />
                                <span>
                                    Concordo com o{' '}
                                    <button type="button" className="consent-link" onClick={() => setModalAberto('dados')}>
                                        Uso dos Dados
                                    </button>{' '}
                                    e a Política de Privacidade.
                                </span>
                            </label>
                            {erroMsg('aceitarDados')}
                        </div>
                    </div>

                    {erroApi && <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '16px' }}>{erroApi}</p>}

                    <button type="submit" className="btn-primary mt-6" style={{ marginTop: '24px' }} disabled={isSubmitting}>
                        {isSubmitting ? 'Cadastrando...' : 'Finalizar Cadastro'}
                    </button>
                </form>
            </div>

            <Modal open={modalAberto === 'termos'} title="Termos de Uso" onClose={() => setModalAberto(null)}>
                <TermsContent />
            </Modal>
            <Modal open={modalAberto === 'dados'} title="Uso dos Dados e Privacidade" onClose={() => setModalAberto(null)}>
                <PrivacyContent />
            </Modal>
        </div>
    );
}
