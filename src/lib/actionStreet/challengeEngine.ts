import challengeData from '../../data/actionStreetChallenges.json';
import type { ActionStreetState } from '../../types/actionStreet';
import { adjustReputation, appendJournalEntry, awardXp, createJournalEntry } from './progression';

export interface LocalChallengeOption {
  text: string;
  correct: boolean;
  response: string;
}

export interface LocalChallenge {
  id: string;
  kind?: 'conversation' | 'listening';
  character: string;
  line: string;
  audioText?: string;
  tip: string;
  options: LocalChallengeOption[];
}

const challenges = challengeData as LocalChallenge[];
export const CHALLENGE_REWARD_DOLLARS = 15;
export const CHALLENGE_REWARD_XP = 25;

export function chooseLocalChallenge(previousChallengeId?: string): LocalChallenge {
  const choices = challenges.filter((challenge) => challenge.id !== previousChallengeId);
  const pool = choices.length > 0 ? choices : challenges;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function applyChallengeResult(
  state: ActionStreetState,
  cityId: string,
  challenge: LocalChallenge,
  option: LocalChallengeOption | null,
  now = Date.now()
): ActionStreetState {
  if (option && !challenge.options.some((candidate) => candidate.text === option.text)) {
    throw new Error('Esta resposta não pertence ao desafio.');
  }

  let next = state;
  if (option?.correct) {
    next = awardXp(next, CHALLENGE_REWARD_XP);
    next = adjustReputation(next, cityId, 1);
    next = { ...next, balance: next.balance + CHALLENGE_REWARD_DOLLARS };
  }
  return appendJournalEntry(
    next,
    createJournalEntry(
      cityId,
      'challenge',
      option?.correct ? 'You completed a street conversation challenge.' : 'You tried a street conversation challenge.',
      `${challenge.id}:${option ? option.correct ? 'success' : 'try-again' : 'timeout'}`,
      now
    )
  );
}
