import type { AgentOperation } from '@/lib/agentSchema';
import type { Character, SceneCard } from '@/types';

function getSceneLabel(scene: SceneCard | undefined): string {
  if (!scene) return 'Sahne';
  const n = scene.sceneNumber ?? '?';
  const t = (scene.text || '').trim();
  const short = t.length > 48 ? `${t.slice(0, 48)}...` : t;
  return short ? `Sahne ${n}: ${short}` : `Sahne ${n}`;
}

function getCharacterLabel(character: Character | undefined): string {
  return character?.name?.trim() ? character.name.trim() : 'Karakter';
}

export function summarizeAgentOperation(args: {
  operation: AgentOperation;
  scenesById?: Map<string, SceneCard>;
  charactersById?: Map<string, Character>;
}): { title: string; lines: string[] } {
  const { operation, scenesById, charactersById } = args;

  switch (operation.type) {
    case 'update_character': {
      const character = charactersById?.get(operation.characterId);
      const keys = Object.keys(operation.changes || {});
      const prettyKeys = keys.length > 0 ? keys.join(', ') : 'alanlar';
      return {
        title: `${getCharacterLabel(character)} guncellendi`,
        lines: [`Degisen alanlar: ${prettyKeys}`],
      };
    }
    case 'update_location': {
      const keys = Object.keys(operation.changes || {});
      return {
        title: 'Mekan guncellendi',
        lines: keys.length ? [`Degisen alanlar: ${keys.join(', ')}`] : [],
      };
    }
    case 'update_scene_note': {
      const scene = scenesById?.get(operation.sceneId);
      return { title: `${getSceneLabel(scene)} notu guncellendi`, lines: [] };
    }
    case 'update_scene_visual_note': {
      const scene = scenesById?.get(operation.sceneId);
      return { title: `${getSceneLabel(scene)} gorsel notu guncellendi`, lines: [] };
    }
    case 'update_prompt_text': {
      const scene = scenesById?.get(operation.sceneId);
      return { title: `${getSceneLabel(scene)} prompt'u guncellendi`, lines: [] };
    }
    case 'mark_prompt_stale': {
      const scene = scenesById?.get(operation.sceneId);
      return {
        title: `${getSceneLabel(scene)} yeniden uretim icin isaretlendi`,
        lines: operation.reason ? [operation.reason] : [],
      };
    }
    case 'attach_character_to_scene': {
      const scene = scenesById?.get(operation.sceneId);
      const character = charactersById?.get(operation.characterId);
      return {
        title: `${getCharacterLabel(character)} -> ${getSceneLabel(scene)}`,
        lines: ['Sahneye eklendi'],
      };
    }
    case 'detach_character_from_scene': {
      const scene = scenesById?.get(operation.sceneId);
      const character = charactersById?.get(operation.characterId);
      return {
        title: `${getCharacterLabel(character)} -> ${getSceneLabel(scene)}`,
        lines: ['Sahneden cikarildi'],
      };
    }
    case 'add_reference_to_scene': {
      const scene = scenesById?.get(operation.sceneId);
      return { title: `${getSceneLabel(scene)} referans eklendi`, lines: [] };
    }
    case 'remove_reference_from_scene': {
      const scene = scenesById?.get(operation.sceneId);
      return { title: `${getSceneLabel(scene)} referans kaldirildi`, lines: [] };
    }
    case 'add_scene_reference':
      return { title: 'Yeni referans eklendi', lines: [] };
    case 'add_character':
      return { title: 'Yeni karakter eklendi', lines: [operation.character.name] };
    case 'remove_character':
      return { title: 'Karakter silindi', lines: [operation.characterId] };
    default:
      return { title: operation.type, lines: [] };
  }
}

export function summarizeAgentOperationSet(operationSet: {
  operations: AgentOperation[];
  stalePromptSceneIds: string[];
}) {
  const counts = {
    promptUpdates: 0,
    staleMarks: 0,
    characterUpdates: 0,
    sceneNoteUpdates: 0,
    visualNoteUpdates: 0,
    other: 0,
  };

  for (const operation of operationSet.operations) {
    switch (operation.type) {
      case 'update_prompt_text':
        counts.promptUpdates++;
        break;
      case 'mark_prompt_stale':
        counts.staleMarks++;
        break;
      case 'update_character':
        counts.characterUpdates++;
        break;
      case 'update_scene_note':
        counts.sceneNoteUpdates++;
        break;
      case 'update_scene_visual_note':
        counts.visualNoteUpdates++;
        break;
      default:
        counts.other++;
        break;
    }
  }

  const pills: string[] = [];
  if (counts.characterUpdates) pills.push(`${counts.characterUpdates} karakter`);
  if (counts.promptUpdates) pills.push(`${counts.promptUpdates} prompt guncellemesi`);
  if (counts.sceneNoteUpdates) pills.push(`${counts.sceneNoteUpdates} sahne notu`);
  if (counts.visualNoteUpdates) pills.push(`${counts.visualNoteUpdates} gorsel not`);
  if (operationSet.stalePromptSceneIds.length) pills.push(`${operationSet.stalePromptSceneIds.length} stale sahne`);
  if (counts.other) pills.push(`${counts.other} ek islem`);

  return pills;
}
