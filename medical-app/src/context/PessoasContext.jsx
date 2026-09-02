import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

// De quem são os dados que as telas estão mostrando: do titular da conta ou de
// um dependente dele.
//
// O estado é global por dois motivos. O primeiro é evitar que quatro telas
// (Prontuário, Exames, Consultas e Vacinas) busquem a mesma lista de
// dependentes cada uma por sua conta. O segundo é de uso: quem abriu o app
// para cuidar do filho quer que Exames, Consultas e Prontuário sigam falando
// do filho — trocar de pessoa em toda tela seria trabalho repetido.
//
// Como o PrivacidadeContext, a escolha NÃO é gravada: recarregar a página
// volta para o titular. É o padrão seguro — o app é do titular, e um app
// deixado aberto no dependente esconderia os dados de quem abriu.

const TITULAR = 'titular';

const PessoasContext = createContext(null);

export function PessoasProvider({ children }) {
  const { paciente } = useAuth();
  const [dependentes, setDependentes] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(TITULAR);
  const [versao, setVersao] = useState(0);

  const pacienteId = paciente?.id;

  useEffect(() => {
    if (!pacienteId) {
      setDependentes([]);
      setSelecionadoId(TITULAR);
      return undefined;
    }
    let ativo = true;
    api
      .get('/dependentes')
      .then(({ data }) => {
        if (ativo) setDependentes(data.dependentes || []);
      })
      .catch(() => {
        // Sem a lista, o seletor simplesmente não aparece e as telas seguem
        // mostrando o titular — nenhuma delas depende de dependente existir.
        if (ativo) setDependentes([]);
      });
    return () => {
      ativo = false;
    };
  }, [pacienteId, versao]);

  // Titular sempre em primeiro; os dependentes na ordem em que vieram da API.
  const pessoas = useMemo(() => [
    {
      id: TITULAR,
      nome: paciente?.nome || 'Você',
      data_nascimento: paciente?.data_nascimento,
      titular: true,
    },
    ...dependentes.map((d) => ({
      id: d.id,
      nome: d.nome,
      data_nascimento: d.data_nascimento,
      genero: d.genero,
      titular: false,
    })),
  ], [paciente, dependentes]);

  // Se o dependente selecionado foi excluído, a busca não acha e a tela volta
  // sozinha para o titular, sem ficar pedindo dados de alguém que não existe.
  const pessoa = pessoas.find((p) => String(p.id) === String(selecionadoId)) || pessoas[0];

  // É isto que as telas passam para os services. undefined (e não null) porque
  // os services montam a query com `dependenteId ? { dependenteId } : undefined`.
  const dependenteId = pessoa.titular ? undefined : pessoa.id;

  // Chamado pela tela de Dependentes depois de cadastrar ou remover alguém:
  // sem isso o seletor das outras telas ficaria desatualizado até recarregar.
  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  const valor = useMemo(
    () => ({ pessoas, pessoa, dependenteId, selecionar: setSelecionadoId, recarregar }),
    [pessoas, pessoa, dependenteId, recarregar],
  );

  return <PessoasContext.Provider value={valor}>{children}</PessoasContext.Provider>;
}

// Hook para consumir a pessoa selecionada.
export function usePessoas() {
  return useContext(PessoasContext);
}
