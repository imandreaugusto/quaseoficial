export interface MasterCard {
  card_id: string;
  front: string;
  back: string;
  example: string;
  tip?: string;
  category: string;
}

export const MASTER_DECK: MasterCard[] = [
  {
    card_id: 'take-your-time',
    front: 'Take your time.',
    back: 'Não tenha pressa.',
    example: 'Take your time choosing a book. We are not in a hurry.',
    category: 'Expression',
  },
  {
    card_id: 'get-the-hang-of-it',
    front: "You'll get the hang of it.",
    back: 'Você vai pegar o jeito.',
    example: "Keep practicing the new app. You'll get the hang of it.",
    category: 'Expression',
  },
  {
    card_id: 'actually',
    front: 'Actually, I live near the beach.',
    back: 'Na verdade, eu moro perto da praia.',
    example: 'I thought you lived downtown. Actually, I moved last year.',
    tip: 'Actually significa “na verdade”, não “atualmente”. Para “atualmente”, use currently ou nowadays.',
    category: 'False friend',
  },
  {
    card_id: 'pretend',
    front: 'He pretended not to hear the question.',
    back: 'Ele fingiu não ouvir a pergunta.',
    example: 'The children pretended the sofa was a spaceship.',
    tip: 'Pretend significa “fingir”. “Pretender” no sentido de ter intenção é intend.',
    category: 'False friend',
  },
  {
    card_id: 'that-sounds-good',
    front: 'That sounds good to me.',
    back: 'Para mim, parece ótimo.',
    example: 'We could meet for coffee at ten. That sounds good to me.',
    category: 'Everyday English',
  },
  {
    card_id: 'i-am-used-to',
    front: "I'm used to getting up early.",
    back: 'Estou acostumado a acordar cedo.',
    example: "She's used to working with an international team.",
    tip: 'Depois de be used to, use um substantivo ou verbo com -ing.',
    category: 'Everyday English',
  },
  {
    card_id: 'keep-me-posted',
    front: 'Keep me posted.',
    back: 'Vá me mantendo informado.',
    example: 'Keep me posted about your interview tomorrow.',
    category: 'Expression',
  },
  {
    card_id: 'it-is-up-to-you',
    front: "It's up to you.",
    back: 'Você decide.',
    example: 'We can eat at home or go out. It is up to you.',
    category: 'Expression',
  },
];
