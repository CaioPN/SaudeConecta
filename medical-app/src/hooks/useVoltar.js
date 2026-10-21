import { useNavigate } from 'react-router-dom';

// O "Voltar" do canto superior esquerdo de cada tela.
//
// Volta uma posição no histórico quando a tela anterior é do próprio app.
// Quando não há (a tela foi aberta por link, numa aba nova ou recarregada),
// navigate(-1) não faria nada — ou tiraria a pessoa do app. Aí vai para a
// rota-mãe, substituindo a entrada atual em vez de empilhar uma nova.
//
// Quem diz se há tela anterior é o `idx` que o React Router grava em
// history.state: 0 na primeira entrada do app, e continua 0 depois de um
// replace. A `location.key` não serve: o replace gera uma chave nova, e a
// tela seguinte acharia que tem para onde voltar — o segundo "Voltar" saía
// do app para a página em branco da aba.
//
// Nunca use navigate('/rota') como "Voltar": isso EMPILHA a rota em vez de
// voltar. Foi o que prendia Exames → consulta → lista → consulta → lista…
// num vaivém sem fim: o detalhe empilhava a lista, e o "Voltar" da lista
// (navigate(-1)) devolvia ao detalhe.
export default function useVoltar(rotaPadrao) {
  const navigate = useNavigate();

  return () => {
    const posicao = window.history.state?.idx ?? 0;
    if (posicao > 0) {
      navigate(-1);
    } else {
      navigate(rotaPadrao, { replace: true });
    }
  };
}
