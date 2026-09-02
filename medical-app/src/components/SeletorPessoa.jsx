import React from 'react';
import { User, Baby } from 'lucide-react';
import { usePessoas } from '../context/PessoasContext';

// Cor do ícone da pessoa: azul para meninos, rosa para meninas. Quando o
// gênero é "Outro"/"Prefiro não informar" (ou é o titular), fica neutro.
function classePorGenero(pessoa) {
  if (pessoa.titular) return '';
  const genero = (pessoa.genero || '').trim().toLowerCase();
  if (genero === 'masculino') return 'menino';
  if (genero === 'feminino') return 'menina';
  return '';
}

/**
 * Pílulas para escolher de quem são os dados da tela: titular ou dependente.
 *
 * A escolha mora no PessoasContext, então trocar de pessoa aqui vale também
 * para as outras telas — quem entrou para ver o filho não precisa reescolher
 * em Exames, Consultas, Prontuário e Vacinas.
 *
 * Some sozinho quando não há dependente cadastrado: uma única pílula escrita
 * "você" não é escolha nenhuma, é ruído no topo da tela.
 */
export default function SeletorPessoa() {
  const { pessoas, pessoa, selecionar } = usePessoas();

  if (pessoas.length < 2) return null;

  return (
    <div className="vacina-pessoa-selector" role="group" aria-label="Escolher de quem são os dados">
      {pessoas.map((p) => {
        const ativa = String(p.id) === String(pessoa.id);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => selecionar(p.id)}
            className={`vacina-pessoa-pill ${ativa ? 'active' : ''}`}
            aria-pressed={ativa}
          >
            <span className={`vacina-pessoa-icone ${classePorGenero(p)}`}>
              {p.titular ? <User size={15} /> : <Baby size={15} />}
            </span>
            {p.titular ? `${p.nome.split(' ')[0]} (você)` : p.nome.split(' ')[0]}
          </button>
        );
      })}
    </div>
  );
}
