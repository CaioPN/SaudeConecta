import React from 'react';
import { Calendar, MapPin, Info, ChevronLeft, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Appointment() {
  const navigate = useNavigate();
  
  return (
    <div className="p-6">
      <button onClick={() => navigate(-1)} className="mt-2 mb-6 flex items-center text-gray-500 hover:text-blue-600 font-medium">
        <ChevronLeft size={20} className="mr-1" /> Voltar
      </button>

      <h2 className="text-2xl font-bold text-gray-900 mb-6">Detalhes da Consulta</h2>

      <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
        <div className="flex items-center space-x-4 mb-6 border-b border-gray-100 pb-6">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shrink-0">
            <User size={28} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Dr. Gabriel Ferreira</h3>
            <p className="text-blue-600 text-sm font-semibold">Clínico Geral</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <Calendar className="text-gray-400 mt-0.5" size={22} />
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Data e Hora</p>
              <p className="font-medium text-gray-900">23 Fev 2026 • 14:30</p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <MapPin className="text-gray-400 mt-0.5" size={22} />
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Local</p>
              <p className="font-medium text-gray-900">Edifício Saúde, Sala 402</p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <Info className="text-gray-400 mt-0.5" size={22} />
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Motivo</p>
              <p className="font-medium text-gray-900">Retorno (Follow-up)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button className="w-full bg-blue-600 text-white font-semibold py-3.5 rounded-xl shadow-md hover:bg-blue-700 transition">Iniciar Atendimento</button>
        <button className="w-full bg-white text-gray-700 font-semibold py-3.5 rounded-xl border border-gray-200 shadow-sm hover:bg-gray-50 transition">Remarcar</button>
      </div>
    </div>
  );
}