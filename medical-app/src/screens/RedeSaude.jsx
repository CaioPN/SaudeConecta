import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft, MapPin, Phone, Navigation, Hospital, Ambulance, HeartPulse,
  Clock, Search, X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { buscarRedeSaude, localizacaoDoNavegador } from '../services/redeSaude';

// Cada tipo de unidade tem seu ícone e o nome que o paciente reconhece.
// As chaves são as mesmas do backend (UnidadeSaude.UBS, UPA, PRONTO_SOCORRO).
const TIPOS = {
  ubs: { rotulo: 'UBS', icone: Hospital },
  upa: { rotulo: 'UPA', icone: Ambulance },
  pronto_socorro: { rotulo: 'Pronto-socorro', icone: HeartPulse },
};

// Filtros do topo, na ordem em que aparecem.
const FILTROS = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'ubs', rotulo: 'UBS' },
  { id: 'upa', rotulo: 'UPA' },
  { id: 'pronto_socorro', rotulo: 'Pronto-socorro' },
];

// "1.2" vira "1,2 km"; abaixo de 1 km mostra em metros, que é mais concreto
// para quem vai a pé. Sem distância calculada, não mostra nada.
function formatarDistancia(km) {
  if (km == null) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

// Abre a rota no app de mapas do aparelho (Google Maps no Android, Mapas no
// iPhone). Usa a coordenada do CNES, não o endereço em texto, que erra mais.
function linkComoChegar(u) {
  return `https://www.google.com/maps/dir/?api=1&destination=${u.latitude},${u.longitude}`;
}

function UnidadeItem({ unidade }) {
  const tipo = TIPOS[unidade.tipo] || TIPOS.ubs;
  const Icone = tipo.icone;
  const distancia = formatarDistancia(unidade.distancia_km);

  return (
    <div className="unidade-item">
      <div className={`unidade-icone ${unidade.tipo}`}>
        <Icone size={20} />
      </div>

      <div className="unidade-body">
        <div className="unidade-top">
          <span className="font-bold">{unidade.nome}</span>
          {distancia && <span className="unidade-distancia">{distancia}</span>}
        </div>

        <span className="unidade-tipo">{tipo.rotulo}</span>

        {unidade.endereco && (
          <span className="unidade-meta">
            <MapPin size={12} />
            {unidade.endereco}{unidade.bairro ? ` - ${unidade.bairro}` : ''}
          </span>
        )}

        {unidade.turno && (
          <span className="unidade-meta">
            <Clock size={12} /> {unidade.turno}
          </span>
        )}

        <div className="unidade-acoes">
          <a
            className="unidade-acao"
            href={linkComoChegar(unidade)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Navigation size={14} /> Como chegar
          </a>
          {unidade.telefone && (
            <a className="unidade-acao" href={`tel:${unidade.telefone.replace(/\D/g, '')}`}>
              <Phone size={14} /> Ligar
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RedeSaude() {
  const navigate = useNavigate();
  const [origem, setOrigem] = useState(null);
  const [unidades, setUnidades] = useState([]);
  const [filtro, setFiltro] = useState('todas');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  // Cidade pesquisada na tela; vazio significa "a do meu cadastro".
  const [cepBusca, setCepBusca] = useState('');
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [cepDigitado, setCepDigitado] = useState('');
  // Erro do próprio campo de CEP: fica dentro do formulário, senão apagaria
  // a lista já carregada por causa de um dígito a menos.
  const [erroBusca, setErroBusca] = useState(null);

  // Pede a localização ao navegador e só então chama a API: com o GPS a
  // distância sai do lugar onde a pessoa está agora; sem ele, do CEP do
  // cadastro. A permissão negada não é erro — é o caminho normal.
  //
  // Com uma cidade pesquisada o GPS é pulado: o paciente está perguntando por
  // outro lugar, e medir a partir de onde ele está agora só embaralharia a
  // ordem da lista.
  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(null);

    const localizar = cepBusca ? Promise.resolve(null) : localizacaoDoNavegador();

    localizar
      .then((coordenadas) => buscarRedeSaude({ ...(coordenadas || {}), cep: cepBusca }))
      .then((dados) => {
        if (!ativo) return;
        setOrigem(dados.origem);
        setUnidades(dados.unidades);
      })
      .catch((err) => {
        if (!ativo) return;
        setUnidades([]);
        setErro(err?.response?.data?.erro || 'Não foi possível carregar a rede de saúde.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [cepBusca]);

  const pesquisarCidade = (evento) => {
    evento.preventDefault();
    const digitos = cepDigitado.replace(/\D/g, '');
    if (digitos.length !== 8) {
      setErroBusca('Digite os 8 dígitos do CEP.');
      return;
    }
    setErroBusca(null);
    setBuscaAberta(false);
    setCepBusca(digitos);
  };

  const voltarParaMinhaCidade = () => {
    setCepDigitado('');
    setErroBusca(null);
    setBuscaAberta(false);
    setCepBusca('');
  };

  const lista = useMemo(
    () => (filtro === 'todas' ? unidades : unidades.filter((u) => u.tipo === filtro)),
    [unidades, filtro],
  );

  // De onde as distâncias foram medidas — o paciente precisa saber, senão um
  // "1,2 km" medido a partir do CEP parece errado quando ele não está em casa.
  const legendaOrigem = origem?.escolhida
    ? (origem.tipo === 'nenhuma'
        ? 'ordenadas por nome — não foi possível calcular a distância'
        : 'distâncias a partir do CEP pesquisado')
    : {
        gps: 'distâncias a partir da sua localização',
        cep: 'distâncias a partir do CEP do seu cadastro',
        nenhuma: 'ordenadas por nome — não foi possível calcular a distância',
      }[origem?.tipo];

  return (
    <div className="screen-container">
      <button onClick={() => navigate(-1)} className="back-btn">
        <ChevronLeft size={20} /> Voltar
      </button>

      <h2 className="header-title mb-2">Rede de Saúde</h2>
      <p className="text-sm text-muted mb-2">
        {origem?.cidade
          ? `${origem.cidade} - ${origem.estado} · ${legendaOrigem}`
          : 'Unidades públicas de saúde perto de você'}
      </p>

      {/* Trocar de cidade: a lista é da rede municipal, e uma UBS da cidade
          vizinha não aparece nem estando a poucos quarteirões — quem mora na
          divisa, viaja ou trabalha em outra cidade precisa desta saída. */}
      {buscaAberta ? (
        <form className="rede-busca" onSubmit={pesquisarCidade}>
          <div className="rede-busca-linha">
            <input
              className="input-field"
              inputMode="numeric"
              maxLength={9}
              placeholder="CEP da cidade (só números)"
              value={cepDigitado}
              onChange={(e) => {
                setCepDigitado(e.target.value);
                if (erroBusca) setErroBusca(null);
              }}
              autoFocus
            />
            <button type="submit" className="rede-busca-acao" aria-label="Pesquisar cidade">
              <Search size={18} />
            </button>
            <button
              type="button"
              className="rede-busca-acao"
              onClick={() => { setErroBusca(null); setBuscaAberta(false); }}
              aria-label="Cancelar"
            >
              <X size={18} />
            </button>
          </div>
          {erroBusca && <p className="form-erro">{erroBusca}</p>}
        </form>
      ) : (
        <div className="rede-cidade-acoes">
          <button className="rede-filtro" onClick={() => setBuscaAberta(true)}>
            <Search size={13} /> Ver outra cidade
          </button>
          {(cepBusca || origem?.escolhida) && (
            <button className="rede-filtro" onClick={voltarParaMinhaCidade}>
              <MapPin size={13} /> Minha cidade
            </button>
          )}
        </div>
      )}

      {!carregando && !erro && unidades.length > 0 && (
        <div className="rede-filtros">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`rede-filtro ${filtro === f.id ? 'active' : ''}`}
            >
              {f.rotulo}
            </button>
          ))}
        </div>
      )}

      {carregando && <p className="empty-state">Buscando unidades perto de você…</p>}
      {erro && !carregando && <p className="empty-state">{erro}</p>}

      {!carregando && !erro && (
        lista.length === 0 ? (
          <p className="empty-state">
            {unidades.length === 0
              ? 'Nenhuma unidade encontrada para a sua cidade.'
              : 'Nenhuma unidade desse tipo por perto.'}
          </p>
        ) : (
          lista.map((u) => <UnidadeItem key={u.codigo_cnes} unidade={u} />)
        )
      )}

      {!carregando && !erro && unidades.length > 0 && (
        <p className="rede-fonte">
          Fonte: CNES — Cadastro Nacional de Estabelecimentos de Saúde,
          dados abertos do Ministério da Saúde.
        </p>
      )}
    </div>
  );
}
