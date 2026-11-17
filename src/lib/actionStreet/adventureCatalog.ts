export const ADVENTURE_ITEMS: Record<string, { name: string; translation: string }> = {
  'subway-map': { name: 'Subway map', translation: 'Mapa do metrô' },
  'broadway-ticket': { name: 'Broadway ticket', translation: 'Ingresso da Broadway' },
};

export const ADVENTURE_PHRASES: Record<string, { phrase: string; translation: string }> = {
  'keep-the-change': { phrase: 'Keep the change!', translation: 'Fique com o troco!' },
  'sounds-great': { phrase: 'That sounds great!', translation: 'Isso parece ótimo!' },
  'you-bet': { phrase: 'You bet!', translation: 'Com certeza!' },
  'follow-the-signs': { phrase: 'Follow the signs.', translation: 'Siga as placas.' },
  'one-more-song': { phrase: 'One more song, please.', translation: 'Mais uma música, por favor.' },
};

export function getAdventureItem(itemId: string) {
  return ADVENTURE_ITEMS[itemId] ?? { name: itemId.replace(/-/g, ' '), translation: '' };
}

export function getAdventurePhrase(phraseId: string) {
  return ADVENTURE_PHRASES[phraseId] ?? { phrase: phraseId.replace(/-/g, ' '), translation: '' };
}
