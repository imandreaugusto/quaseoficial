import type { ActionStreetState } from '../../types/actionStreet';
import {
  adjustReputation,
  addInventoryItem,
  appendJournalEntry,
  awardXp,
  createJournalEntry,
  learnPhrase,
  removeInventoryItem,
  unlockRoute,
} from './progression';

export interface LocalDialogueChoice {
  id: string;
  text: string | string[];
  feedback: string | string[];
  journalLabel: string;
  costDollars?: number;
  requiresItem?: string;
  consumeItem?: string;
  giveItem?: string;
  reputationChange?: number;
  mood?: 'friendly' | 'annoyed' | 'impressed';
  xp?: number;
  learnPhrase?: string;
  unlockRoute?: string;
}

export interface LocalDialogue {
  id: string;
  cityId: string;
  spotId: string;
  character: string;
  line: string | string[];
  requiresRoute?: string;
  choices: LocalDialogueChoice[];
}

export interface DialogueVariables {
  playerName: string;
  lastItem: string;
  city: string;
}

export interface PresentedDialogueChoice extends Omit<LocalDialogueChoice, 'text' | 'feedback'> {
  text: string;
  feedback: string;
}

export interface PresentedDialogue extends Omit<LocalDialogue, 'line' | 'choices'> {
  line: string;
  choices: PresentedDialogueChoice[];
}

const dialogueLoaders: Record<string, () => Promise<LocalDialogue[]>> = {
  ny: async () => (await import('../../data/actionStreetDialogues.ny.json')).default as LocalDialogue[],
};
export async function loadCityDialogues(cityId: string): Promise<LocalDialogue[]> {
  return dialogueLoaders[cityId]?.() ?? [];
}

export function resolveDialogueText(
  value: string | string[],
  variables: DialogueVariables,
  random: () => number = Math.random
): string {
  const variants = Array.isArray(value) ? value : [value];
  const selected = variants[Math.min(variants.length - 1, Math.floor(random() * variants.length))] ?? '';
  return selected.replace(/\{\{(playerName|lastItem|city)\}\}/g, (_match, key: keyof DialogueVariables) => variables[key] || '');
}

export function presentDialogue(
  dialogue: LocalDialogue,
  variables: DialogueVariables,
  random: () => number = Math.random
): PresentedDialogue {
  return {
    ...dialogue,
    line: resolveDialogueText(dialogue.line, variables, random),
    choices: dialogue.choices.map((choice) => ({
      ...choice,
      text: resolveDialogueText(choice.text, variables, random),
      feedback: resolveDialogueText(choice.feedback, variables, random),
    })),
  };
}

export function getDialogueForSpot(
  state: ActionStreetState,
  cityId: string,
  spotId: string,
  dialogues: LocalDialogue[] = []
): LocalDialogue | null {
  return dialogues.find((dialogue) =>
    dialogue.cityId === cityId
    && dialogue.spotId === spotId
    && !state.dialogueChoices[dialogue.id]
    && (!dialogue.requiresRoute || state.unlockedRoutes.includes(dialogue.requiresRoute))
    && dialogue.choices.some((choice) =>
      (!choice.requiresItem || state.inventory.includes(choice.requiresItem))
      && (choice.costDollars === undefined || state.balance >= choice.costDollars)
    )
  ) ?? null;
}

export function getAvailableDialogueChoices(dialogue: PresentedDialogue, state: ActionStreetState): PresentedDialogueChoice[];
export function getAvailableDialogueChoices(dialogue: LocalDialogue, state: ActionStreetState): LocalDialogueChoice[];
export function getAvailableDialogueChoices(dialogue: LocalDialogue | PresentedDialogue, state: ActionStreetState) {
  return dialogue.choices.filter((choice) =>
    !choice.requiresItem || state.inventory.includes(choice.requiresItem)
  );
}

export function applyDialogueChoice(
  state: ActionStreetState,
  dialogue: LocalDialogue | PresentedDialogue,
  choice: LocalDialogueChoice | PresentedDialogueChoice,
  now = Date.now()
): ActionStreetState {
  if (state.dialogueChoices[dialogue.id]) throw new Error('Esta conversa já foi concluída.');
  if (!dialogue.choices.some((candidate) => candidate.id === choice.id)) throw new Error('Esta resposta não pertence à conversa.');
  if (choice.requiresItem && !state.inventory.includes(choice.requiresItem)) throw new Error('O item necessário não está na mochila.');
  const cost = Math.max(0, Math.floor(choice.costDollars ?? 0));
  if (state.balance < cost) throw new Error('Você não tem Action Dollars suficientes para essa escolha.');

  let next: ActionStreetState = {
    ...state,
    balance: state.balance - cost,
    dialogueChoices: { ...state.dialogueChoices, [dialogue.id]: choice.id },
    moods: {
      ...state.moods,
      [dialogue.id]: choice.mood
        ?? ((choice.reputationChange ?? 0) >= 2 ? 'impressed' : (choice.reputationChange ?? 0) < 0 ? 'annoyed' : 'friendly'),
    },
  };
  if (choice.consumeItem) next = removeInventoryItem(next, choice.consumeItem);
  if (choice.giveItem) next = addInventoryItem(next, choice.giveItem);
  if (choice.reputationChange) next = adjustReputation(next, dialogue.cityId, choice.reputationChange);
  if (choice.learnPhrase) {
    next = learnPhrase(next, choice.learnPhrase);
    next = appendJournalEntry(
      next,
      createJournalEntry(dialogue.cityId, 'phrase', `Learned "${choice.learnPhrase}".`, choice.learnPhrase, now)
    );
  }
  if (choice.unlockRoute) next = unlockRoute(next, choice.unlockRoute);
  if (choice.xp) next = awardXp(next, choice.xp);
  return appendJournalEntry(
    next,
    createJournalEntry(dialogue.cityId, 'dialogue', choice.journalLabel, dialogue.character, now)
  );
}
