export const maplibreConfig = {
  // Style do OpenFreeMap com suporte a 3D
  styleUrl: 'https://tiles.openfreemap.org/styles/liberty',

  // Fallback style caso API esteja indisponível
  fallbackStyle: {
    version: 8,
    name: 'Action Street Fallback',
    sources: {
      'raster-tiles': {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': '#1a1a2e',
        },
      },
      {
        id: 'raster-layer',
        type: 'raster',
        source: 'raster-tiles',
        minzoom: 0,
        maxzoom: 28,
      },
    ],
  },

  // Configuração inicial do mapa
  initialOptions: {
    container: 'map3d-container',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [-74.006, 40.7128] as [number, number], // NYC
    zoom: 12,
    pitch: 0,
    bearing: 0,
    antialias: true,
  },

  // Camadas de extrusão 3D para prédios
  buildingLayerConfig: {
    id: 'building-3d',
    source: 'openmaptiles',
    'source-layer': 'building',
    type: 'fill-extrusion',
    minzoom: 15,
    paint: {
      'fill-extrusion-color': '#aaa',
      'fill-extrusion-height': [
        'interpolate',
        ['linear'],
        ['zoom'],
        15,
        0,
        15.05,
        ['get', 'height'],
      ],
      'fill-extrusion-base': [
        'interpolate',
        ['linear'],
        ['zoom'],
        15,
        0,
        15.05,
        ['get', 'min_height'],
      ],
      'fill-extrusion-opacity': 0.6,
    },
  },

  // Animação de câmera 3D
  cameraNightAnimation: {
    center: [-74.006, 40.7128],
    zoom: 15,
    pitch: 60,
    bearing: -30,
    duration: 2000,
  },

  // Cores tema noturno elegante
  darkTheme: {
    water: '#1a2332',
    building: '#2a3f5f',
    street: '#1a1a2e',
    park: '#1a3a2a',
  },
};

export const createMaplibreMap = (containerId: string) => {
  return {
    containerId,
    styleUrl: maplibreConfig.styleUrl,
  };
};
