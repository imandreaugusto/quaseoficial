export const mapillaryConfig = {
  // Token será carregado do .env - VITE_MAPILLARY_ACCESS_TOKEN
  // Fallback em caso de token não disponível

  getAccessToken(): string {
    return import.meta.env.VITE_MAPILLARY_ACCESS_TOKEN || '';
  },

  // Coordenadas de imagens conhecidas do Mapillary (exemplos)
  // Em produção, você buscaria essas IDs da API do Mapillary
  fallbackImageIds: {
    ny_times_square: 'SAMPLE_NY_TIMES_SQUARE_IMAGE_ID',
    ny_central_park: 'SAMPLE_NY_CENTRAL_PARK_IMAGE_ID',
    nj_hoboken: 'SAMPLE_NJ_HOBOKEN_IMAGE_ID',
    tx_austin: 'SAMPLE_TX_AUSTIN_IMAGE_ID',
    fl_miami: 'SAMPLE_FL_MIAMI_IMAGE_ID',
  },

  // UI customizado
  uiConfig: {
    components: {
      attribution: true,
      bearing: true,
      cover: true,
      direction: true,
      fullscreen: false,
      maplibre: false,
      navigation: true,
      pointer: true,
      popup: false,
      sequence: true,
      spatial: false,
      tag: true,
      zoom: true,
    },
  },

  // Fallback visual quando token não está disponível
  fallbackUI: {
    showMessage: true,
    message: 'Street View indisponível no momento. Utilize o Mapa 3D para explorar.',
    showMap: true,
  },

  // Configuração de camadas (tags / hotspots)
  layerConfig: {
    id: 'mapillary-spots',
    type: 'circle',
    source: 'mapillary-data',
    paint: {
      'circle-radius': 8,
      'circle-color': '#FF6B6B',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff',
      'circle-opacity': 0.7,
    },
  },

  // CSS obrigatório (deve ser importado globalmente)
  requiredCSS: 'mapillary-js/dist/mapillary.css',

  // Créditos - CC BY-SA 4.0
  creditText: 'Imagery © Mapillary - CC BY-SA 4.0',
};

export const isMapillaryAvailable = (): boolean => {
  const token = mapillaryConfig.getAccessToken();
  return token && token.length > 0 && !token.includes('VITE_');
};

export const getMapillaryFallbackMessage = (): string => {
  if (!isMapillaryAvailable()) {
    return 'Para visualizar ruas 360° em tempo real, configure VITE_MAPILLARY_ACCESS_TOKEN no .env';
  }
  return '';
};
