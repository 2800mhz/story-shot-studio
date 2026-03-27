import type { RevisionInstruction, RevisionScope, EntityModification, StyleModification } from '../Types/Revision.types';
import type { EntityCatalog } from '../Types/Entity.types';

/**
 * Layer 1: Semantic Parser
 *
 * Transforms a raw user instruction string into a structured RevisionInstruction.
 * This is intentionally a heuristic/rule-based parser — it does not call the AI.
 * The AI is called later in the Execution Engine using the structured output here.
 */

// ─── Keyword Detection ───────────────────────────────────────────────────────

const STYLE_ASPECTS: Record<StyleModification['aspect'], string[]> = {
  color: ['renk', 'color', 'palette', 'palet', 'tone', 'ton', 'hue'],
  lighting: ['ışık', 'light', 'aydınlatma', 'gölge', 'shadow', 'exposure', 'brightness'],
  tone: ['atmosfer', 'mood', 'his', 'duygu', 'tonality', 'grimsi', 'soğuk', 'sıcak', 'melanchol'],
  camera: ['kamera', 'camera', 'lens', 'shot', 'angle', 'açı', 'composition', 'kompozisyon'],
  composition: ['frame', 'kadraj', 'framing', 'kırpma', 'crop', 'wide', 'close'],
  atmosphere: ['atmosfer', 'atmosphere', 'hava', 'sis', 'fog', 'mist', 'duman', 'smoke'],
};

const GLOBAL_SCOPE_PATTERNS = [
  /tüm (sahne|prompt)/i,
  /bütün (sahne|prompt)/i,
  /her (sahne|prompt|yerde)/i,
  /all (scenes?|prompts?)/i,
  /globally/i,
  /global olarak/i,
];

const ENTITY_SCOPE_PATTERNS = [
  /sadece (.+) (sahne|sahneleri|için)/i,
  /only .+ scenes?/i,
  /when .+ (is|appears?)/i,
  /(.+) olduğunda/i,
  /(.+) sahnelerinde/i,
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function detectStyleModifications(text: string): StyleModification[] {
  const modifications: StyleModification[] = [];
  const lowerText = text.toLowerCase();

  for (const [aspect, keywords] of Object.entries(STYLE_ASPECTS) as [StyleModification['aspect'], string[]][]) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      // Extract the surrounding phrase as the instruction
      const firstMatch = keywords.find(kw => lowerText.includes(kw));
      if (firstMatch) {
        const idx = lowerText.indexOf(firstMatch);
        const start = Math.max(0, idx - 20);
        const end = Math.min(text.length, idx + 60);
        modifications.push({
          aspect,
          instruction: text.slice(start, end).trim(),
        });
      }
    }
  }

  return modifications;
}

function detectEntityModifications(
  text: string,
  catalog?: EntityCatalog
): EntityModification[] {
  const modifications: EntityModification[] = [];

  if (!catalog) return modifications;

  // Check if any known entity name appears in the instruction
  for (const item of catalog.items) {
    if (text.toLowerCase().includes(item.name.toLowerCase())) {
      // Extract the portion describing the modification
      const idx = text.toLowerCase().indexOf(item.name.toLowerCase());
      const contextStart = Math.max(0, idx - 10);
      const contextEnd = Math.min(text.length, idx + item.name.length + 100);
      const snippet = text.slice(contextStart, contextEnd).trim();

      modifications.push({
        entityId: item.id,
        entityName: item.name,
        modification: snippet,
        onlyWhenPresent: true,
      });
    }
  }

  return modifications;
}

function determineScope(text: string, entityMods: EntityModification[]): RevisionScope {
  // If instruction explicitly mentions all scenes → global
  if (GLOBAL_SCOPE_PATTERNS.some(re => re.test(text))) return 'global';

  // If instruction targets a specific entity → entity
  if (entityMods.length > 0) return 'entity';

  // If instruction contains scene-type language → scene_type
  if (ENTITY_SCOPE_PATTERNS.some(re => re.test(text))) return 'entity';

  // Style-only instruction without entity → global style
  const styleMods = detectStyleModifications(text);
  if (styleMods.length > 0) return 'global';

  return 'global';
}

function buildIntentLabel(scope: RevisionScope, entityMods: EntityModification[], styleMods: StyleModification[]): string {
  if (scope === 'entity' && entityMods.length > 0) {
    return `Entity revision: ${entityMods.map(e => e.entityName).join(', ')}`;
  }
  if (scope === 'global' && styleMods.length > 0) {
    return `Global style: ${styleMods.map(s => s.aspect).join(', ')}`;
  }
  return 'General revision';
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Parse a free-form user revision instruction into a structured RevisionInstruction.
 *
 * @param rawText       The user's instruction text
 * @param catalog       Optional entity catalog — used to resolve entity references
 * @param targetEntityId Optional pre-selected entity the user is targeting
 */
export function parseRevisionInstruction(
  rawText: string,
  catalog?: EntityCatalog,
  targetEntityId?: string
): RevisionInstruction {
  const entityMods = detectEntityModifications(rawText, catalog);
  const styleMods = detectStyleModifications(rawText);
  const scope = determineScope(rawText, entityMods);

  // If a target entity was explicitly pre-selected, inject it
  let resolvedEntityId = targetEntityId;
  let resolvedEntityName: string | undefined;

  if (targetEntityId && catalog) {
    const found = catalog.items.find(item => item.id === targetEntityId);
    resolvedEntityName = found?.name;
    // Make sure this entity is in entityMods even if its name isn't literally in rawText
    if (found && !entityMods.find(e => e.entityId === targetEntityId)) {
      entityMods.push({
        entityId: targetEntityId,
        entityName: found.name,
        modification: rawText,
        onlyWhenPresent: true,
      });
    }
  }

  if (!resolvedEntityId && entityMods.length > 0) {
    resolvedEntityId = entityMods[0].entityId;
    resolvedEntityName = entityMods[0].entityName;
  }

  const finalScope: RevisionScope = resolvedEntityId ? 'entity' : scope;

  return {
    rawText,
    targetEntityId: resolvedEntityId,
    targetEntityName: resolvedEntityName,
    scope: finalScope,
    styleModifications: styleMods.length > 0 ? styleMods : undefined,
    entityModifications: entityMods.length > 0 ? entityMods : undefined,
    narrativeConstraints: {
      preserveEmotionalArc: true,
      preserveTimelapseSequence: true,
      preserveCharacterProgression: true,
    },
    intentLabel: buildIntentLabel(finalScope, entityMods, styleMods),
  };
}
