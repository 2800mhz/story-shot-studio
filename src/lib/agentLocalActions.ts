import type { AgentOperationSet } from './agentSchema';

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceBeardLanguage(text: string): string {
  return text
    .replace(/\bfull white beard extending 8-10cm below jaw\b/gi, 'clean-shaven face')
    .replace(/\bfull white beard\b/gi, 'clean-shaven face')
    .replace(/\bsparse white beard extending 4-5cm below jaw\b/gi, 'clean-shaven face')
    .replace(/\bsparse white beard\b/gi, 'clean-shaven face')
    .replace(/\bdense snow-white beard extending 10cm below jaw\b/gi, 'clean-shaven face')
    .replace(/\bwhite beard edge visible\b/gi, 'clean-shaven jawline visible')
    .replace(/\bbeard texture\b/gi, 'jawline texture')
    .replace(/\bbeard\b/gi, 'clean-shaven face');
}

export function tryBuildLocalAgentOperationSet(args: {
  command: string;
  state: {
    characters: Array<{ id: string; name: string; beard?: string; visualDescription?: string }>;
    sceneCards: Array<{
      id: string;
      sceneNumber: number;
      text: string;
      characterIds: string[];
      prompts: Array<{ id: string; promptText: string }>;
    }>;
  };
}): AgentOperationSet | null {
  const { command, state } = args;
  const normalizedCommand = normalizeText(command);

  const beardRemovalIntent =
    /sakal(ı|i)?\s+(olmasin|olmasın|kaldir|kaldır|kaldiralim|kaldıralım|sil|yok et)/.test(normalizedCommand) ||
    /sakalsiz|sakalsız|clean-shaven/.test(normalizedCommand);

  if (!beardRemovalIntent) return null;

  const matchedCharacter = state.characters.find((character) => {
    const normalizedName = normalizeText(character.name);
    return normalizedName && normalizedCommand.includes(normalizedName);
  });

  if (!matchedCharacter) return null;

  const affectedScenes = state.sceneCards.filter((scene) => scene.characterIds.includes(matchedCharacter.id));
  const operations: AgentOperationSet['operations'] = [];

  const nextVisualDescription = matchedCharacter.visualDescription
    ? replaceBeardLanguage(matchedCharacter.visualDescription)
        .replace(/\bpatchy clean-shaven face\b/gi, 'clean-shaven face')
        .replace(/\bclean-shaven face face\b/gi, 'clean-shaven face')
    : matchedCharacter.visualDescription;

  operations.push({
    type: 'update_character',
    characterId: matchedCharacter.id,
    changes: {
      beard: 'clean-shaven, no beard',
      ...(nextVisualDescription ? { visualDescription: nextVisualDescription } : {}),
    },
  });

  for (const scene of affectedScenes) {
    let promptChanged = false;
    for (const prompt of scene.prompts) {
      const nextPromptText = replaceBeardLanguage(prompt.promptText);
      if (nextPromptText !== prompt.promptText) {
        promptChanged = true;
        operations.push({
          type: 'update_prompt_text',
          sceneId: scene.id,
          promptId: prompt.id,
          promptText: nextPromptText,
        });
      }
    }

    if (!promptChanged) {
      operations.push({
        type: 'mark_prompt_stale',
        sceneId: scene.id,
        reason: 'Karakterin sakal bilgisi değişti; prompt yeniden gözden geçirilmeli.',
      });
    }
  }

  const stalePromptSceneIds = affectedScenes
    .filter((scene) => !operations.some((op) => op.type === 'update_prompt_text' && op.sceneId === scene.id))
    .map((scene) => scene.id);

  return {
    summary: `${matchedCharacter.name} artık sakalsız. ${affectedScenes.length} sahnedeki bağlı promptlar güncellendi${stalePromptSceneIds.length > 0 ? `, ${stalePromptSceneIds.length} sahne de yeniden üretim için işaretlendi` : ''}.`,
    reasoning: 'Karakter-scene ilişkileri doğrudan state üzerinden çözüldü; ilgili promptlarda sakal dili yerel olarak güncellendi.',
    affectedSceneIds: affectedScenes.map((scene) => scene.id),
    stalePromptSceneIds,
    operations,
  };
}
