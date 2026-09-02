import api from './api';

/**
 * GET /api/rede-saude — UBS, UPAs e prontos-socorros perto do paciente.
 *
 * O município sai do CEP do cadastro (é ele que define qual rede municipal
 * atende a pessoa) ou do `cep` pesquisado na tela, para quem mora na divisa,
 * está viajando ou quer ver a rede perto do trabalho. As coordenadas são só o
 * ponto de partida da distância: quando o paciente autoriza a localização do
 * navegador, elas vão na query; sem isso o backend mede a partir do CEP.
 *
 * @param {{lat?: number, lon?: number, cep?: string}} opcoes
 * @returns {Promise<{origem: {tipo: string, cidade: string, estado: string,
 *                             escolhida: boolean},
 *                    unidades: Array<Object>}>}
 */
export async function buscarRedeSaude({ lat, lon, cep } = {}) {
  const params = {};
  if (typeof lat === 'number' && typeof lon === 'number') {
    params.lat = lat;
    params.lon = lon;
  }
  if (cep) {
    params.cep = String(cep).replace(/\D/g, '');
  }

  const { data } = await api.get('/rede-saude', { params });
  return {
    origem: data.origem || {},
    unidades: data.unidades || [],
  };
}

/**
 * Pergunta a localização ao navegador.
 *
 * Nunca rejeita: se o paciente negar a permissão, o aparelho não tiver GPS ou
 * a resposta demorar, devolve null e a tela segue com o CEP. A coordenada só
 * é usada para calcular distância — não é gravada em lugar nenhum (LGPD).
 *
 * @returns {Promise<{lat: number, lon: number} | null>}
 */
export function localizacaoDoNavegador() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  });
}
