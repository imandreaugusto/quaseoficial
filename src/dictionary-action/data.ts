import type { CulturalEntry } from './types';

export const scenarioFilters = [
  { label: 'Entrevista', value: 'interview', suggestion: 'actually' },
  { label: 'Viagem', value: 'travel', suggestion: 'eventually' },
  { label: 'Reunião online', value: 'meeting', suggestion: 'close' },
  { label: 'Amigos', value: 'friends', suggestion: 'awkward' },
] as const;

export const mockCulturalDictionary: CulturalEntry[] = [
  {
    word_key: 'close',
    word: 'close',
    scenario_tag: 'meeting,friends,travel',
    grammatical_roles: [
      { label: 'Verbo', meaning: 'fechar ou encerrar', ipa: '/kloʊz/', pronunciationTip: 'No verbo, o s ganha som de z: /z/.' },
      { label: 'Adjetivo', meaning: 'perto, próximo ou íntimo', ipa: '/kloʊs/', pronunciationTip: 'No adjetivo, o s mantém o som de /s/.' },
    ],
    phonetic_tips: 'A grafia é igual, mas o som final muda com a classe e o sentido: close /kloʊz/ = fechar; close /kloʊs/ = perto. Ouça o áudio antes de repetir.',
    connected_speech: {
      formal: 'Close the window.',
      natural: 'Close the window.',
      meaning: 'A consoante final de close pode se ligar à palavra seguinte: close_the. O som continua sendo /z/ no verbo.',
    },
    false_twin_comparison: {
      otherWord: 'shut',
      searchedWordUsage: 'Close é a opção neutra e comum para portas, janelas, lojas e abas de aplicativos.',
      otherWordUsage: 'Shut também significa fechar, mas pode soar mais brusco em ordens. “Shut up” significa “cale a boca”, não “feche para cima”.',
    },
    cultural_usage: 'Close é um verbo cotidiano e neutro. Em lojas e conversas profissionais, “We close at six” informa o horário de encerramento; “close friends” descreve intimidade, não proximidade física.',
    brazilian_pitfalls: 'Não use o som de /s/ em todos os casos. Em “Please close the door”, close é verbo e termina em /z/. Em “the store is close”, a pronúncia é /s/, embora a frase normalmente peça “close to” para dizer “perto de”.',
    social_temp: 'neutral',
    examples_json: [
      { sentence: 'Could you close the tab before we start?', translation: 'Você pode fechar a aba antes de começarmos?' },
      { sentence: 'The hotel is close to the station.', translation: 'O hotel fica perto da estação.' },
    ],
  },
  {
    word_key: 'awkward',
    word: 'awkward',
    scenario_tag: 'friends,interview',
    grammatical_roles: [
      { label: 'Adjetivo', meaning: 'constrangedor, desconfortável ou pouco natural', ipa: '/ˈɔːkwərd/' },
      { label: 'Adjetivo', meaning: 'desajeitado ou difícil de manejar', ipa: '/ˈɔːkwərd/' },
    ],
    phonetic_tips: 'O início soa como “ó-kwerd”, em duas sílabas. Não pronuncie o w separadamente como em português; ele participa do encontro /kw/.',
    connected_speech: {
      formal: 'That was an awkward moment.',
      natural: 'That was kinda awkward.',
      meaning: 'Kinda é a redução informal de kind of e suaviza a avaliação: “foi meio constrangedor”.',
    },
    false_twin_comparison: {
      otherWord: 'embarrassed',
      searchedWordUsage: 'Awkward descreve a situação, o silêncio ou a interação social.',
      otherWordUsage: 'Embarrassed descreve como uma pessoa se sente: “I felt embarrassed”.',
    },
    cultural_usage: 'Nativos usam awkward para reconhecer um silêncio, uma situação delicada ou uma interação que não fluiu. “A little awkward” costuma suavizar o comentário e evita transformar um momento pequeno em drama.',
    brazilian_pitfalls: 'Awkward não quer dizer “acordado” nem necessariamente que alguém está com vergonha. Para “estou com vergonha”, use “I’m embarrassed”; para “que situação constrangedora”, “That was awkward”.',
    social_temp: 'informal',
    examples_json: [
      { sentence: 'It got a little awkward when nobody answered.', translation: 'Ficou meio constrangedor quando ninguém respondeu.' },
      { sentence: 'I felt awkward asking for a second interview.', translation: 'Fiquei desconfortável ao pedir uma segunda entrevista.' },
    ],
  },
  {
    word_key: 'actually',
    word: 'actually',
    scenario_tag: 'interview,meeting,friends',
    grammatical_roles: [
      { label: 'Advérbio', meaning: 'na verdade; de fato', ipa: '/ˈæktʃuəli/' },
      { label: 'Advérbio', meaning: 'surpreendentemente, contrariando uma expectativa', ipa: '/ˈæktʃuəli/' },
    ],
    phonetic_tips: 'O começo é /æk/ e o grupo “tually” costuma soar como /tʃuəli/ ou /tʃəli/. O ritmo natural é ACT-u-al-ly, sem separar cada letra.',
    connected_speech: {
      formal: 'Actually, I work remotely.',
      natural: 'Actually, I work remotely.',
      meaning: 'Em fala rápida, a vogal final pode enfraquecer e a palavra se ligar ao trecho seguinte. A forma continua sendo actually; não há uma redução escrita padrão.',
    },
    false_twin_comparison: {
      otherWord: 'currently',
      searchedWordUsage: 'Actually corrige uma impressão ou acrescenta um fato: “na verdade”.',
      otherWordUsage: 'Currently marca o momento presente: “atualmente”.',
    },
    cultural_usage: 'No começo da frase, actually pode corrigir com delicadeza, mas também pode soar como uma discordância. Em entrevista, combine com um tom cordial: “Actually, I’ve worked with that team before.”',
    brazilian_pitfalls: 'Actually não significa “atualmente”. Para isso, use currently ou these days. “Actually, I live in Brazil” quer dizer “na verdade, moro no Brasil”, muitas vezes corrigindo uma suposição.',
    social_temp: 'neutral',
    examples_json: [
      { sentence: 'I actually enjoyed the online meeting.', translation: 'Na verdade, eu gostei da reunião online.' },
      { sentence: 'Actually, could we move the interview to Friday?', translation: 'Na verdade, podemos passar a entrevista para sexta?' },
    ],
  },
  {
    word_key: 'pretend',
    word: 'pretend',
    scenario_tag: 'friends',
    grammatical_roles: [
      { label: 'Verbo', meaning: 'fingir, fazer de conta', ipa: '/prɪˈtend/' },
    ],
    phonetic_tips: 'A sílaba forte é a segunda: pri-TEND. O primeiro i tem som curto /ɪ/, como em “sit”.',
    connected_speech: {
      formal: 'Let’s pretend we are on vacation.',
      natural: 'Let’s pretend we’re on vacation.',
      meaning: 'We are frequentemente se contrai para we’re /wɪr/: “vamos fingir que estamos de férias”.',
    },
    false_twin_comparison: {
      otherWord: 'intend',
      searchedWordUsage: 'Pretend é fingir ou imaginar uma situação que não é real.',
      otherWordUsage: 'Intend é ter a intenção de fazer algo. “I intend to call” = pretendo ligar.',
    },
    cultural_usage: 'Pretend aparece em brincadeiras (“pretend you’re a chef”) e também ao falar de comportamento não genuíno (“He pretended not to notice”). O contexto deixa claro se é lúdico ou enganoso.',
    brazilian_pitfalls: 'Pretend não significa “pretender”. Para planos e intenções, use intend ou plan to. “I pretend to travel” significa “finjo viajar”, não “pretendo viajar”.',
    social_temp: 'informal',
    examples_json: [
      { sentence: 'Let’s pretend we’re meeting for the first time.', translation: 'Vamos fingir que estamos nos conhecendo pela primeira vez.' },
      { sentence: 'She pretended not to see the message.', translation: 'Ela fingiu não ter visto a mensagem.' },
    ],
  },
  {
    word_key: 'eventually',
    word: 'eventually',
    scenario_tag: 'travel,interview',
    grammatical_roles: [
      { label: 'Advérbio', meaning: 'por fim, depois de algum tempo', ipa: '/ɪˈventʃuəli/' },
    ],
    phonetic_tips: 'A sílaba forte é VEN: ih-VEN-chu-uh-lee. O começo não tem o som de “evento”; mantenha o i curto de /ɪ/.',
    connected_speech: {
      formal: 'We eventually found the hotel.',
      natural: 'We eventually found the hotel.',
      meaning: 'A palavra não costuma virar uma forma reduzida escrita. Na fala rápida, as vogais fracas ficam mais curtas; o sentido de “depois de um tempo” permanece.',
    },
    false_twin_comparison: {
      otherWord: 'possibly',
      searchedWordUsage: 'Eventually fala de algo que aconteceu ou acontecerá depois de um período ou de tentativas.',
      otherWordUsage: 'Possibly indica possibilidade, sem garantir que o evento vai acontecer.',
    },
    cultural_usage: 'Eventually é útil para contar uma sequência: houve espera, dificuldade ou tempo decorrido e, por fim, algo aconteceu. Em conversa profissional, ajuda a resumir um processo sem listar cada etapa.',
    brazilian_pitfalls: 'Eventually não significa “eventualmente” no sentido de “às vezes”. Para “às vezes”, use sometimes ou occasionally. Eventually costuma significar “por fim” ou “com o tempo”.',
    social_temp: 'neutral',
    examples_json: [
      { sentence: 'We missed one train but eventually got to the airport.', translation: 'Perdemos um trem, mas por fim chegamos ao aeroporto.' },
      { sentence: 'She eventually became the team lead.', translation: 'Com o tempo, ela se tornou líder da equipe.' },
    ],
  },
];

export const getMockEntry = (word: string) =>
  mockCulturalDictionary.find((entry) => entry.word_key === normalizeWordKey(word));

export const normalizeWordKey = (word: string) =>
  word.trim().toLocaleLowerCase('en-US').replace(/\s+/g, ' ');
