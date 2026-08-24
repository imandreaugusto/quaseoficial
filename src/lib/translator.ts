// High-performance English to Portuguese Dictionary & Multi-tiered Translation Utility

export const BUILTIN_DICTIONARY: Record<string, string> = {
  // Articles & Determiners
  the: 'o, a, os, as',
  a: 'um, uma',
  an: 'um, uma',
  this: 'este, esta, isto',
  that: 'aquele, aquela, isso',
  these: 'estes, estas',
  those: 'aqueles, aquelas',
  all: 'todos, todas, tudo',
  some: 'alguns, algumas, algo',
  any: 'qualquer, nenhum',
  every: 'cada, todo',
  each: 'cada um',
  no: 'nenhum, não',
  many: 'muitos, muitas',
  much: 'muito, muita',
  more: 'mais',
  most: 'a maioria, mais',
  few: 'poucos, poucas',
  little: 'pouco, pequeno',
  other: 'outro, outra',
  another: 'outro, mais um',
  such: 'tal, tais',
  both: 'ambos, os dois',

  // Pronouns
  i: 'eu',
  you: 'você, vocês',
  he: 'ele',
  she: 'ela',
  it: 'ele, ela (objeto/animal)',
  we: 'nós',
  they: 'eles, elas',
  me: 'mim, me',
  him: 'ele, o, lhe',
  her: 'ela, a, lhe, dela',
  us: 'nós, nos',
  them: 'eles, elas, os, as',
  my: 'meu, minha, meus, minhas',
  your: 'seu, sua, seus, suas',
  his: 'dele, seu, sua',
  its: 'dele, dela, seu, sua',
  our: 'nosso, nossa, nossos, nossas',
  their: 'deles, delas, seus, suas',
  myself: 'eu mesmo(a)',
  yourself: 'você mesmo(a)',
  himself: 'ele mesmo',
  herself: 'ela mesma',
  itself: 'si mesmo',
  ourselves: 'nós mesmos',
  themselves: 'eles mesmos',
  who: 'quem, que',
  whom: 'quem, a quem',
  whose: 'de quem, cujo',
  what: 'o que, qual',
  which: 'qual, que',
  where: 'onde',
  when: 'quando',
  why: 'por que',
  how: 'como',

  // Conjunctions & Prepositions
  and: 'e',
  but: 'mas, porém',
  or: 'ou',
  so: 'então, assim, tão',
  because: 'porque, pois',
  if: 'se',
  then: 'então, depois',
  than: 'do que',
  as: 'como, enquanto',
  while: 'enquanto',
  although: 'embora, apesar de',
  though: 'embora, no entanto',
  in: 'em, dentro de',
  on: 'em, sobre, em cima de',
  at: 'em, no, na',
  to: 'para, a, até',
  for: 'para, por',
  with: 'com',
  without: 'sem',
  of: 'de, do, da',
  from: 'de, vindo de',
  by: 'por, perto de, através de',
  about: 'sobre, a respeito de, cerca de',
  against: 'contra',
  between: 'entre (dois)',
  among: 'entre (vários)',
  through: 'através de',
  during: 'durante',
  before: 'antes, diante de',
  after: 'depois, após',
  above: 'acima de',
  below: 'abaixo de',
  under: 'debaixo de, sob',
  over: 'sobre, acima, mais de',
  into: 'para dentro de',
  out: 'fora, para fora',
  off: 'desligado, fora de',
  up: 'para cima, alto',
  down: 'para baixo',
  near: 'perto de',
  far: 'longe',
  across: 'através, do outro lado',
  behind: 'atrás de',
  'in front of': 'na frente de',

  // Verbs (Present, Past, Common forms)
  is: 'é, está',
  are: 'são, estão',
  am: 'sou, estou',
  was: 'era, estava',
  were: 'eram, estavam',
  be: 'ser, estar',
  been: 'sido, estado',
  being: 'sendo, estando',
  have: 'ter, possuir',
  has: 'tem, possui',
  had: 'tinha, teve',
  do: 'fazer',
  does: 'faz',
  did: 'fez',
  done: 'feito',
  doing: 'fazendo',
  make: 'fazer, criar',
  made: 'fez, criado',
  say: 'dizer, falar',
  said: 'disse, falado',
  go: 'ir',
  goes: 'vai',
  went: 'foi',
  gone: 'ido',
  going: 'indo',
  get: 'obter, conseguir, ficar, chegar',
  got: 'obteve, conseguiu',
  getting: 'ficando, obtendo',
  know: 'saber, conhecer',
  knew: 'sabia, conhecia',
  known: 'sabido, conhecido',
  take: 'pegar, levar, tomar',
  took: 'pegou, levou',
  taken: 'pego, levado',
  see: 'ver, enxergar',
  saw: 'viu',
  seen: 'visto',
  come: 'vir, chegar',
  came: 'veio, chegou',
  think: 'pensar, achar',
  thought: 'pensou, achava, pensamento',
  look: 'olhar, parecer',
  looked: 'olhou, parecia',
  want: 'querer, desejar',
  wanted: 'queria, desejado',
  give: 'dar, fornecer',
  gave: 'deu',
  given: 'dado',
  use: 'usar, utilizar',
  used: 'usou, usado',
  find: 'encontrar, achar',
  found: 'encontrou, achou',
  tell: 'contar, dizer',
  told: 'contou, disse',
  ask: 'perguntar, pedir',
  asked: 'perguntou, pediu',
  work: 'trabalhar, funcionar, trabalho',
  worked: 'trabalhou, funcionava',
  seem: 'parecer',
  seemed: 'parecia',
  feel: 'sentir, achar',
  felt: 'sentiu',
  try: 'tentar, experimentar',
  tried: 'tentou',
  leave: 'sair, deixar, partir',
  left: 'saiu, deixou, esquerda',
  call: 'chamar, ligar, ligação',
  called: 'chamou, ligou',
  keep: 'manter, guardar',
  kept: 'manteve, guardado',
  let: 'deixar, permitir',
  begin: 'começar, iniciar',
  began: 'começou',
  begun: 'começado',
  help: 'ajudar, ajuda',
  helped: 'ajudou',
  talk: 'falar, conversar',
  talked: 'falou, conversou',
  turn: 'virar, girar, vez',
  start: 'começar, iniciar, início',
  started: 'começou, iniciado',
  show: 'mostrar, apresentar, show',
  showed: 'mostrou',
  shown: 'mostrado',
  hear: 'ouvir, escutar',
  heard: 'ouviu, escutou',
  play: 'jogar, tocar, brincar, peça',
  played: 'jogou, tocou',
  run: 'correr, administrar, corrida',
  ran: 'correu',
  move: 'mover, mude, movimento',
  like: 'gostar, como (comparação)',
  liked: 'gostou',
  live: 'viver, morar, ao vivo',
  lived: 'viveu, morava',
  believe: 'acreditar, crer',
  believed: 'acreditou',
  hold: 'segurar, manter',
  held: 'segurou',
  bring: 'trazer',
  brought: 'trouxe',
  happen: 'acontecer',
  happened: 'aconteceu',
  write: 'escrever',
  wrote: 'escreveu',
  written: 'escrito',
  sit: 'sentar',
  sat: 'sentou',
  stand: 'ficar em pé, aguentar',
  stood: 'ficou em pé',
  lose: 'perder',
  lost: 'perdeu, perdido',
  pay: 'pagar',
  paid: 'pagou, pago',
  meet: 'conhecer, encontrar, reunião',
  met: 'conheceu, encontrou',
  include: 'incluir',
  continue: 'continuar',
  set: 'definir, conjunto, ajustar',
  learn: 'aprender',
  learned: 'aprendeu, aprendido',
  change: 'mudar, alterar, mudança, troco',
  changed: 'mudou, alterado',
  lead: 'liderar, guiar',
  led: 'liderou',
  watch: 'assistir, olhar, relógio',
  watched: 'assistiu',
  follow: 'seguir, acompanhar',
  followed: 'seguiu',
  stop: 'parar, parada',
  stopped: 'parou',
  create: 'criar',
  created: 'criou, criado',
  speak: 'falar',
  spoke: 'falou',
  spoken: 'falado',
  read: 'ler, lido',
  allow: 'permitir',
  add: 'adicionar, somar',
  spend: 'gastar, passar tempo',
  spent: 'gastou, passou',
  grow: 'crescer, cultivar',
  grew: 'cresceu',
  grown: 'crescido',
  open: 'abrir, aberto',
  opened: 'abriu',
  walk: 'caminhar, andar, caminhada',
  walked: 'caminhou',
  win: 'ganhar, vencer',
  won: 'ganhou, venceu',
  offer: 'oferecer, oferta',
  remember: 'lembrar, recordar',
  remembered: 'lembrou',
  love: 'amar, amor',
  loved: 'amou, amado',
  buy: 'comprar',
  bought: 'comprou, comprado',
  wait: 'esperar, aguardar',
  waited: 'esperou',
  serve: 'servir',
  send: 'enviar, mandar',
  sent: 'enviou, enviado',
  expect: 'esperar, prever',
  build: 'construir',
  built: 'construiu, construído',
  stay: 'ficar, permanecer, estadia',
  stayed: 'ficou, permaneceu',
  fall: 'cair, outono',
  fell: 'caiu',
  fallen: 'caído',
  cut: 'cortar, corte',
  reach: 'alcançar, chegar a',
  decide: 'decidir',
  decided: 'decidiu',
  pull: 'puxar',
  push: 'empurrar',
  teach: 'ensinar',
  taught: 'ensinou',
  listen: 'ouvir, escutar',
  listened: 'ouviu',

  // Nouns
  time: 'tempo, hora, vez',
  year: 'ano',
  years: 'anos',
  people: 'pessoas, povo',
  way: 'caminho, jeito, maneira',
  day: 'dia',
  days: 'dias',
  man: 'homem',
  men: 'homens',
  thing: 'coisa',
  things: 'coisas',
  woman: 'mulher',
  women: 'mulheres',
  life: 'vida',
  child: 'criança',
  children: 'crianças, filhos',
  world: 'mundo',
  school: 'escola',
  family: 'família',
  student: 'estudante, aluno',
  students: 'estudantes, alunos',
  group: 'grupo',
  country: 'país',
  problem: 'problema',
  problems: 'problemas',
  hand: 'mão',
  hands: 'mãos',
  part: 'parte',
  place: 'lugar, local',
  case: 'caso, estojo',
  week: 'semana',
  weeks: 'semanas',
  company: 'empresa, companhia',
  system: 'sistema',
  program: 'programa',
  question: 'pergunta, questão',
  questions: 'perguntas',
  number: 'número',
  night: 'noite',
  nights: 'noites',
  point: 'ponto, ideia principal',
  home: 'casa, lar',
  water: 'água',
  room: 'quarto, sala, espaço',
  mother: 'mãe',
  area: 'área, região',
  money: 'dinheiro',
  story: 'história, conto',
  stories: 'histórias',
  fact: 'fato',
  month: 'mês',
  months: 'meses',
  book: 'livro',
  books: 'livros',
  eye: 'olho',
  eyes: 'olhos',
  job: 'trabalho, emprego',
  jobs: 'empregos',
  word: 'palavra',
  words: 'palavras',
  business: 'negócios, empresa',
  house: 'casa',
  friend: 'amigo, amiga',
  friends: 'amigos, amigas',
  father: 'pai',
  power: 'poder, energia',
  hour: 'hora',
  hours: 'horas',
  game: 'jogo, partida',
  line: 'linha, fila',
  end: 'fim, final, término',
  member: 'membro',
  car: 'carro',
  cars: 'carros',
  city: 'cidade',
  cities: 'cidades',
  community: 'comunidade',
  name: 'nome',
  team: 'equipe, time',
  minute: 'minuto',
  minutes: 'minutos',
  idea: 'ideia',
  ideas: 'ideias',
  kid: 'criança, garoto(a)',
  kids: 'crianças',
  body: 'corpo',
  information: 'informação, informações',
  parent: 'pai ou mãe',
  parents: 'pais (mãe e pai)',
  face: 'rosto, cara, encarar',
  level: 'nível',
  office: 'escritório',
  door: 'porta',
  health: 'saúde',
  person: 'pessoa',
  history: 'história (ciência/passado)',
  party: 'festa, partido',
  result: 'resultado',
  morning: 'manhã',
  mornings: 'manhãs',
  reason: 'razão, motivo',
  research: 'pesquisa',
  girl: 'garota, menina',
  guy: 'cara, rapaz',
  moment: 'momento',
  air: 'ar',
  teacher: 'professor, professora',
  teachers: 'professores',
  education: 'educação',
  music: 'música',
  song: 'música, canção',
  songs: 'músicas, canções',
  lyric: 'letra da música',
  lyrics: 'letras de música',
  food: 'comida, alimento',
  travel: 'viagem, viajar',
  lesson: 'lição, aula',
  class: 'aula, turma, classe',
  classroom: 'sala de aula',

  // Adjectives & Adverbs
  good: 'bom, boa, bem',
  well: 'bem, bom',
  better: 'melhor',
  best: 'o melhor, a melhor',
  new: 'novo, nova',
  first: 'primeiro, primeira',
  last: 'último, última',
  long: 'longo, comprido',
  great: 'ótimo, grande, excelente',
  own: 'próprio',
  old: 'velho, antigo, idoso',
  right: 'certo, correto, direito, direita',
  wrong: 'errado, incorreto',
  big: 'grande',
  high: 'alto, elevado',
  different: 'diferente',
  small: 'pequeno, reduzido',
  large: 'grande, amplo',
  next: 'próximo, seguinte',
  early: 'cedo, inicial',
  young: 'jovem',
  important: 'importante',
  public: 'público',
  bad: 'ruim, mau',
  worse: 'pior',
  worst: 'o pior, a pior',
  same: 'mesmo, igual',
  able: 'capaz, ábil',
  happy: 'feliz',
  beautiful: 'bonito, lindo, bela',
  pretty: 'bonito, bastante',
  dark: 'escuro, sombrio',
  bright: 'brilhante, claro',
  easy: 'fácil',
  hard: 'difícil, duro, pesado',
  fast: 'rápido',
  slow: 'lento, devagar',
  hot: 'quente',
  cold: 'frio',
  warm: 'morno, acolhedor',
  clean: 'limpo, limpar',
  dirty: 'sujo',
  simple: 'simples',
  complex: 'complexo',
  strong: 'forte',
  weak: 'fraco',
  true: 'verdadeiro, verdade',
  false: 'falso',
  rich: 'rico',
  poor: 'pobre',
  safe: 'seguro, cofre',
  dangerous: 'perigoso',
  nice: 'agradável, legal, simpático',
  kind: 'gentil, tipo, espécie',
  fun: 'divertido, diversão',
  funny: 'engraçado',
  ready: 'pronto, preparado',
  late: 'atrasado, tarde',
  now: 'agora',
  always: 'sempre',
  never: 'nunca, jamais',
  sometimes: 'às vezes, de vez em quando',
  often: 'frequentemente, muitas vezes',
  usually: 'geralmente, costuma',
  rarely: 'raramente',
  today: 'hoje',
  yesterday: 'ontem',
  tomorrow: 'amanhã',
  here: 'aqui, cá',
  there: 'lá, ali',
  very: 'muito',
  really: 'realmente, de fato',
  too: 'também, demais',
  also: 'também',
  already: 'já',
  still: 'ainda, calmo',
  yet: 'ainda, já',
  just: 'apenas, só, justo',
  only: 'apenas, único',
  again: 'de novo, novamente',
  almost: 'quase',
  together: 'juntos',
  maybe: 'talvez',
  perhaps: 'talvez, porventura',
  please: 'por favor, agradar',
  thanks: 'obrigado(a)',
  thank: 'agradecer',
  hello: 'olá',
  hi: 'oi',
  yes: 'sim',
  ok: 'está bem, ok',
  bye: 'tchau, adeus',
};

