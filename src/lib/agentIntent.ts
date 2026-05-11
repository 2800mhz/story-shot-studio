import type { Character, Location, SceneCard, SceneReference, TimeContext } from '@/types';
import { agentIntentSchema, type AgentIntent, type AgentOperationSet } from './agentSchema';

export const AGENT_INTENT_SYSTEM_PROMPT = `You are a Story Shot Video edit-intent parser.
Return ONLY valid JSON.

Your job is NOT to emit low-level operations.
Your job is to understand the user's edit request and convert it into a compact intent object.

Rules:
1. Infer the most likely target from project state and focus hints.
2. For character appearance edits, use target.type="character".
3. For clothing / wardrobe requests, use edit.kind="wardrobe".
4. For scene text note changes, use edit.kind="scene_note".
5. For scene visual note changes, use edit.kind="visual_note".
6. For location look / atmosphere changes, use edit.kind="location_update".
7. If the user refers to a prompt directly, use target.type="prompt" and edit.kind="prompt_rewrite".
8. Fill patch.character / patch.scene / patch.location whenever possible.
9. Keep instruction short and normalized in English.
10. Never return operations.

JSON shape:
{
  "summary": "short Turkish summary",
  "target": {
    "type": "character|scene|location|prompt|reference|episode|unknown",
    "ref": "best target name if known",
    "sceneNumber": 12,
    "promptHint": "pinned|all|first|unknown"
  },
  "edit": {
    "kind": "wardrobe|character_appearance|scene_note|visual_note|location_update|prompt_rewrite|reference_attach|general",
    "instruction": "normalized edit instruction"
  },
  "scope": "auto|single_scene|linked_scenes|episode",
  "patch": {
    "character": {
      "clothing": "...",
      "visualDescription": "...",
      "hair": "...",
      "beard": "...",
      "physicalFeatures": "...",
      "age": "...",
      "ethnicity": "..."
    },
    "scene": {
      "note": "...",
      "visualNote": "..."
    },
    "location": {
      "visualDescription": "...",
      "architecture": "...",
      "atmosphere": "...",
      "period": "...",
      "geography": "..."
    },
    "prompt": {
      "instruction": "..."
    }
  }
}`;

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function buildAgentIntentPrompt(args: {
  command: string;
  activeSceneId: string | null;
  selectedEntityId?: string | null;
  sceneCards: SceneCard[];
  characters: Character[];
  locations: Location[];
  timeContexts: TimeContext[];
  references: SceneReference[];
}) {
  const {
    command,
    activeSceneId,
    selectedEntityId,
    sceneCards,
    characters,
    locations,
    timeContexts,
    references,
  } = args;

  const activeScene = activeSceneId ? sceneCards.find((scene) => scene.id === activeSceneId) ?? null : null;

  const compactState = {
    focus: {
      activeSceneId,
      activeSceneNumber: activeScene?.sceneNumber ?? null,
      activeSceneText: activeScene?.text?.slice(0, 160) ?? null,
      selectedEntityId: selectedEntityId ?? null,
    },
    characters: characters.map((character) => ({
      id: character.id,
      name: character.name,
      role: character.role,
      clothing: character.clothing,
      visualDescription: character.visualDescription,
    })),
    locations: locations.map((location) => ({
      id: location.id,
      name: location.name,
      atmosphere: location.atmosphere,
      architecture: location.architecture,
      visualDescription: location.visualDescription,
    })),
    scenes: sceneCards.map((scene) => ({
      id: scene.id,
      sceneNumber: scene.sceneNumber,
      text: scene.text.slice(0, 120),
      characterIds: scene.characterIds,
      locationIds: scene.locationIds,
      hasPinnedPrompt: scene.prompts.some((prompt) => prompt.isPinned),
    })),
    timeContexts: timeContexts.map((timeContext) => ({
      id: timeContext.id,
      label: timeContext.label,
      era: timeContext.era,
    })),
    references: references.map((reference) => ({
      id: reference.id,
      referenceType: reference.referenceType,
      description: reference.description,
    })),
  };

  return [
    `USER COMMAND: ${command}`,
    '',
    'PROJECT SNAPSHOT:',
    JSON.stringify(compactState, null, 2),
  ].join('\n');
}

export function parseAgentIntent(text: string): AgentIntent {
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const candidate = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  const parsed = JSON.parse(candidate);
  return agentIntentSchema.parse(parsed);
}

function resolveCharacter(characters: Character[], ref?: string) {
  if (!ref) return null;
  const normalizedRef = normalizeText(ref);
  return characters.find((character) => normalizeText(character.name).includes(normalizedRef) || normalizedRef.includes(normalizeText(character.name))) ?? null;
}

function resolveLocation(locations: Location[], ref?: string) {
  if (!ref) return null;
  const normalizedRef = normalizeText(ref);
  return locations.find((location) => normalizeText(location.name).includes(normalizedRef) || normalizedRef.includes(normalizeText(location.name))) ?? null;
}

