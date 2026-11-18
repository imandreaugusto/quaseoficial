export const PAGER_TRIGGER_DELAY_MS = 120_000;
export const PAGER_UNLOCK_DELAY_MS = 86_400_000;
export const SECRET_MISSION_COUNT = 50;

export interface SecretMission {
  id: string;
  cityId: string;
  informant: string;
  role: string;
  briefing: string;
  secretPhrase: string;
  meaning: string;
  wrongOptions: [string, string, string];
  rewardDollars: number;
}

export async function loadSecretMissions(): Promise<SecretMission[]> {
  const { default: missions } = await import('../../data/secretMissions.json');
  if (!Array.isArray(missions) || missions.length !== SECRET_MISSION_COUNT) {
    throw new Error(`O Pager Secreto precisa de ${SECRET_MISSION_COUNT} missões válidas.`);
  }
  const ids = new Set<string>();
  const validated = missions.map((mission) => {
    if (
      typeof mission.id !== 'string'
      || ids.has(mission.id)
      || typeof mission.cityId !== 'string'
      || typeof mission.informant !== 'string'
      || typeof mission.role !== 'string'
      || typeof mission.briefing !== 'string'
      || typeof mission.secretPhrase !== 'string'
      || typeof mission.meaning !== 'string'
      || !Array.isArray(mission.wrongOptions)
      || mission.wrongOptions.length !== 3
      || !mission.wrongOptions.every((option) => typeof option === 'string' && option !== mission.secretPhrase)
      || new Set(mission.wrongOptions).size !== mission.wrongOptions.length
      || typeof mission.rewardDollars !== 'number'
      || !Number.isFinite(mission.rewardDollars)
      || mission.rewardDollars < 0
    ) {
      throw new Error('Uma missão do Pager Secreto está incompleta ou duplicada.');
    }
    ids.add(mission.id);
    return mission as SecretMission;
  });
  return validated;
}

export function getSecretMissionOptions(
  mission: SecretMission,
  random: () => number = Math.random
): string[] {
  const options = [mission.secretPhrase, ...mission.wrongOptions];
  for (let index = options.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [options[index], options[swapIndex]] = [options[swapIndex], options[index]];
  }
  return options;
}
