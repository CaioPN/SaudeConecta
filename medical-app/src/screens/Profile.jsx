import React from 'react';
import {
  User, ChevronLeft, Mail, Phone, IdCard, Calendar, Droplet, Venus, MapPin,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="info-row">
      <div className="info-icon"><Icon size={18} /></div>
      <div>
        <p className="info-label">{label}</p>
        <p className="info-value">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { paciente } = useAuth();

  const nome = paciente?.nome || 'Paciente';
  const idade = calcularIdade(paciente?.data_nascimento);
  const detalhes = [idade != null ? `${idade} anos` : null, paciente?.id ? `ID: #${paciente.id}` : null]
    .filter(Boolean)
    .join(' • ');
  const endereco = montarEndereco(paciente);

  return (
    <div className="screen-container">
      <button onClick={() => navigate(-1)} className="back-btn">
        <ChevronLeft size={20} /> Voltar
      </button>

      <div className="card profile-header">
        <div className="profile-avatar">
          <User size={40} />
        </div>
        <h2 className="header-title" style={{ fontSize: '20px' }}>{nome}</h2>
        <p className="text-sm text-muted">{detalhes || 'Dados do paciente'}</p>
      </div>

      <h3 className="section-title">Dados Cadastrais</h3>
      <div className="card">
        <InfoRow icon={Mail} label="E-mail" value={paciente?.email} />
        <InfoRow icon={Phone} label="Telefone" value={formatarTelefone(paciente?.telefone)} />
        <InfoRow icon={IdCard} label="CPF" value={formatarCPF(paciente?.cpf)} />
        <InfoRow icon={Calendar} label="Data de Nascimento" value={formatarData(paciente?.data_nascimento)} />
        <InfoRow icon={Venus} label="Gênero" value={paciente?.genero} />
        <InfoRow icon={Droplet} label="Tipo Sanguíneo" value={paciente?.tipo_sanguineo} />
      </div>

      <h3 className="section-title">Endereço</h3>
      <div className="card">
        <InfoRow icon={MapPin} label="Endereço" value={endereco} />
        <InfoRow icon={MapPin} label="CEP" value={formatarCEP(paciente?.cep)} />
      </div>
    </div>
  );
}
