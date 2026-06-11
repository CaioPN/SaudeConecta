import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trash2, Users } from 'lucide-react';
import api from '../services/api';

const TIPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const schema = yup.object().shape({
    nome: yup.string().required('O nome é obrigatório!'),
    cpf: yup.string()
        .matches(/^\d{11}$/, 'O CPF deve ter exatamente 11 dígitos numéricos!')
        .required('O CPF é obrigatório!'),
    dataNascimento: yup.string().required('A data de nascimento é obrigatória!'),
    genero: yup.string().required('Selecione o gênero!'),
    tipoSanguineo: yup.string().required('Selecione o tipo sanguíneo!'),
});

// Calcula a idade (anos completos) a partir de uma data ISO (YYYY-MM-DD).
function calcularIdade(dataIso) {
    if (!dataIso) return null;
    const nasc = new Date(dataIso);
    if (Number.isNaN(nasc.getTime())) return null;
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade;
}

export default function Dependentes() {
    const navigate = useNavigate();
    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
        resolver: yupResolver(schema)
    });

    const [dependentes, setDependentes] = useState([]);
    const [erro, setErro] = useState('');
    const [carregando, setCarregando] = useState(true);

    async function carregarDependentes() {
        try {
            const { data } = await api.get('/dependentes');
            setDependentes(data.dependentes);
        } catch (err) {
            setErro(err?.response?.data?.erro || 'Erro ao carregar dependentes.');
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregarDependentes();
    }, []);

    async function adicionarDependente(dados) {
        setErro('');
        try {
            const { data } = await api.post('/dependentes', dados);
            setDependentes((atual) => [...atual, data.dependente]);
            reset();
        } catch (err) {
            setErro(err?.response?.data?.erro || 'Não foi possível cadastrar o dependente.');
        }
    }

    async function removerDependente(id) {
        try {
            await api.delete(`/dependentes/${id}`);
            setDependentes((atual) => atual.filter((d) => d.id !== id));
        } catch (err) {
            setErro(err?.response?.data?.erro || 'Não foi possível remover o dependente.');
        }
    }

    const erroMsg = (campo) => errors[campo] && (
        <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors[campo].message}</p>
    );

    return (
        <div className="screen-container">
            <button onClick={() => navigate(-1)} className="back-btn">
                <ChevronLeft size={20} /> Voltar
            </button>

            <h2 className="header-title mb-6">Dependentes</h2>
            <p className="text-sm text-muted" style={{ marginTop: '-16px', marginBottom: '24px' }}>
                Cadastre familiares vinculados à sua conta. Eles não possuem acesso próprio.
            </p>

            <div className="card">
                <h3 className="section-title">Novo Dependente</h3>
                <form onSubmit={handleSubmit(adicionarDependente)}>
                    <div className="input-group" style={{ marginBottom: '16px' }}>
                        <label className="input-label">Nome Completo</label>
                        <input type="text" placeholder="Nome do dependente" className="input-field" {...register('nome')} />
                        {erroMsg('nome')}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label className="input-label">CPF</label>
                            <input type="text" placeholder="11 dígitos" maxLength="11" className="input-field" {...register('cpf')} />
                            {erroMsg('cpf')}
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label className="input-label">Data de Nascimento</label>
                            <input type="date" className="input-field" {...register('dataNascimento')} />
                            {erroMsg('dataNascimento')}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
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
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label className="input-label">Tipo Sanguíneo</label>
                            <select className="input-field" defaultValue="" {...register('tipoSanguineo')}>
                                <option value="" disabled>Selecione</option>
                                {TIPOS_SANGUINEOS.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                            {erroMsg('tipoSanguineo')}
                        </div>
                    </div>

                    {erro && <p style={{ color: '#ef4444', fontSize: '14px', marginBottom: '16px' }}>{erro}</p>}

                    <button type="submit" className="btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Salvando...' : 'Adicionar Dependente'}
                    </button>
                </form>
            </div>

            <h3 className="section-title">Meus Dependentes</h3>
            {carregando ? (
                <p className="text-sm text-muted">Carregando...</p>
            ) : dependentes.length === 0 ? (
                <div className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="icon-box icon-box-gray"><Users size={22} /></div>
                    <p className="text-sm text-muted">Nenhum dependente cadastrado ainda.</p>
                </div>
            ) : (
                dependentes.map((dep) => (
                    <div className="card card-sm border-blue" key={dep.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h4 className="font-bold">{dep.nome}</h4>
                            <p className="text-sm text-muted">
                                {calcularIdade(dep.data_nascimento)} anos • {dep.genero} • {dep.tipo_sanguineo}
                            </p>
                            <p className="text-xs text-muted">CPF: {dep.cpf}</p>
                        </div>
                        <button
                            onClick={() => removerDependente(dep.id)}
                            className="icon-box icon-box-gray"
                            style={{ cursor: 'pointer', border: 'none' }}
                            title="Remover dependente"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))
            )}
        </div>
    );
}