function resolveScene(sceneCards: SceneCard[], intent: AgentIntent, activeSceneId: string | null) {
  if (typeof intent.target.sceneNumber === 'number') {
    return sceneCards.find((scene) => scene.sceneNumber === intent.target.sceneNumber) ?? null;
  }
  if (activeSceneId) {
    return sceneCards.find((scene) => scene.id === activeSceneId) ?? null;
  }
  return null;
}

export function planAgentIntent(args: {
  intent: AgentIntent;
  sceneCards: SceneCard[];
  characters: Character[];
  locations: Location[];
  activeSceneId: string | null;
  selectedEntityId?: string | null;
}): AgentOperationSet | null {
  const { intent, sceneCards, characters, locations, activeSceneId, selectedEntityId } = args;

  const selectedCharacter =
    selectedEntityId ? characters.find((character) => character.id === selectedEntityId) ?? null : null;
  const selectedLocation =
    selectedEntityId ? locations.find((location) => location.id === selectedEntityId) ?? null : null;

  if (intent.target.type === 'character' && (intent.edit.kind === 'wardrobe' || intent.edit.kind === 'character_appearance')) {
    const character = resolveCharacter(characters, intent.target.ref) ?? selectedCharacter;
    if (!character) return null;

    const characterPatch = intent.patch.character ?? {};
    if (Object.keys(characterPatch).length === 0) return null;

    const affectedScenes = sceneCards.filter((scene) => scene.characterIds.includes(character.id));

    return {
      summary: intent.summary || `${character.name} için görünüş güncellemesi hazırlandı.`,
      reasoning: 'Karakter revizyonu intent katmanında çözüldü ve bağlı sahnelere uygulanmak üzere planlandı.',
      affectedSceneIds: affectedScenes.map((scene) => scene.id),
      stalePromptSceneIds: [],
      operations: [
        {
          type: 'update_character',
          characterId: character.id,
          changes: characterPatch,
        },
      ],
    };
  }

  if (intent.target.type === 'scene' && intent.edit.kind === 'visual_note') {
    const scene = resolveScene(sceneCards, intent, activeSceneId);
    const visualNote = intent.patch.scene?.visualNote;
    if (!scene || !visualNote) return null;

    return {
      summary: intent.summary || `Sahne ${scene.sceneNumber} görsel notu güncellendi.`,
      reasoning: 'Sahne görsel not revizyonu doğrudan intent planından üretildi.',
      affectedSceneIds: [scene.id],
      stalePromptSceneIds: [],
      operations: [
        {
          type: 'update_scene_visual_note',
          sceneId: scene.id,
          visualNote,
        },
      ],
    };
  }

  if (intent.target.type === 'scene' && intent.edit.kind === 'scene_note') {
    const scene = resolveScene(sceneCards, intent, activeSceneId);
    const note = intent.patch.scene?.note;
    if (!scene || !note) return null;

    return {
      summary: intent.summary || `Sahne ${scene.sceneNumber} notu güncellendi.`,
      reasoning: 'Sahne not revizyonu doğrudan intent planından üretildi.',
      affectedSceneIds: [scene.id],
      stalePromptSceneIds: [],
      operations: [
        {
          type: 'update_scene_note',
          sceneId: scene.id,
          note,
        },
      ],
    };
  }

  if (intent.target.type === 'location' && intent.edit.kind === 'location_update') {
    const location = resolveLocation(locations, intent.target.ref) ?? selectedLocation;
    const locationPatch = intent.patch.location ?? {};
    if (!location || Object.keys(locationPatch).length === 0) return null;

    const affectedScenes = sceneCards.filter((scene) => scene.locationIds.includes(location.id));

    return {
      summary: intent.summary || `${location.name} için mekan güncellemesi hazırlandı.`,
      reasoning: 'Mekan revizyonu intent katmanında çözüldü ve bağlı sahnelere uygulanmak üzere planlandı.',
      affectedSceneIds: affectedScenes.map((scene) => scene.id),
      stalePromptSceneIds: [],
      operations: [
        {
          type: 'update_location',
          locationId: location.id,
          changes: locationPatch,
        },
      ],
    };
  }

  if (selectedCharacter && (intent.edit.kind === 'wardrobe' || intent.edit.kind === 'character_appearance')) {
    const characterPatch = intent.patch.character ?? {};
    if (Object.keys(characterPatch).length === 0) return null;

    const affectedScenes = sceneCards.filter((scene) => scene.characterIds.includes(selectedCharacter.id));

    return {
      summary: intent.summary || `${selectedCharacter.name} icin guncelleme hazirlandi.`,
      reasoning: 'Secili karakter uzerinden intent cozuldu ve bagli sahnelere uygulanmak uzere planlandi.',
      affectedSceneIds: affectedScenes.map((scene) => scene.id),
      stalePromptSceneIds: [],
      operations: [
        {
          type: 'update_character',
          characterId: selectedCharacter.id,
          changes: characterPatch,
        },
      ],
    };
  }

  return null;
}