/**
 * Clean a string into lowercase alphabetic chars
 */
export function sanitizeWord(wordRaw: string): string {
  if (!wordRaw) return '';
  return wordRaw
    .toLowerCase()
    .replace(/[^a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/g, '')
    .trim();
}

/**
 * Perform intelligent stem matching against the built-in dictionary
 */
export function lookupDictionary(wordClean: string): string | null {
  if (!wordClean) return null;

  // 1. Exact match
  if (BUILTIN_DICTIONARY[wordClean]) {
    return BUILTIN_DICTIONARY[wordClean];
  }

  // 2. Plurals / -s / -es / -ies
  if (wordClean.endsWith('ies') && wordClean.length > 4) {
    const stem = wordClean.slice(0, -3) + 'y';
    if (BUILTIN_DICTIONARY[stem]) return BUILTIN_DICTIONARY[stem];
  }
  if (wordClean.endsWith('es') && wordClean.length > 4) {
    const stem = wordClean.slice(0, -2);
    if (BUILTIN_DICTIONARY[stem]) return BUILTIN_DICTIONARY[stem];
  }
  if (wordClean.endsWith('s') && wordClean.length > 3) {
    const stem = wordClean.slice(0, -1);
    if (BUILTIN_DICTIONARY[stem]) return BUILTIN_DICTIONARY[stem];
  }

  // 3. Past tense -ed / -d
  if (wordClean.endsWith('ed') && wordClean.length > 4) {
    const stem1 = wordClean.slice(0, -2); // e.g. walked -> walk
    if (BUILTIN_DICTIONARY[stem1]) return BUILTIN_DICTIONARY[stem1];
    const stem2 = wordClean.slice(0, -1); // e.g. liked -> like
    if (BUILTIN_DICTIONARY[stem2]) return BUILTIN_DICTIONARY[stem2];
  }

  // 4. Gerunds -ing
  if (wordClean.endsWith('ing') && wordClean.length > 5) {
    const stem1 = wordClean.slice(0, -3); // e.g. talking -> talk
    if (BUILTIN_DICTIONARY[stem1]) return BUILTIN_DICTIONARY[stem1];
    const stem2 = wordClean.slice(0, -3) + 'e'; // e.g. making -> make
    if (BUILTIN_DICTIONARY[stem2]) return BUILTIN_DICTIONARY[stem2];
  }

  // 5. Adverbs -ly
  if (wordClean.endsWith('ly') && wordClean.length > 4) {
    const stem = wordClean.slice(0, -2); // e.g. quickly -> quick
    if (BUILTIN_DICTIONARY[stem]) return BUILTIN_DICTIONARY[stem];
  }

  return null;
}

// Common Portuguese to English vocabulary for Brazilian Music and Conversation
export const PT_TO_EN_DICTIONARY: Record<string, string> = {
  olha: 'look, see',
  olhar: 'to look, gaze',
  coisa: 'thing',
  linda: 'beautiful, pretty',
  lindo: 'beautiful, handsome',
  mais: 'more, most',
  cheia: 'full (feminine)',
  cheio: 'full (masculine)',
  graça: 'grace, charm',
  menina: 'girl, young lady',
  menino: 'boy, young man',
  garota: 'girl',
  garoto: 'boy',
  moça: 'young woman, girl',
  moço: 'young man',
  vem: 'comes, is coming',
  passa: 'passes by, goes by',
  passar: 'to pass, pass by',
  doce: 'sweet, gentle',
  balanço: 'sway, swing, rhythm',
  balançado: 'swaying walk, movement',
  caminho: 'way, path, on the way',
  mar: 'sea, ocean',
  sol: 'sun, sunlight',
  ipanema: 'Ipanema (famous beach in Rio)',
  corpo: 'body',
  dourado: 'golden, tanned',
  poema: 'poem',
  poesia: 'poetry',
  já: 'already, ever',
  vi: 'saw, have seen',
  por: 'for, by, why',
  porque: 'because',
  sozinho: 'alone, lonely',
  sozinha: 'alone, lonely',
  tudo: 'everything, all',
  tão: 'so, as',
  triste: 'sad',
  beleza: 'beauty',
  existe: 'exists',
  minha: 'my, mine',
  meu: 'my, mine',
  soubesse: 'knew, had known',
  quando: 'when',
  mundo: 'world',
  inteirinho: 'whole, entire',
  inteiro: 'whole, full',
  enche: 'fills, fills up',
  fica: 'becomes, stays',
  amor: 'love',
  vida: 'life',
  viver: 'to live',
  tempo: 'time, weather',
  espaço: 'space',
  dor: 'pain, grief',
  perceber: 'to realize, perceive',
  apesar: 'despite, in spite of',
  feito: 'done, made',
  fizemos: 'did, have done',
  ainda: 'still, yet',
  somos: 'we are',
  mesmos: 'same (plural)',
  mesmo: 'same, really',
  vivemos: 'we live',
  como: 'like, as, how',
  nossos: 'our, ours',
  pais: 'parents',
  país: 'country',
  pergunta: 'asks, question',
  paixão: 'passion',
  digo: 'I say, tell',
  representando: 'representing',
  circulação: 'circulation, flow',
  sangue: 'blood',
  veias: 'veins',
  ama: 'loves',
  passado: 'past',
  vê: 'sees',
  novo: 'new',
  sempre: 'always',
  coração: 'heart',
  saudade: 'longing, yearning, nostalgia',
  saudades: 'longings, missing someone',
  cantar: 'to sing',
  canção: 'song',
  música: 'music, song',
  sorrir: 'to smile',
  sorriso: 'smile',
  abraço: 'hug, embrace',
  beijo: 'kiss',
  noite: 'night',
  dia: 'day',
  lua: 'moon',
  estrela: 'star',
  céu: 'sky, heaven',
  vento: 'wind',
  chuva: 'rain',
  falar: 'to speak, talk',
  ouvir: 'to hear, listen',
  sentir: 'to feel',
  sonho: 'dream',
  sonhar: 'to dream',
  querer: 'to want',
  quero: 'I want',
  saber: 'to know',
  sei: 'I know',
  nada: 'nothing',
  gente: 'people, us',
  amigo: 'friend',
  amiga: 'friend (female)',
  felicidade: 'happiness, joy',
  alegria: 'joy, gladness',
};

export function lookupPtToEnDictionary(word: string): string | null {
  const wordClean = word.toLowerCase().trim();
  if (!wordClean) return null;
  if (PT_TO_EN_DICTIONARY[wordClean]) return PT_TO_EN_DICTIONARY[wordClean];
  
  // Try strip plurals or simple suffixes in Portuguese
  if (wordClean.endsWith('s') && wordClean.length > 3) {
    const singular = wordClean.slice(0, -1);
    if (PT_TO_EN_DICTIONARY[singular]) return PT_TO_EN_DICTIONARY[singular];
  }
  return null;
}

// High-performance Memory Cache for Ultra-Fast Instant Translations (< 1ms)
const translationCache = new Map<string, string>();

/**
 * Universal Translation function for word, phrase, sentence or lyrics
 * Ultra-fast with instant memory caching, local dictionaries, and concurrent fallback racing.
 * Default target language is PORTUGUESE ('pt') as requested for Portuguese learning and translation.
 */
export async function translateText(
  text: string,
  sourceLang?: string,
  targetLang: string = 'pt'
): Promise<string> {
  const clean = text ? text.trim() : '';
  if (!clean) return '';

  const sl = sourceLang || 'auto';
  const tl = targetLang || 'pt';

  const cacheKey = `${sl}->${tl}:${clean.toLowerCase()}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // Single word local fast-path (0ms)
  const words = clean.split(/\s+/);
  if (words.length === 1) {
    const sanitized = sanitizeWord(clean);

    if (tl === 'pt') {
      const enMatch = lookupDictionary(sanitized);
      if (enMatch) {
        translationCache.set(cacheKey, enMatch);
        return enMatch;
      }
    } else if (tl === 'en') {
      const ptMatch = lookupPtToEnDictionary(sanitized);
      if (ptMatch) {
        translationCache.set(cacheKey, ptMatch);
        return ptMatch;
      }
    }
  }

  // Ultra-Fast Parallel Race: Run fastest reliable translation endpoints concurrently
  const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 2000): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return res;
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  };

  // Provider 1: Google GTX Endpoint (Ultra-fast ~40-100ms)
  const queryGoogleGtx = async (): Promise<string> => {
    const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(clean)}`;
    const res = await fetchWithTimeout(gUrl, {
      headers: {
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    }, 1800);
    if (!res.ok) throw new Error('GTX non-ok');
    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const result = data[0].map((item: any) => item[0]).filter(Boolean).join('');
      if (result && result.trim()) return result.trim();
    }
    throw new Error('GTX empty');
  };

  // Provider 2: Google Clients5 Endpoint (~60-120ms)
  const queryGoogleClients5 = async (): Promise<string> => {
    const cUrl = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${sl}&tl=${tl}&q=${encodeURIComponent(clean)}`;
    const res = await fetchWithTimeout(cUrl, {}, 1800);
    if (!res.ok) throw new Error('Clients5 non-ok');
    const data = await res.json();
    if (Array.isArray(data) && data[0] && typeof data[0] === 'string' && data[0].trim()) {
      return data[0].trim();
    }
    throw new Error('Clients5 empty');
  };

  // Provider 3: Server Fast Translate API
  const queryServerApi = async (): Promise<string> => {
    const res = await fetchWithTimeout('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: clean, sourceLang: sl, targetLang: tl })
    }, 2500);
    if (!res.ok) throw new Error('Server non-ok');
    const data = await res.json();
    if (data?.translation && data.translation.trim()) {
      return data.translation.trim();
    }
    throw new Error('Server empty');
  };

  // Provider 4: MyMemory API
  const queryMyMemory = async (): Promise<string> => {
    const langpair = `${sl === 'auto' ? 'en' : sl}|${tl}`;
    const mRes = await fetchWithTimeout(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=${langpair}`,
      {},
      2000
    );
    if (!mRes.ok) throw new Error('MyMemory non-ok');
    const mData = await mRes.json();
    if (mData?.responseData?.translatedText && mData.responseData.translatedText.trim()) {
      return mData.responseData.translatedText.trim();
    }
    throw new Error('MyMemory empty');
  };

  try {
    // Race the two fastest Google endpoints first for sub-100ms response time
    const fastestResult = await Promise.any([
      queryGoogleGtx(),
      queryGoogleClients5(),
      queryServerApi()
    ]);

    if (fastestResult && fastestResult.trim()) {
      translationCache.set(cacheKey, fastestResult);
      return fastestResult;
    }
  } catch (raceErr) {
    // If fast race failed, try secondary fallbacks
    try {
      const backupResult = await queryMyMemory();
      if (backupResult && backupResult.trim()) {
        translationCache.set(cacheKey, backupResult);
        return backupResult;
      }
    } catch (backupErr) {
      console.warn('All external translation providers timed out/failed:', backupErr);
    }
  }

  // Fallback to local dictionary
  if (words.length === 1) {
    const sanitized = sanitizeWord(clean);
    if (tl === 'pt') {
      const enMatch = lookupDictionary(sanitized);
      if (enMatch) return enMatch;
    } else {
      const ptMatch = lookupPtToEnDictionary(sanitized);
      if (ptMatch) return ptMatch;
    }
  }

  return clean;
}

