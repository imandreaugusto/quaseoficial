import dialogueData from '../../data/actionStreetDialogues.json';
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
  text: string;
  feedback: string;
  journalLabel: string;
  costDollars?: number;
  requiresItem?: string;
  consumeItem?: string;
  giveItem?: string;
  reputationChange?: number;
  xp?: number;
  learnPhrase?: string;
  unlockRoute?: string;
}

export interface LocalDialogue {
  id: string;
  cityId: string;
  spotId: string;
  character: string;
  line: string;
  requiresRoute?: string;
  choices: LocalDialogueChoice[];
}

const dialogues = dialogueData as LocalDialogue[];

export function getDialogueForSpot(state: ActionStreetState, cityId: string, spotId: string): LocalDialogue | null {
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

export function getAvailableDialogueChoices(dialogue: LocalDialogue, state: ActionStreetState): LocalDialogueChoice[] {
  return dialogue.choices.filter((choice) =>
    !choice.requiresItem || state.inventory.includes(choice.requiresItem)
  );
}

export function applyDialogueChoice(
  state: ActionStreetState,
  dialogue: LocalDialogue,
  choice: LocalDialogueChoice,
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
