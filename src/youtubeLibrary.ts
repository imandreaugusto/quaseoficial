export interface YouTubeLibraryItem {
  id: string;
  title: string;
  artist?: string;
  category: string;
  description?: string;
  embedId: string;
  youtubeUrl: string;
  lyrics?: string;
  translatedLyrics?: string;
  notes?: string;
  createdAt?: string;
}

export const DEFAULT_YOUTUBE_LIBRARY: YouTubeLibraryItem[] = [
  {
    id: 'yt-music-1',
    title: 'Garota de Ipanema',
    artist: 'Tom Jobim & Vinicius de Moraes',
    category: 'Música',
    description: 'Um clássico da Bossa Nova para praticar ritmo, entonação e vocabulário.',
    embedId: 'c5Q91s0336U',
    youtubeUrl: 'https://www.youtube.com/watch?v=c5Q91s0336U',
    lyrics: `Olha que coisa mais linda, mais cheia de graça
É ela, menina, que vem e que passa
Num doce balanço a caminho do mar

Moça do corpo dourado, do sol de Ipanema
O seu balançado é mais que um poema
É a coisa mais linda que eu já vi passar

Ah, por que estou tão sozinho?
Ah, por que tudo é tão triste?
Ah, a beleza que existe
A beleza que não é só minha
Que também passa sozinha

Ah, se ela soubesse que quando ela passa
O mundo inteirinho se enche de graça
E fica mais lindo por causa do amor`,
    translatedLyrics: `Look what a beautiful thing, so full of grace
It is she, the girl who comes and goes by
In a sweet swaying rhythm on her way to the sea

Girl with the golden body, from the sun of Ipanema
Her swaying walk is more than a poem
It is the most beautiful thing I have ever seen pass by

Ah, why am I so alone?
Ah, why is everything so sad?
Ah, the beauty that exists
The beauty that is not only mine
That also passes by alone

Ah, if she only knew that when she passes by
The whole entire world fills with grace
And becomes more beautiful because of love`,
    notes: 'Trabalhar entonação poética, encontros vocálicos e vocabulário carioca.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'yt-music-2',
    title: 'Como Nossos Pais',
    artist: 'Elis Regina',
    category: 'Música',
    description: 'Poesia marcante da MPB. Prática de tempos verbais e interpretação.',
    embedId: '0-X233E5318',
    youtubeUrl: 'https://www.youtube.com/watch?v=0-X233E5318',
    lyrics: `Não posso reter o tempo
Mas não quero parar no espaço
Minha dor é perceber que apesar de termos feito tudo o que fizemos
Ainda somos os mesmos e vivemos como nossos pais

Você me pergunta pela minha paixão
Digo que estou representando a minha circulação
E que esse sangue em minhas veias é o mesmo de 1968

Mas é você que ama o passado e que não vê
Que o novo sempre vem`,
    translatedLyrics: `I cannot hold back time
But I do not want to stop in space
My grief is realizing that despite having done all that we did
We are still the same and live like our parents

You ask me about my passion
I tell you that I am representing my own blood circulation
And that this blood in my veins is the same as in 1968

But it is you who loves the past and cannot see
That the new always arrives`,
    notes: 'Foco na interpretação de texto e uso de conectivos.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'yt-lesson-1',
    title: 'Aprenda Português do Brasil - Pronúncia e Conversação Nativa',
    category: 'Aulas',
    description: 'Vídeos práticos para desenvolver fluência no português brasileiro.',
    embedId: 'lS1j3Xg5z7U',
    youtubeUrl: 'https://www.youtube.com/watch?v=lS1j3Xg5z7U',
    lyrics: '',
    translatedLyrics: '',
    notes: 'Vídeo para treino de fonética e sons nasais.',
    createdAt: new Date().toISOString(),
  },
];
