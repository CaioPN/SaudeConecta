import React, { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { criarConsulta, atualizarConsulta, buscarSugestoes } from '../services/consultas';

/**
 * Formulário da consulta que o PACIENTE anota.
 *
 * O app não marca consulta com ninguém: quem agenda é a unidade, por telefone
 * ou no balcão. O que se faz aqui é guardar o que já foi marcado, para virar
 * lembrete e aviso — por isso não existe campo de resumo nem de conduta, que
 * são o registro do atendimento e continuam sendo escritos pelo profissional.
 *
 * Fica em components/ porque tem dois donos: o "+ Nova consulta" da lista e o
 * "Corrigir" do detalhe.
 */

// Especialidades que aparecem na lista antes de o paciente ter qualquer
// consulta registrada. Depois disso, as que ele já usou entram na frente —
// quem tem cardiologista volta ao cardiologista.
const ESPECIALIDADES = [
  'Clínico Geral', 'Pediatria', 'Ginecologia', 'Cardiologia', 'Dermatologia',
  'Oftalmologia', 'Ortopedia', 'Odontologia', 'Psiquiatria', 'Psicologia',
  'Nutrição', 'Fisioterapia', 'Endocrinologia', 'Neurologia', 'Urologia',
];

function hojeIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const VAZIO = {
  profissional: '', especialidade: '', data: '', hora: '', local: '', motivo: '',
};

export default function FormularioConsulta({ consulta, dependenteId, onPronto, onCancelar }) {
  // `consulta` preenchido = corrigindo uma anotação; vazio = anotando uma nova.
  // O "marcar retorno" do detalhe cai no segundo caso, só que com o
  // profissional e o local já preenchidos e a data em branco.
  const editando = Boolean(consulta?.id);

  const [form, setForm] = useState(() => ({
    ...VAZIO,
    profissional: consulta?.medico && consulta.medico !== 'Profissional não informado'
      ? consulta.medico : '',
    especialidade: consulta?.especialidade || '',
    data: consulta?.data || '',
    hora: consulta?.hora || '',
    local: consulta?.local || '',
    motivo: consulta?.motivo && consulta.motivo !== 'Consulta' ? consulta.motivo : '',
  }));
  const [unidadeCnes, setUnidadeCnes] = useState(consulta?.unidadeCnes ?? null);
  const [sugestoes, setSugestoes] = useState([]);
  const [estado, setEstado] = useState(null); // 'enviando' | mensagem de erro

  // Quem já atendeu o paciente e onde. Consulta quase sempre é retorno, então
  // escolher da lista poupa digitar as três coisas.
  useEffect(() => {
    let ativo = true;
    buscarSugestoes()
      .then((lista) => { if (ativo) setSugestoes(lista); })
      // Sem sugestão o formulário continua inteiro — só deixa de adivinhar.
      .catch(() => { if (ativo) setSugestoes([]); });
    return () => { ativo = false; };
  }, []);

  const profissionais = useMemo(() => {
    const vistos = new Set();
    return sugestoes.filter((s) => {
      if (!s.profissional || vistos.has(s.profissional)) return false;
      vistos.add(s.profissional);
      return true;
    });
  }, [sugestoes]);

  const locais = useMemo(
    () => [...new Set(sugestoes.map((s) => s.local).filter(Boolean))],
    [sugestoes],
  );

  const especialidades = useMemo(() => {
    const usadas = sugestoes.map((s) => s.especialidade).filter(Boolean);
    return [...new Set([...usadas, ...ESPECIALIDADES])];
  }, [sugestoes]);

  const alterar = (campo) => (e) => {
    const valor = e.target.value;
    setForm((atual) => {
      const novo = { ...atual, [campo]: valor };

      // Escolher um profissional conhecido preenche o resto: é o atalho que
      // faz a diferença no retorno. Só completa campo VAZIO — o que o paciente
      // já digitou nunca é sobrescrito.
      if (campo === 'profissional') {
        const achado = profissionais.find((p) => p.profissional === valor);
        if (achado) {
          if (!novo.especialidade) novo.especialidade = achado.especialidade;
          if (!novo.local) novo.local = achado.local;
          if (achado.unidadeCnes) setUnidadeCnes(achado.unidadeCnes);
        }
      }
      // Trocar o local na mão desfaz o vínculo com a unidade da rede: o
      // "Como chegar" do detalhe apontaria para o endereço errado.
      if (campo === 'local') {
        const achado = sugestoes.find((s) => s.local === valor && s.unidadeCnes);
        setUnidadeCnes(achado ? achado.unidadeCnes : null);
      }
      return novo;
    });
  };

  const enviar = async (e) => {
    e.preventDefault();
    setEstado('enviando');
    const corpo = {
      profissional: form.profissional,
      especialidade: form.especialidade || null,
      data: form.data,
      hora: form.hora,
      local: form.local,
      motivo: form.motivo || null,
      unidadeCnes,
    };
    try {
      if (editando) {
        await atualizarConsulta(consulta.id, corpo);
      } else {
        // dependenteId só vai na criação: a consulta não muda de dono depois.
        await criarConsulta({ ...corpo, dependenteId: dependenteId || null });
      }
      onPronto?.();
    } catch (err) {
      setEstado(err.response?.data?.erro || 'Não foi possível salvar a consulta.');
    }
  };

  return (
    <form onSubmit={enviar}>
      <div className="input-group">
        <label className="input-label">Profissional</label>
        <input
          className="input-field"
          list="consulta-profissionais"
          placeholder="Dr. João Silva"
          value={form.profissional}
          onChange={alterar('profissional')}
          required
        />
        <datalist id="consulta-profissionais">
          {profissionais.map((p) => (
            <option key={p.profissional} value={p.profissional}>{p.especialidade}</option>
          ))}
        </datalist>
      </div>

      <div className="input-group">
        <label className="input-label">Especialidade</label>
        <input
          className="input-field"
          list="consulta-especialidades"
          placeholder="Clínico Geral"
          value={form.especialidade}
          onChange={alterar('especialidade')}
        />
        <datalist id="consulta-especialidades">
          {especialidades.map((e) => <option key={e} value={e} />)}
        </datalist>
      </div>

      <div className="form-linha-dupla">
        <div className="input-group">
          <label className="input-label">Data</label>
          <input
            className="input-field"
            type="date"
            value={form.data}
            min={editando ? undefined : hojeIso()}
            onChange={alterar('data')}
            required
          />
        </div>
        <div className="input-group">
          <label className="input-label">Hora</label>
          <input
            className="input-field"
            type="time"
            value={form.hora}
            onChange={alterar('hora')}
            required
          />
        </div>
      </div>

      <div className="input-group">
        <label className="input-label">Local</label>
        <input
          className="input-field"
          list="consulta-locais"
          placeholder="UBS Jardim Paulista"
          value={form.local}
          onChange={alterar('local')}
          required
        />
        <datalist id="consulta-locais">
          {locais.map((l) => <option key={l} value={l} />)}
        </datalist>
      </div>

      <div className="input-group">
        <label className="input-label">Motivo (opcional)</label>
        <input
          className="input-field"
          placeholder="Retorno com resultados"
          value={form.motivo}
          onChange={alterar('motivo')}
        />
      </div>

      <p className="text-xs text-muted">
        <Check size={12} /> Anotar aqui não marca a consulta: quem agenda é a
        unidade de saúde. O app avisa você quando a data se aproximar.
      </p>

      {estado && estado !== 'enviando' && <p className="form-erro">{estado}</p>}

      <div className="form-botoes">
        {onCancelar && (
          <button type="button" className="btn-secondary" onClick={onCancelar}>
            Cancelar
          </button>
        )}
        <button className="btn-primary" type="submit" disabled={estado === 'enviando'}>
          {estado === 'enviando' ? 'Salvando…' : editando ? 'Salvar alterações' : 'Anotar consulta'}
        </button>
      </div>
    </form>
  );
}
