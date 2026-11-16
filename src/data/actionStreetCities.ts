import actionStreetData from './actionStreetData.json';
import packageTwo from '../../states_11_to_20.json';
import packageThree from '../../states_21_to_30.json';
import type { City, Hotspot } from '../types/actionStreet';

type PackagedCity = {
  id: string;
  stateName: string;
  city: string;
  unlockedByDefault: boolean;
  unlockCost: number;
  weatherPreset: string;
  camera: { center: number[]; zoom: number; pitch: number; bearing: number };
  route3D: { name: string; waypoints: number[][] };
  stamp: { id: string; code: string; title: string; color: string };
  touristGuide: City['touristGuide'];
  hotspots: Omit<Hotspot, 'spotId' | 'souvenirIcon'>[];
  mission: City['mission'];
};

const regions: Record<string, string> = {
  co: 'West',
  la: 'South',
  az: 'West',
  ga: 'South',
  tn: 'South',
  pa: 'Northeast',
  or: 'West',
  ut: 'West',
  mi: 'Midwest',
  mn: 'Midwest',
  nc: 'South',
  va: 'South',
  oh: 'Midwest',
  md: 'Northeast',
  ak: 'West',
  nm: 'West',
  sc: 'South',
  mo: 'Midwest',
  ky: 'South',
  wi: 'Midwest',
};

const souvenirIcons = ['Coffee', 'TrainFront', 'Signpost'] as const;
const weatherPresets = ['clear_day', 'rainy', 'golden_hour', 'night'] as const;

function isWeatherPreset(value: string): value is City['weatherPreset'] {
  return weatherPresets.some((preset) => preset === value);
}

function coordinate(value: number[], stateId: string): [number, number] {
  if (value.length !== 2 || !value.every(Number.isFinite) || Math.abs(value[0]) > 180 || Math.abs(value[1]) > 90) {
    throw new Error(`Invalid Action Street coordinates for ${stateId}.`);
  }
  return [value[0], value[1]];
}

function toRuntimeCity(state: PackagedCity): City {
  const region = regions[state.id];
  if (!region) throw new Error(`Missing Action Street region for ${state.id}.`);
  if (!isWeatherPreset(state.weatherPreset)) {
    throw new Error(`Unsupported Action Street weather preset for ${state.id}.`);
  }
  if (state.hotspots.length !== 3 || state.route3D.waypoints.length < state.hotspots.length) {
    throw new Error(`Action Street package ${state.id} must have three hotspots and matching route points.`);
  }

  const spots = state.hotspots.map((hotspot, index) => ({
    id: `${state.id}-spot-${index + 1}`,
    name: hotspot.word,
    coordinates: coordinate(state.route3D.waypoints[index], state.id),
  }));

  return {
    id: state.id,
    stateName: state.stateName,
    city: state.city,
    region,
    unlockedByDefault: state.unlockedByDefault,
    unlockCost: state.unlockCost,
    weatherPreset: state.weatherPreset,
    camera: { ...state.camera, center: coordinate(state.camera.center, state.id) },
    route3D: { name: state.route3D.name, waypoints: state.route3D.waypoints.map((point) => coordinate(point, state.id)) },
    spots,
    stamp: {
      id: state.stamp.id,
      title: state.stamp.title,
      subtitle: `${state.city} · ${state.stamp.code}`,
      color: state.stamp.color,
    },
    touristGuide: state.touristGuide,
    hotspots: state.hotspots.map((hotspot, index) => ({
      ...hotspot,
      spotId: spots[index].id,
      souvenirIcon: souvenirIcons[index % souvenirIcons.length],
    })),
    mission: state.mission,
  };
}

