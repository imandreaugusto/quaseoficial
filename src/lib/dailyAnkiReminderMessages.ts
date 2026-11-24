export const DAILY_ANKI_REMINDER_MESSAGES = [
  'Pausa pro almoço? Que tal estudar uma expressão no Brazilian Anki?',
  'Seu intervalo chegou. Bora fazer uma revisão rápida no Brazilian Anki?',
  'Dois minutos podem render uma expressão nova. Vamos praticar?',
  'Uma pausa leve para o almoço e uma frase em inglês para levar com você.',
  'Que tal aproveitar o almoço para rever uma expressão do seu dia a dia?',
  'Seu inglês também pode avançar entre uma tarefa e outra. Abra o Brazilian Anki.',
  'Uma carta, uma lembrança a mais. Faça sua revisão de hoje no Brazilian Anki.',
  'Hora de uma pausa: será que você lembra o significado da próxima frase?',
  'Almoço com um toque de inglês? Tem uma revisão rápida esperando por você.',
  'Seu próximo passo no inglês pode levar só alguns minutos. Vamos?',
  'No ritmo que funciona para você: uma expressão de cada vez no Brazilian Anki.',
  'Que tal descobrir se você já pegou o jeito daquela expressão?',
  'Uma pausa no meio do dia pode ser o momento perfeito para uma revisão curta.',
  'Vamos manter o inglês em movimento? Uma carta nova espera no Brazilian Anki.',
  'Entre o almoço e a próxima tarefa, reserve um instante para praticar inglês.',
];

const normalizeMessage = (message: string) =>
  message.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

export const selectDailyAnkiReminderMessage = (recentMessages: string[], dayNumber: number) => {
  const recent = new Set(recentMessages.map(normalizeMessage));
  const candidates = DAILY_ANKI_REMINDER_MESSAGES.filter((message) => !recent.has(normalizeMessage(message)));
  const pool = candidates.length ? candidates : DAILY_ANKI_REMINDER_MESSAGES;
  const index = ((dayNumber % pool.length) + pool.length) % pool.length;
  return pool[index];
};
