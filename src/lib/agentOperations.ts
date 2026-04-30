import type { Character, Location, SceneCard, SceneReference, TimeContext } from '@/types';
import type { AgentOperationSet } from './agentSchema';

export interface AgentApplyState {
  sceneCards: SceneCard[];
  characters: Character[];
  locations: Location[];
  timeContexts: TimeContext[];
  references: SceneReference[];
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceInsensitive(source: string, from: string, to: string) {
  if (!from.trim()) return source;
  return source.replace(new RegExp(escapeRegExp(from), 'gi'), to);
}

function buildCharacterReplacementPairs(character: Character, changes: Partial<Character>) {
  const pairs: Array<{ from: string; to: string }> = [];
  const keys: Array<keyof Character> = [
    'name',
    'visualDescription',
    'age',
    'ethnicity',
    'clothing',
    'physicalFeatures',
    'hair',
    'beard',
  ];

  for (const key of keys) {
    const nextValue = changes[key];
    const prevValue = character[key];
    if (typeof prevValue === 'string' && typeof nextValue === 'string' && prevValue.trim() && nextValue.trim() && prevValue !== nextValue) {
      pairs.push({ from: prevValue, to: nextValue });
    }
  }

  return pairs;
}

function buildLocationReplacementPairs(location: Location, changes: Partial<Location>) {
  const pairs: Array<{ from: string; to: string }> = [];
  const keys: Array<keyof Location> = [
    'name',
    'visualDescription',
    'period',
    'geography',
    'architecture',
    'atmosphere',
  ];

  for (const key of keys) {
    const nextValue = changes[key];
    const prevValue = location[key];
    if (typeof prevValue === 'string' && typeof nextValue === 'string' && prevValue.trim() && nextValue.trim() && prevValue !== nextValue) {
      pairs.push({ from: prevValue, to: nextValue });
    }
  }

  return pairs;
}

function patchPromptText(promptText: string, replacements: Array<{ from: string; to: string }>) {
  let nextText = promptText;
  let changed = false;

  for (const replacement of replacements) {
    const updated = replaceInsensitive(nextText, replacement.from, replacement.to);
    if (updated !== nextText) {
      nextText = updated;
      changed = true;
    }
  }

  return { text: nextText, changed };
}

function buildCharacterFallbackDetails(changes: Partial<Character>) {
  const segments: string[] = [];
  if (changes.clothing?.trim()) segments.push(`wearing ${changes.clothing.trim()}`);
  if (changes.hair?.trim()) segments.push(`hair: ${changes.hair.trim()}`);
  if (changes.beard?.trim()) segments.push(`beard: ${changes.beard.trim()}`);
  if (changes.physicalFeatures?.trim()) segments.push(`physical features: ${changes.physicalFeatures.trim()}`);
  return segments.join(', ');
}

function buildLocationFallbackDetails(changes: Partial<Location>) {
  const segments: string[] = [];
  if (changes.visualDescription?.trim()) segments.push(changes.visualDescription.trim());
  if (changes.architecture?.trim()) segments.push(`architecture: ${changes.architecture.trim()}`);
  if (changes.atmosphere?.trim()) segments.push(`atmosphere: ${changes.atmosphere.trim()}`);
  if (changes.period?.trim()) segments.push(`period: ${changes.period.trim()}`);
  return segments.join(', ');
}

function injectBeforeSuffix(promptText: string, detail: string) {
  if (!detail.trim()) return { text: promptText, changed: false };
  if (promptText.toLocaleLowerCase('en-US').includes(detail.toLocaleLowerCase('en-US'))) {
    return { text: promptText, changed: false };
  }

  const suffixMatch = promptText.match(/\s--ar\b[\s\S]*$/i);
  if (!suffixMatch) {
    return { text: `${promptText.trim()}, ${detail}`.trim(), changed: true };
  }

  const suffix = suffixMatch[0];
  const body = promptText.slice(0, promptText.length - suffix.length).trim().replace(/[,\s]+$/, '');
  return {
    text: `${body}, ${detail}${suffix}`,
    changed: true,
  };
}

function markSceneStale(scene: SceneCard, reason: string, promptId?: string): SceneCard {
  const promptIds = promptId ? [promptId] : scene.prompts.map((prompt) => prompt.id);

  return {
    ...scene,
    promptsNeedRefresh: true,
    staleReasons: unique([...(scene.staleReasons ?? []), reason]),
    prompts: scene.prompts.map((prompt) => {
      if (!promptIds.includes(prompt.id)) return prompt;
      return {
        ...prompt,
        isStale: true,
        staleReason: reason,
      };
    }),
  };
}

export function applyAgentOperations(state: AgentApplyState, operationSet: AgentOperationSet): AgentApplyState {
  let nextState: AgentApplyState = {
    sceneCards: state.sceneCards.map((scene) => ({
      ...scene,
      prompts: scene.prompts.map((prompt) => ({ ...prompt })),
      staleReasons: scene.staleReasons ? [...scene.staleReasons] : [],
    })),
    characters: state.characters.map((character) => ({ ...character })),
    locations: state.locations.map((location) => ({ ...location })),
    timeContexts: state.timeContexts.map((timeContext) => ({ ...timeContext })),
    references: state.references.map((reference) => ({ ...reference, assignedSceneIds: [...reference.assignedSceneIds] })),
  };

  for (const operation of operationSet.operations) {
    switch (operation.type) {
      case 'update_scene_note':
        nextState.sceneCards = nextState.sceneCards.map((scene) =>
          scene.id === operation.sceneId
            ? markSceneStale({ ...scene, note: operation.note }, 'Scene note updated')
            : scene
        );
        break;

      case 'update_scene_visual_note':
        nextState.sceneCards = nextState.sceneCards.map((scene) =>
          scene.id === operation.sceneId
            ? markSceneStale({ ...scene, visualNote: operation.visualNote }, 'Scene visual note updated')
            : scene
        );
        break;

      case 'update_prompt_text':
        nextState.sceneCards = nextState.sceneCards.map((scene) => {
          if (scene.id !== operation.sceneId) return scene;
          return {
            ...scene,
            promptsNeedRefresh: false,
            prompts: scene.prompts.map((prompt) =>
              prompt.id === operation.promptId
                ? {
                    ...prompt,
                    promptText: operation.promptText,
                    versions: [...prompt.versions, operation.promptText],
                    isStale: false,
                    staleReason: undefined,
                  }
                : prompt
            ),
          };
        });
        break;

      case 'mark_prompt_stale':
        nextState.sceneCards = nextState.sceneCards.map((scene) =>
          scene.id === operation.sceneId
            ? markSceneStale(scene, operation.reason || 'Agent updated related state', operation.promptId)
            : scene
        );
        break;

      case 'update_character':
        {
          const previousCharacter = nextState.characters.find((character) => character.id === operation.characterId);
          const replacements = previousCharacter
            ? buildCharacterReplacementPairs(previousCharacter, operation.changes)
            : [];

        nextState.characters = nextState.characters.map((character) =>
          character.id === operation.characterId ? { ...character, ...operation.changes } : character
        );
          nextState.sceneCards = nextState.sceneCards.map((scene) => {
            if (!scene.characterIds.includes(operation.characterId)) return scene;

            let promptChanged = false;
            const nextPrompts = scene.prompts.map((prompt) => {
              const result = patchPromptText(prompt.promptText, replacements);
              const fallback = !result.changed
                ? injectBeforeSuffix(prompt.promptText, buildCharacterFallbackDetails(operation.changes))
                : { text: result.text, changed: false };
              const finalText = result.changed ? result.text : fallback.text;
              const didChange = result.changed || fallback.changed;
              if (!didChange) return prompt;
              promptChanged = true;
              return {
                ...prompt,
                promptText: finalText,
                versions: [...prompt.versions, finalText],
                isStale: false,
                staleReason: undefined,
              };
            });

            if (promptChanged) {
              return {
                ...scene,
                promptsNeedRefresh: false,
                prompts: nextPrompts,
                staleReasons: (scene.staleReasons ?? []).filter((reason) => reason !== 'Character attributes updated'),
              };
            }

            return markSceneStale(scene, 'Character attributes updated');
          });
        }
        break;

      case 'remove_character':
        nextState.characters = nextState.characters.filter((character) => character.id !== operation.characterId);
        nextState.sceneCards = nextState.sceneCards.map((scene) => {
          if (!scene.characterIds.includes(operation.characterId)) return scene;
          return markSceneStale(
            {
              ...scene,
              characterIds: scene.characterIds.filter((characterId) => characterId !== operation.characterId),
            },
            'Character removed from scene'
          );
        });
        break;

      case 'add_character': {
        const newCharacter: Character = {
          id: operation.character.id || `char-${crypto.randomUUID()}`,
          name: operation.character.name,
          role: operation.character.role,
          visualDescription: operation.character.visualDescription,
          age: operation.character.age,
          ethnicity: operation.character.ethnicity,
          clothing: operation.character.clothing,
          physicalFeatures: operation.character.physicalFeatures,
          hair: operation.character.hair,
          beard: operation.character.beard,
        };
        nextState.characters = [...nextState.characters, newCharacter];
        break;
      }

      case 'update_location':
        {
          const previousLocation = nextState.locations.find((location) => location.id === operation.locationId);
          const replacements = previousLocation
            ? buildLocationReplacementPairs(previousLocation, operation.changes)
            : [];

        nextState.locations = nextState.locations.map((location) =>
          location.id === operation.locationId ? { ...location, ...operation.changes } : location
        );
          nextState.sceneCards = nextState.sceneCards.map((scene) => {
            if (!scene.locationIds.includes(operation.locationId)) return scene;

            let promptChanged = false;
            const nextPrompts = scene.prompts.map((prompt) => {
              const result = patchPromptText(prompt.promptText, replacements);
              const fallback = !result.changed
                ? injectBeforeSuffix(prompt.promptText, buildLocationFallbackDetails(operation.changes))
                : { text: result.text, changed: false };
              const finalText = result.changed ? result.text : fallback.text;
              const didChange = result.changed || fallback.changed;
              if (!didChange) return prompt;
              promptChanged = true;
              return {
                ...prompt,
                promptText: finalText,
                versions: [...prompt.versions, finalText],
                isStale: false,
                staleReason: undefined,
              };
            });

            if (promptChanged) {
              return {
                ...scene,
                promptsNeedRefresh: false,
                prompts: nextPrompts,
                staleReasons: (scene.staleReasons ?? []).filter((reason) => reason !== 'Location attributes updated'),
              };
            }

            return markSceneStale(scene, 'Location attributes updated');
          });
        }
        break;

      case 'attach_character_to_scene':
        nextState.sceneCards = nextState.sceneCards.map((scene) =>
          scene.id === operation.sceneId
            ? markSceneStale(
                {
                  ...scene,
                  characterIds: unique([...scene.characterIds, operation.characterId]),
                },
                'Character attached to scene'
              )
            : scene
        );
        break;

      case 'detach_character_from_scene':
        nextState.sceneCards = nextState.sceneCards.map((scene) =>
          scene.id === operation.sceneId
            ? markSceneStale(
                {
                  ...scene,
                  characterIds: scene.characterIds.filter((characterId) => characterId !== operation.characterId),
                },
                'Character detached from scene'
              )
            : scene
        );
        break;

      case 'add_reference_to_scene':
        nextState.references = nextState.references.map((reference) =>
          reference.id === operation.referenceId
            ? { ...reference, assignedSceneIds: unique([...reference.assignedSceneIds, operation.sceneId]) }
            : reference
        );
        nextState.sceneCards = nextState.sceneCards.map((scene) =>
          scene.id === operation.sceneId ? markSceneStale(scene, 'Reference attached to scene') : scene
        );
        break;

      case 'remove_reference_from_scene':
        nextState.references = nextState.references.map((reference) =>
          reference.id === operation.referenceId
            ? { ...reference, assignedSceneIds: reference.assignedSceneIds.filter((sceneId) => sceneId !== operation.sceneId) }
            : reference
        );
        nextState.sceneCards = nextState.sceneCards.map((scene) =>
          scene.id === operation.sceneId ? markSceneStale(scene, 'Reference removed from scene') : scene
        );
        break;

      case 'add_scene_reference': {
        const newReference: SceneReference = {
          id: operation.reference.id || crypto.randomUUID(),
          episodeId: '',
          filePath: operation.reference.filePath || '',
          fileUrl: operation.reference.fileUrl || '',
          description: operation.reference.description || '',
          referenceType: operation.reference.referenceType,
          aiAnalysis: operation.reference.aiAnalysis,
          assignedSceneIds: operation.reference.assignedSceneIds || [],
          createdAt: new Date().toISOString(),
        };
        nextState.references = [...nextState.references, newReference];
        break;
      }
    }
  }

  for (const sceneId of operationSet.stalePromptSceneIds) {
    nextState.sceneCards = nextState.sceneCards.map((scene) =>
      scene.id === sceneId ? markSceneStale(scene, 'Agent marked scene for regeneration') : scene
    );
  }

  return nextState;
}
