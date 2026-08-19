import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ICONES } from '../utils/icones';

// Índice dos registros de saúde. Diferente das "Ações Rápidas" do Início, que
// são só atalhos: aqui está a lista completa, com uma linha explicando cada
// destino. Por isso esta tela é uma lista, e a do Início é uma grade.
const REGISTROS = [
  {
    rota: '/record',
    icone: ICONES.prontuario,
    titulo: 'Prontuário',
    descricao: 'Alergias, condições, medicações e histórico',
  },
  {
    rota: '/exams',
    icone: ICONES.exames,
    titulo: 'Exames',
    descricao: 'Resultados de sangue e de imagem',
  },
  {
    rota: '/appointment',
    icone: ICONES.consultas,
    titulo: 'Consultas',
    descricao: 'Próximas e anteriores',
  },
  {
    rota: '/vacinas',
    icone: ICONES.vacinas,
    titulo: 'Carteira de Vacinação',
    descricao: 'Doses tomadas e pendentes',
  },
  {
    rota: '/dependentes',
    icone: ICONES.dependentes,
    titulo: 'Dependentes',
    descricao: 'Familiares vinculados à conta',
  },
];

export default function PatientProfile() {
  const navigate = useNavigate();
  const { paciente } = useAuth();

  const primeiroNome = paciente?.nome ? paciente.nome.split(' ')[0] : null;

  return (
    <div className="screen-container">
      <button onClick={() => navigate(-1)} className="back-btn">
        <ChevronLeft size={20} /> Voltar
      </button>

      <h2 className="header-title">Minha Saúde</h2>
      <p className="header-subtitle mb-6">
        {primeiroNome ? `Seus registros, ${primeiroNome}` : 'Seus registros de saúde'}
      </p>

      <div className="flex-col gap-4">
        {REGISTROS.map((item) => (
          <button
            key={item.rota}
            onClick={() => navigate(item.rota)}
            className="list-action-btn"
          >
            <div className="icon-box icon-box-lg">
              <item.icone size={26} />
            </div>
            <div>
              <h4 className="font-bold">{item.titulo}</h4>
              <p className="text-sm text-muted">{item.descricao}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
