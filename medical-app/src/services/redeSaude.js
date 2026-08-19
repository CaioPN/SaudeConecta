import api from './api';

/**
 * GET /api/rede-saude — UBS, UPAs e prontos-socorros perto do paciente.
 *
 * O município sai sempre do CEP do cadastro (é ele que define qual rede
 * municipal atende a pessoa). As coordenadas são só o ponto de partida da
 * distância: quando o paciente autoriza a localização do navegador, elas vão
 * na query; sem isso o backend mede a partir do próprio CEP.
 *
 * @param {{lat?: number, lon?: number}} origem coordenadas do GPS, se houver
 * @returns {Promise<{origem: {tipo: string, cidade: string, estado: string},
 *                    unidades: Array<Object>}>}
 */
export async function buscarRedeSaude({ lat, lon } = {}) {
  const params = {};
  if (typeof lat === 'number' && typeof lon === 'number') {
    params.lat = lat;
    params.lon = lon;
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
