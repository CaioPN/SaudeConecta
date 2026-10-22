import React, { useEffect, useState } from 'react';
import useVoltar from '../hooks/useVoltar';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { ChevronLeft, Trash2, Users } from 'lucide-react';
import BotaoPrivacidade from '../components/BotaoPrivacidade';
import EstadoErro from '../components/EstadoErro';
import { mensagemDaAcao } from '../utils/falhas';
import ConfirmarExclusao from '../components/ConfirmarExclusao';
import { usePessoas } from '../context/PessoasContext';
import { usePrivacidade } from '../context/PrivacidadeContext';
import { mascarar } from '../utils/privacidade';
import api from '../services/api';

const TIPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Data de hoje no fuso do aparelho. toISOString() daria o dia em UTC, que no
// Brasil já é "amanhã" depois das 21h.
function hojeIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const schema = yup.object().shape({
    nome: yup.string().required('O nome é obrigatório!'),
    cpf: yup.string()
        .matches(/^\d{11}$/, 'O CPF deve ter exatamente 11 dígitos numéricos!')
        .required('O CPF é obrigatório!'),
    dataNascimento: yup.string()
        .required('A data de nascimento é obrigatória!')
        // Texto ISO compara como data: "2027-01-05" > "2026-10-20".
        .test('nao-futura', 'A data de nascimento não pode estar no futuro!',
            (valor) => !valor || valor <= hojeIso()),
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
    const voltar = useVoltar('/patient');
    // O seletor de pessoa das outras telas lê a mesma lista; sem avisar o
    // contexto, um dependente recém-cadastrado só apareceria lá depois de
    // recarregar a página.
    const { recarregar } = usePessoas();
    const { oculto } = usePrivacidade();
    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
        resolver: yupResolver(schema)
    });

    const [dependentes, setDependentes] = useState([]);
    const [erro, setErro] = useState('');
    const [carregando, setCarregando] = useState(true);
    // Falha ao ler a lista; sem ela a tela dizia "Nenhum dependente cadastrado".
    const [erroLista, setErroLista] = useState(null);
    // Dependente cuja exclusão espera confirmação; null = janela fechada.
    const [aExcluir, setAExcluir] = useState(null);

    async function carregarDependentes() {
        setCarregando(true);
        setErroLista(null);
        try {
            const { data } = await api.get('/dependentes');
            setDependentes(data.dependentes);
        } catch (err) {
            setErroLista(err);
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
            recarregar();
            reset();
        } catch (err) {
            setErro(mensagemDaAcao(err, 'Não foi possível cadastrar o dependente.'));
        }
    }

    async function removerDependente(id) {
        try {
            await api.delete(`/dependentes/${id}`);
            setDependentes((atual) => atual.filter((d) => d.id !== id));
            recarregar();
        } catch (err) {
            setErro(mensagemDaAcao(err, 'Não foi possível remover o dependente.'));
        } finally {
            setAExcluir(null);
        }
    }

    const erroMsg = (campo) => errors[campo] && (
        <p className="campo-erro">{errors[campo].message}</p>
    );

    return (
        <div className="screen-container tela-rolagem">
            <div className="tela-topo">
                <button onClick={() => voltar()} className="back-btn">
                    <ChevronLeft size={20} /> Voltar
                </button>

                <div className="section-header">
                    <h2 className="header-title">Dependentes</h2>
                    <BotaoPrivacidade rotulo="dados dos dependentes" />
                </div>
                <p className="text-sm text-muted" style={{ marginTop: '-8px', marginBottom: '24px' }}>
                    Cadastre familiares vinculados à sua conta. Eles não possuem acesso próprio.
                </p>
            </div>

            <div className="tela-lista">

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
                            <input type="date" className="input-field" max={hojeIso()} {...register('dataNascimento')} />
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

                    {erro && <p className="form-erro">{erro}</p>}

                    <button type="submit" className="btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Salvando...' : 'Adicionar Dependente'}
                    </button>
                </form>
            </div>

            <h3 className="section-title">Meus Dependentes</h3>
            {carregando ? (
                <p className="text-sm text-muted">Carregando...</p>
            ) : erroLista ? (
                <EstadoErro erro={erroLista} oQue="os seus dependentes" onTentarDeNovo={carregarDependentes} />
            ) : dependentes.length === 0 ? (
                <div className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="icon-box icon-box-gray"><Users size={22} /></div>
                    <p className="text-sm text-muted">Nenhum dependente cadastrado ainda.</p>
                </div>
            ) : (
                dependentes.map((dep) => (
                    <div className="card card-sm border-blue" key={dep.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {/* O nome fica visível mesmo com o olhinho fechado: é
                            por ele que o titular sabe qual cartão é de quem na
                            hora de remover. O que some é o documento e os dados
                            de saúde — CPF, idade, gênero e tipo sanguíneo. */}
                        <div>
                            <h4 className="font-bold">{dep.nome}</h4>
                            <p className={`text-sm text-muted ${oculto ? 'valor-oculto' : ''}`}>
                                {oculto
                                    ? mascarar(`00 anos • ${dep.genero} • ${dep.tipo_sanguineo}`)
                                    : `${calcularIdade(dep.data_nascimento)} anos • ${dep.genero} • ${dep.tipo_sanguineo}`}
                            </p>
                            <p className={`text-xs text-muted ${oculto ? 'valor-oculto' : ''}`}>
                                CPF: {oculto ? mascarar(dep.cpf) : dep.cpf}
                            </p>
                        </div>
                        <button
                            onClick={() => setAExcluir(dep)}
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

            {/* Excluir o dependente apaga em cascata consultas, exames, vacinas e
                prontuário dele (ON DELETE CASCADE no schema): a janela diz isso,
                porque não há como desfazer. */}
            <ConfirmarExclusao
                aberto={aExcluir !== null}
                titulo="Excluir dependente"
                mensagem={`Deseja excluir ${aExcluir?.nome ?? 'este dependente'}?`}
                aviso={`As consultas, os exames, as vacinas e o prontuário de ${aExcluir?.nome?.split(' ')[0] ?? 'quem for excluído'} também serão apagados. Isso não pode ser desfeito.`}
                onConfirmar={() => removerDependente(aExcluir.id)}
                onCancelar={() => setAExcluir(null)}
            />
        </div>
    );
}
