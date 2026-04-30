import { agentOperationSetSchema, type AgentOperationSet } from './agentSchema';

const JSON_OPEN = '<AGENT_RESULT_JSON>';
const JSON_CLOSE = '</AGENT_RESULT_JSON>';

function normalizeOperation(op: any) {
  if (!op || typeof op !== 'object') return op;

  const base = op.payload && typeof op.payload === 'object' && !Array.isArray(op.payload)
    ? { ...op.payload, type: op.type }
    : { ...op };

  const rawType = typeof base.type === 'string' ? base.type : '';

  switch (rawType) {
    case 'update_character_clothing':
    case 'update_character_appearance':
    case 'update_character_visual':
    case 'update_character_visuals':
    case 'update_character_details':
      return {
        type: 'update_character',
        characterId: base.characterId,
        changes: base.changes && typeof base.changes === 'object'
          ? base.changes
          : {
              clothing: base.clothing,
              visualDescription: base.visualDescription,
              hair: base.hair,
              beard: base.beard,
              age: base.age,
              physicalFeatures: base.physicalFeatures,
            },
      };

    case 'update_prompt':
    case 'rewrite_prompt':
    case 'revise_prompt':
    case 'update_scene_prompt':
      return {
        type: 'update_prompt_text',
        sceneId: base.sceneId,
        promptId: base.promptId,
        promptText: base.promptText || base.text || base.newText,
      };

    case 'mark_scene_stale':
    case 'mark_stale':
    case 'mark_scene_for_regeneration':
      return {
        type: 'mark_prompt_stale',
        sceneId: base.sceneId,
        promptId: base.promptId,
        reason: base.reason,
      };

    case 'update_visual_note':
      return {
        type: 'update_scene_visual_note',
        sceneId: base.sceneId,
        visualNote: base.visualNote || base.note || base.text,
      };

    case 'update_note':
      return {
        type: 'update_scene_note',
        sceneId: base.sceneId,
        note: base.note || base.text,
      };

    case 'attach_reference_to_scene':
      return {
        type: 'add_reference_to_scene',
        sceneId: base.sceneId,
        referenceId: base.referenceId,
      };

    case 'detach_reference_from_scene':
      return {
        type: 'remove_reference_from_scene',
        sceneId: base.sceneId,
        referenceId: base.referenceId,
      };

    default:
      break;
  }

  if (base.characterId && (base.changes || base.clothing || base.visualDescription || base.hair || base.beard || base.age || base.ethnicity || base.physicalFeatures)) {
    return {
      type: 'update_character',
      characterId: base.characterId,
      changes: base.changes && typeof base.changes === 'object'
        ? base.changes
        : {
            ...(base.clothing ? { clothing: base.clothing } : {}),
            ...(base.visualDescription ? { visualDescription: base.visualDescription } : {}),
            ...(base.hair ? { hair: base.hair } : {}),
            ...(base.beard ? { beard: base.beard } : {}),
            ...(base.age ? { age: base.age } : {}),
            ...(base.ethnicity ? { ethnicity: base.ethnicity } : {}),
            ...(base.physicalFeatures ? { physicalFeatures: base.physicalFeatures } : {}),
          },
    };
  }

  if (base.locationId && (base.changes || base.visualDescription || base.architecture || base.atmosphere || base.period || base.geography)) {
    return {
      type: 'update_location',
      locationId: base.locationId,
      changes: base.changes && typeof base.changes === 'object'
        ? base.changes
        : {
            ...(base.visualDescription ? { visualDescription: base.visualDescription } : {}),
            ...(base.architecture ? { architecture: base.architecture } : {}),
            ...(base.atmosphere ? { atmosphere: base.atmosphere } : {}),
            ...(base.period ? { period: base.period } : {}),
            ...(base.geography ? { geography: base.geography } : {}),
          },
    };
  }

  if (base.sceneId && base.promptId && (base.promptText || base.text || base.newText)) {
    return {
      type: 'update_prompt_text',
      sceneId: base.sceneId,
      promptId: base.promptId,
      promptText: base.promptText || base.text || base.newText,
    };
  }

  if (base.sceneId && (base.visualNote || base.note || base.text) && /visual/i.test(rawType || '')) {
    return {
      type: 'update_scene_visual_note',
      sceneId: base.sceneId,
      visualNote: base.visualNote || base.note || base.text,
    };
  }

  if (base.sceneId && (base.note || base.text) && /note/i.test(rawType || '')) {
    return {
      type: 'update_scene_note',
      sceneId: base.sceneId,
      note: base.note || base.text,
    };
  }

  if (base.sceneId && (base.reason || /stale|regen/i.test(rawType || ''))) {
    return {
      type: 'mark_prompt_stale',
      sceneId: base.sceneId,
      promptId: base.promptId,
      reason: base.reason,
    };
  }

  return base;
}

export function extractAgentResultBlock(text: string): string | null {
  const start = text.indexOf(JSON_OPEN);
  const end = text.indexOf(JSON_CLOSE);
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start + JSON_OPEN.length, end).trim();
}

export function stripAgentResultBlock(text: string): string {
  const block = extractAgentResultBlock(text);
  if (!block) return text.trim();
  return text.replace(`${JSON_OPEN}${block}${JSON_CLOSE}`, '').trim();
}

export function parseAgentOperationSet(text: string): AgentOperationSet {
  const block = extractAgentResultBlock(text) ?? text.trim();
  const cleaned = block
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);

    const normalized = (() => {
      if (!parsed || typeof parsed !== 'object') return parsed;
      const ops = Array.isArray((parsed as any).operations) ? (parsed as any).operations : [];
      const normalizedOps = ops.map((op: any) => normalizeOperation(op));
      return { ...(parsed as any), operations: normalizedOps };
    })();

    const result = agentOperationSetSchema.safeParse(normalized);
    if (!result.success) {
      console.error('Agent JSON validation failed:', result.error.format(), normalized);
      throw new Error(`JSON yapısı geçersiz: ${result.error.issues.map((i) => i.message).join(', ')}`);
    }

    return result.data;
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error('Yapay zeka geçersiz bir JSON formatı üretti. Lütfen tekrar deneyin.');
    }
    throw e;
  }
}