const firstPackageAdditionalCities: City[] = [
  {
    id: 'ca',
    stateName: 'California',
    city: 'Los Angeles',
    region: 'West',
    unlockedByDefault: false,
    unlockCost: 700,
    weatherPreset: 'golden_hour',
    camera: { center: [-118.2487, 34.0507], zoom: 16, pitch: 60, bearing: 0 },
    route3D: {
      name: 'Grand Central Market to Grand Park',
      waypoints: [
        [-118.2487, 34.0507],
        [-118.2506, 34.0553],
        [-118.2465, 34.0553],
      ],
    },
    spots: [
      { id: 'grand-central-market', name: 'Grand Central Market', coordinates: [-118.2487, 34.0507] },
      { id: 'walt-disney-concert-hall', name: 'Walt Disney Concert Hall', coordinates: [-118.2506, 34.0553] },
      { id: 'grand-park', name: 'Grand Park', coordinates: [-118.2465, 34.0553] },
    ],
    stamp: { id: 'stamp-ca', title: 'THE GOLDEN STATE', subtitle: 'Los Angeles, CA', color: '#D97706' },
    touristGuide: {
      title: 'Grand Central Market',
      text: 'Grand Central Market has brought together food vendors in downtown Los Angeles for generations. Nearby landmarks include the historic Bradbury Building and the gardens of Grand Park.',
    },
    hotspots: [
      {
        id: 'ca-1',
        spotId: 'grand-central-market',
        word: 'food hall',
        translation: 'mercado coberto com várias opções de comida',
        phonetic: '/ˈfuːd hɔːl/',
        example: 'We tried tacos and fresh fruit at the downtown food hall.',
        rewardDollars: 50,
        souvenirIcon: 'Utensils',
      },
      {
        id: 'ca-2',
        spotId: 'walt-disney-concert-hall',
        word: 'freeway',
        translation: 'via expressa',
        phonetic: '/ˈfriːweɪ/',
        example: 'Traffic on the freeway gets heavy during the evening commute.',
        rewardDollars: 50,
        souvenirIcon: 'Train',
      },
      {
        id: 'ca-3',
        spotId: 'grand-park',
        word: 'food truck',
        translation: 'caminhão adaptado para vender comida',
        phonetic: '/ˈfuːd trʌk/',
        example: 'A food truck parked near the park was serving Korean tacos.',
        rewardDollars: 55,
        souvenirIcon: 'Coffee',
      },
    ],
    mission: {
      id: 'ca-mission-1',
      title: 'Order Lunch at the Market',
      description: 'Você está no Grand Central Market e quer pedir uma refeição para viagem.',
      rewardDollars: 200,
      npcRole: 'Atendente de barraca',
      steps: [
        {
          npcLine: 'Hi! What can I get started for you?',
          options: [
            {
              text: "I'll have two tacos to go, please.",
              isCorrect: true,
              feedback: "Perfeito! 'I'll have...' é natural para fazer um pedido; 'to go' significa para viagem.",
            },
            {
              text: 'I want two taco for carry.',
              isCorrect: false,
              feedback: "Use 'two tacos' no plural e 'to go' para dizer que vai levar o pedido.",
            },
          ],
        },
      ],
    },
  },
  {
    id: 'il',
    stateName: 'Illinois',
    city: 'Chicago',
    region: 'Midwest',
    unlockedByDefault: false,
    unlockCost: 900,
    weatherPreset: 'rainy',
    camera: { center: [-87.6234, 41.8827], zoom: 16, pitch: 60, bearing: 0 },
    route3D: {
      name: 'Millennium Park to the Chicago Riverwalk',
      waypoints: [
        [-87.6234, 41.8827],
        [-87.6298, 41.8884],
        [-87.6278, 41.8917],
      ],
    },
    spots: [
      { id: 'millennium-park', name: 'Millennium Park', coordinates: [-87.6234, 41.8827] },
      { id: 'chicago-riverwalk', name: 'Chicago Riverwalk', coordinates: [-87.6298, 41.8884] },
      { id: 'cloud-gate', name: 'Cloud Gate', coordinates: [-87.6234, 41.8827] },
    ],
    stamp: { id: 'stamp-il', title: 'THE PRAIRIE STATE', subtitle: 'Chicago, IL', color: '#2563EB' },
    touristGuide: {
      title: 'Millennium Park',
      text: "Millennium Park is a downtown gathering place known for Cloud Gate, the sculpture many people call 'The Bean.' The nearby Chicago Riverwalk offers public art, restaurants, and views of the city's bridges.",
    },
    hotspots: [
      {
        id: 'il-1',
        spotId: 'millennium-park',
        word: 'The L',
        translation: 'apelido do trem elevado de Chicago',
        phonetic: '/ðə ˈɛl/',
        example: 'We took the L to the Loop instead of driving downtown.',
        rewardDollars: 55,
        souvenirIcon: 'Train',
      },
      {
        id: 'il-2',
        spotId: 'chicago-riverwalk',
        word: 'deep-dish pizza',
        translation: 'pizza alta com massa grossa, típica de Chicago',
        phonetic: '/ˌdiːp ˈdɪʃ ˈpiːtsə/',
        example: "Let's split a deep-dish pizza after our walk by the river.",
        rewardDollars: 55,
        souvenirIcon: 'Utensils',
      },
      {
        id: 'il-3',
        spotId: 'cloud-gate',
        word: 'the Loop',
        translation: 'região central de Chicago, servida por linhas elevadas',
        phonetic: '/ðə ˈluːp/',
        example: 'Her office is in the Loop, a short walk from Millennium Park.',
        rewardDollars: 60,
        souvenirIcon: 'Building',
      },
    ],
    mission: {
      id: 'il-mission-1',
      title: 'Find the Right Train',
      description: 'Você está no centro de Chicago e quer confirmar qual trem leva ao Loop.',
      rewardDollars: 220,
      npcRole: 'Passageiro local',
      steps: [
        {
          npcLine: 'Are you trying to get to the Loop?',
          options: [
            {
              text: 'Yes. Which line should I take, and where is the nearest station?',
              isCorrect: true,
              feedback: "Ótimo! 'Which line should I take?' pergunta qual linha usar; 'nearest station' é a estação mais próxima.",
            },
            {
              text: 'Yes, what line I take for go Loop?',
              isCorrect: false,
              feedback: "Em perguntas, use 'Which line should I take?' e diga 'to the Loop', não 'for go Loop'.",
            },
          ],
        },
      ],
    },
  },
  {
    id: 'nv',
    stateName: 'Nevada',
    city: 'Las Vegas',
    region: 'West',
    unlockedByDefault: false,
    unlockCost: 1150,
    weatherPreset: 'night',
    camera: { center: [-115.1728, 36.1126], zoom: 16, pitch: 60, bearing: 0 },
    route3D: {
      name: 'Bellagio Fountains and the Las Vegas Strip',
      waypoints: [
        [-115.1728, 36.1126],
        [-115.1767, 36.1162],
        [-115.1710, 36.1125],
      ],
    },
    spots: [
      { id: 'bellagio-fountains', name: 'Bellagio Fountains', coordinates: [-115.1728, 36.1126] },
      { id: 'caesars-palace', name: 'Caesars Palace', coordinates: [-115.1767, 36.1162] },
      { id: 'paris-las-vegas', name: 'Paris Las Vegas', coordinates: [-115.1710, 36.1125] },
    ],
    stamp: { id: 'stamp-nv', title: 'THE SILVER STATE', subtitle: 'Las Vegas, NV', color: '#64748B' },
    touristGuide: {
      title: 'The Las Vegas Strip',
      text: 'The Las Vegas Strip is known for illuminated resorts, live shows, and the Bellagio fountains. Visitors can walk between nearby attractions or use local buses to cover longer distances.',
    },
    hotspots: [
      {
        id: 'nv-1',
        spotId: 'bellagio-fountains',
        word: 'the Strip',
        translation: 'avenida turística de Las Vegas',
        phonetic: '/ðə ˈstrɪp/',
        example: 'We walked along the Strip to see the lights after dinner.',
        rewardDollars: 60,
        souvenirIcon: 'Signpost',
      },
      {
        id: 'nv-2',
        spotId: 'caesars-palace',
        word: 'resort fee',
        translation: 'taxa diária cobrada por muitos resorts',
        phonetic: '/rɪˈzɔːrt fiː/',
        example: 'Ask whether the resort fee is included in the room price.',
        rewardDollars: 60,
        souvenirIcon: 'Building',
      },
      {
        id: 'nv-3',
        spotId: 'paris-las-vegas',
        word: 'showroom',
        translation: 'sala ou teatro onde acontecem apresentações',
        phonetic: '/ˈʃoʊˌruːm/',
        example: 'We booked seats in the showroom for the evening show.',
        rewardDollars: 65,
        souvenirIcon: 'Building',
      },
    ],
    mission: {
      id: 'nv-mission-1',
      title: 'Ask About the Resort Fee',
      description: 'No hotel, confirme se a taxa do resort já está incluída no valor da diária.',
      rewardDollars: 240,
      npcRole: 'Recepcionista do hotel',
      steps: [
        {
          npcLine: 'Your room is ready. Is there anything else I can help you with?',
          options: [
            {
              text: 'Could you confirm whether the resort fee is included in my total?',
              isCorrect: true,
              feedback: "Boa! 'Could you confirm whether...?' é educado e ajuda a esclarecer cobranças do hotel.",
            },
            {
              text: 'The resort money is inside in my price?',
              isCorrect: false,
              feedback: "Use 'resort fee' para a taxa e 'included in my total' para perguntar se ela está incluída.",
            },
          ],
        },
      ],
    },
  },
  {
    id: 'ma',
    stateName: 'Massachusetts',
    city: 'Boston',
    region: 'Northeast',
    unlockedByDefault: false,
    unlockCost: 1400,
    weatherPreset: 'golden_hour',
    camera: { center: [-71.0636, 42.3551], zoom: 16, pitch: 60, bearing: 0 },
    route3D: {
      name: 'Boston Common to Faneuil Hall',
      waypoints: [
        [-71.0636, 42.3551],
        [-71.0589, 42.3575],
        [-71.0552, 42.3601],
      ],
    },
    spots: [
      { id: 'boston-common', name: 'Boston Common', coordinates: [-71.0636, 42.3551] },
      { id: 'faneuil-hall', name: 'Faneuil Hall', coordinates: [-71.0552, 42.3601] },
      { id: 'quincy-market', name: 'Quincy Market', coordinates: [-71.0568, 42.3601] },
    ],
    stamp: { id: 'stamp-ma', title: 'THE BAY STATE', subtitle: 'Boston, MA', color: '#A855F7' },
    touristGuide: {
      title: 'Boston Common & the Freedom Trail',
      text: 'Boston Common is the oldest public park in the United States and a starting point for the Freedom Trail. The marked route connects historic sites across the walkable downtown.',
    },
    hotspots: [
      {
        id: 'ma-1',
        spotId: 'boston-common',
        word: 'the T',
        translation: 'apelido do metrô e transporte público de Boston',
        phonetic: '/ðə ˈtiː/',
        example: 'We took the T from Boston Common to the museum.',
        rewardDollars: 65,
        souvenirIcon: 'Train',
      },
      {
        id: 'ma-2',
        spotId: 'faneuil-hall',
        word: 'clam chowder',
        translation: 'sopa cremosa de mariscos, comum na Nova Inglaterra',
        phonetic: '/ˈklæm ˌtʃaʊdər/',
        example: 'I ordered a cup of clam chowder to warm up on the rainy day.',
        rewardDollars: 65,
        souvenirIcon: 'Utensils',
      },
      {
        id: 'ma-3',
        spotId: 'quincy-market',
        word: 'wicked',
        translation: 'gíria regional para muito ou extremamente',
        phonetic: '/ˈwɪkɪd/',
        example: 'That seafood place is wicked good.',
        rewardDollars: 70,
        souvenirIcon: 'Sparkles',
      },
    ],
    mission: {
      id: 'ma-mission-1',
      title: 'Follow the Freedom Trail',
      description: 'Você está no Boston Common e quer saber como encontrar o início da trilha histórica.',
      rewardDollars: 260,
      npcRole: 'Guia local',
      steps: [
        {
          npcLine: 'Are you looking for the Freedom Trail?',
          options: [
            {
              text: 'Yes. Where does the trail start, and is it marked along the way?',
              isCorrect: true,
              feedback: "Muito bem! 'Where does the trail start?' pergunta onde começa, e 'marked along the way' pergunta se há sinalização.",
            },
            {
              text: 'Yes, where the trail begin and have signs in the way?',
              isCorrect: false,
              feedback: "Use 'Where does the trail start?' e 'Are there signs along the way?' para formular as perguntas.",
            },
          ],
        },
      ],
    },
  },
  {
    id: 'wa',
    stateName: 'Washington',
    city: 'Seattle',
    region: 'West',
    unlockedByDefault: false,
    unlockCost: 1700,
    weatherPreset: 'rainy',
    camera: { center: [-122.3425, 47.6094], zoom: 16, pitch: 60, bearing: 0 },
    route3D: {
      name: 'Pike Place Market to the Waterfront',
      waypoints: [
        [-122.3425, 47.6094],
        [-122.3408, 47.6074],
        [-122.3382, 47.6047],
      ],
    },
    spots: [
      { id: 'pike-place-market', name: 'Pike Place Market', coordinates: [-122.3425, 47.6094] },
      { id: 'gum-wall', name: 'Market Theater Gum Wall', coordinates: [-122.3408, 47.6074] },
      { id: 'seattle-waterfront', name: 'Seattle Waterfront', coordinates: [-122.3382, 47.6047] },
    ],
    stamp: { id: 'stamp-wa', title: 'THE EVERGREEN STATE', subtitle: 'Seattle, WA', color: '#0F766E' },
    touristGuide: {
      title: 'Pike Place Market',
      text: "Pike Place Market is one of Seattle's best-known public markets, with produce stands, fishmongers, and independent shops. The waterfront and Elliott Bay are a short walk downhill.",
    },
    hotspots: [
      {
        id: 'wa-1',
        spotId: 'pike-place-market',
        word: 'fishmonger',
        translation: 'vendedor especializado em peixes',
        phonetic: '/ˈfɪʃˌmʌŋɡər/',
        example: 'The fishmonger wrapped our salmon so it would stay cold.',
        rewardDollars: 70,
        souvenirIcon: 'Utensils',
      },
      {
        id: 'wa-2',
        spotId: 'gum-wall',
        word: 'waterfront',
        translation: 'região urbana à beira d’água',
        phonetic: '/ˈwɔːtərˌfrʌnt/',
        example: 'We walked from the market down to the waterfront.',
        rewardDollars: 70,
        souvenirIcon: 'Signpost',
      },
      {
        id: 'wa-3',
        spotId: 'seattle-waterfront',
        word: 'ferry terminal',
        translation: 'terminal de balsas',
        phonetic: '/ˈfɛri ˌtɜːrmɪnəl/',
        example: 'The ferry terminal is busy during the evening commute.',
        rewardDollars: 75,
        souvenirIcon: 'TrainFront',
      },
    ],
    mission: {
      id: 'wa-mission-1',
      title: 'Find the Ferry Terminal',
      description: 'Você está no Pike Place Market e quer caminhar até o terminal de balsas.',
      rewardDollars: 280,
      npcRole: 'Vendedor do mercado',
      steps: [
        {
          npcLine: 'Are you heading down to the waterfront?',
          options: [
            {
              text: 'Yes. Could you point me toward the ferry terminal?',
              isCorrect: true,
              feedback: "Ótimo! 'Could you point me toward...?' é uma maneira educada de pedir direções.",
            },
            {
              text: 'Yes, show me with your finger where is the ferry terminal.',
              isCorrect: false,
              feedback: "Em vez da tradução literal, use 'Could you point me toward...?' para pedir que indiquem a direção.",
            },
          ],
        },
      ],
    },
  },
  {
    id: 'hi',
    stateName: 'Hawaii',
    city: 'Honolulu',
    region: 'West',
    unlockedByDefault: false,
    unlockCost: 2000,
    weatherPreset: 'clear_day',
    camera: { center: [-157.8278, 21.2766], zoom: 16, pitch: 60, bearing: 0 },
    route3D: {
      name: 'Waikiki Beach and Kapiolani Park',
      waypoints: [
        [-157.8278, 21.2766],
        [-157.8267, 21.2744],
        [-157.8210, 21.2695],
      ],
    },
    spots: [
      { id: 'waikiki-beach', name: 'Waikiki Beach', coordinates: [-157.8278, 21.2766] },
      { id: 'kuhio-beach', name: 'Kuhio Beach', coordinates: [-157.8267, 21.2744] },
      { id: 'kapiolani-park', name: 'Kapiolani Park', coordinates: [-157.8210, 21.2695] },
    ],
    stamp: { id: 'stamp-hi', title: 'THE ALOHA STATE', subtitle: 'Honolulu, HI', color: '#0EA5A4' },
    touristGuide: {
      title: 'Waikiki Beach',
      text: 'Waikiki Beach is a popular stretch of Honolulu shoreline with views of Diamond Head. Nearby Kapiolani Park offers open green space, while local shops serve shave ice and other island favorites.',
    },
    hotspots: [
      {
        id: 'hi-1',
        spotId: 'waikiki-beach',
        word: 'lei',
        translation: 'colar de flores oferecido como símbolo de boas-vindas ou celebração',
        phonetic: '/leɪ/',
        example: 'The host welcomed us with a flower lei.',
        rewardDollars: 75,
        souvenirIcon: 'Sparkles',
      },
      {
        id: 'hi-2',
        spotId: 'kuhio-beach',
        word: 'shave ice',
        translation: 'sobremesa havaiana de gelo raspado com caldas',
        phonetic: '/ˈʃeɪv aɪs/',
        example: 'We cooled off with shave ice after our walk on the beach.',
        rewardDollars: 75,
        souvenirIcon: 'Coffee',
      },
      {
        id: 'hi-3',
        spotId: 'kapiolani-park',
        word: 'TheBus',
        translation: 'sistema de ônibus de Honolulu',
        phonetic: '/ðə ˈbʌs/',
        example: 'We checked TheBus schedule before heading to Diamond Head.',
        rewardDollars: 80,
        souvenirIcon: 'Train',
      },
    ],
    mission: {
      id: 'hi-mission-1',
      title: 'Ask About the Bus to Diamond Head',
      description: 'Você está em Waikiki e quer confirmar como pegar o ônibus para Diamond Head.',
      rewardDollars: 300,
      npcRole: 'Atendente de informações',
      steps: [
        {
          npcLine: 'Are you planning to visit Diamond Head today?',
          options: [
            {
              text: 'Yes. Which bus should I take from Waikiki, and where should I get off?',
              isCorrect: true,
              feedback: "Perfeito! Você perguntou qual ônibus pegar e onde descer. 'Get off' é descer de um transporte.",
            },
            {
              text: 'Yes, what bus I take and where I leave down?',
              isCorrect: false,
              feedback: "Use 'Which bus should I take?' e 'Where should I get off?' para perguntar sobre a linha e o ponto.",
            },
          ],
        },
      ],
    },
  },
];

const packagedCities = [...packageTwo.states, ...packageThree.states].map((state) => toRuntimeCity(state));
const existingCities = actionStreetData.states as unknown as City[];
const cities = [...existingCities, ...firstPackageAdditionalCities, ...packagedCities];

if (new Set(cities.map((city) => city.id)).size !== cities.length) {
  throw new Error('Action Street contains duplicate state IDs.');
}

export const actionStreetCities: City[] = cities;
