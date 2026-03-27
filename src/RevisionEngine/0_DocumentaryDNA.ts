import type { SceneCard, Character, Location, TimeContext, PromptCard } from '@/types';
import type { DocumentaryDNA, DocumentaryEntity, TimePeriod, NarrativeArc } from '../Types/Documentary.types';
import type { EntityCatalog, EntityCatalogItem, EntityAppearance } from '../Types/Entity.types';

/**
 * Layer 0: Documentary DNA
 *
 * Builds and manages the structural metadata of a documentary project:
 * - Temporal periods (eras / golden age / present)
 * - Geographic regions
 * - Entity inventory across all scenes
 * - Narrative arcs (timelapse, transformation, emotional climax)
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

function detectShotType(shotType: string): 'wide' | 'medium' | 'closeup' | 'atmospheric' {
  const s = (shotType || '').toLowerCase();
  if (s.includes('wide') || s.includes('establishing') || s.includes('geniş')) return 'wide';
  if (s.includes('close') || s.includes('yakın') || s.includes('detail')) return 'closeup';
  if (s.includes('atmosf') || s.includes('aerial') || s.includes('drone')) return 'atmospheric';
  return 'medium';
}

function detectTimePeriods(sceneCards: SceneCard[], timeContexts: TimeContext[]): TimePeriod[] {
  const periods: TimePeriod[] = timeContexts.map(tc => ({
    id: tc.id,
    label: tc.label,
    era: tc.era || tc.label,
    colorPalette: tc.lighting,
    atmosphere: tc.historicalNotes,
  }));

  // If no time contexts exist, infer from scene visual notes
  if (periods.length === 0 && sceneCards.length > 0) {
    const TIMELAPSE_RE = /timelapse|zaman|yüzyıl|nesil|çağ|dönem|era/i;
    const PAST_RE = /eski|antik|kadim|ancient|historical|tarih/i;
    const PRESENT_RE = /bugün|günümüz|modern|şimdi|present|today/i;

    const hasPast = sceneCards.some(s => PAST_RE.test(s.text + ' ' + s.visualNote));
    const hasPresent = sceneCards.some(s => PRESENT_RE.test(s.text + ' ' + s.visualNote));
    const hasTimelapse = sceneCards.some(s => TIMELAPSE_RE.test(s.visualNote));

    if (hasPast) {
      periods.push({ id: 'auto-past', label: 'Historical Era', era: 'Ancient / Historical' });
    }
    if (hasTimelapse) {
      periods.push({ id: 'auto-timelapse', label: 'Transition', era: 'Transitional' });
    }
    if (hasPresent) {
      periods.push({ id: 'auto-present', label: 'Present Day', era: 'Contemporary', isCurrentState: true });
    }
  }

  return periods;
}

function detectNarrativeArcs(sceneCards: SceneCard[]): NarrativeArc[] {
  const arcs: NarrativeArc[] = [];
  const timelapseScenes: string[] = [];
  const transformationScenes: string[] = [];

  for (const sc of sceneCards) {
    const note = (sc.visualNote || '').toLowerCase();
    const text = (sc.text || '').toLowerCase();

    if (note.startsWith('timelapse:') || /timelapse|zaman geçişi|yüzyıl boyu/.test(note)) {
      timelapseScenes.push(sc.id);
    }
    if (/dönüş|transform|değiş|büyü|sihir|magic|morph|evolv|metamorf/.test(text)) {
      transformationScenes.push(sc.id);
    }
  }

  if (timelapseScenes.length > 0) {
    arcs.push({
      id: 'arc-timelapse',
      label: 'Timelapse Sequence',
      sceneIds: timelapseScenes,
      arcType: 'timelapse',
      protectionLevel: 'strict',
      description: 'Detected timelapse / time-passage scenes. Temporal order must be preserved.',
    });
  }

  if (transformationScenes.length > 0) {
    arcs.push({
      id: 'arc-transformation',
      label: 'Transformation Arc',
      sceneIds: transformationScenes,
      arcType: 'transformation',
      protectionLevel: 'moderate',
      description: 'Scenes depicting physical or symbolic transformation.',
    });
  }

  // Detect emotional climax: last 10% of scenes often form the emotional peak
  if (sceneCards.length >= 10) {
    const climbStart = Math.floor(sceneCards.length * 0.85);
    const climaxScenes = sceneCards.slice(climbStart).map(s => s.id);
    arcs.push({
      id: 'arc-climax',
      label: 'Emotional Climax',
      sceneIds: climaxScenes,
      arcType: 'emotional',
      protectionLevel: 'moderate',
      description: 'Final scenes forming the emotional resolution of the documentary.',
    });
  }

  return arcs;
}

function buildDocumentaryEntities(
  characters: Character[],
  locations: Location[],
  sceneCards: SceneCard[]
): DocumentaryEntity[] {
  const entities: DocumentaryEntity[] = [];

  for (const char of characters) {
    const sceneAppearances = sceneCards
      .filter(sc => sc.characterIds?.includes(char.id))
      .map(sc => sc.id);

    entities.push({
      id: char.id,
      name: char.name,
      type: 'character',
      canonicalDescription: char.visualDescription || char.name,
      sceneAppearances,
      visualRole: char.isCrowd ? 'supporting' : 'protagonist',
      isSpiritual: /tanrı|ruh|spirit|deity|ethereal|celestial|ilah|kutsal/i.test(
        char.name + ' ' + (char.visualDescription || '')
      ),
    });
  }

  for (const loc of locations) {
    const sceneAppearances = sceneCards
      .filter(sc => sc.locationIds?.includes(loc.id))
      .map(sc => sc.id);

    entities.push({
      id: loc.id,
      name: loc.name,
      type: loc.architecture ? 'architecture' : 'location',
      canonicalDescription: loc.visualDescription || loc.name,
      sceneAppearances,
      visualRole: 'environmental',
    });
  }

  return entities;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Build the Documentary DNA from the current project state.
 */
export function buildDocumentaryDNA(
  projectId: string,
  episodeId: string,
  title: string,
  sceneCards: SceneCard[],
  characters: Character[],
  locations: Location[],
  timeContexts: TimeContext[],
  masterPrompt?: string
): DocumentaryDNA {
  return {
    projectId,
    episodeId,
    title,
    genre: 'documentary',
    periods: detectTimePeriods(sceneCards, timeContexts),
    regions: [],
    entities: buildDocumentaryEntities(characters, locations, sceneCards),
    narrativeArcs: detectNarrativeArcs(sceneCards),
    globalStyleNotes: masterPrompt,
    lastAnalyzedAt: new Date().toISOString(),
  };
}

/**
 * Build an EntityCatalog from sceneCards and DNA entities.
 * The catalog maps each entity to every prompt that contains a reference to it.
 */
export function buildEntityCatalog(
  sceneCards: SceneCard[],
  dnaEntities: DocumentaryEntity[]
): EntityCatalog {
  const items: EntityCatalogItem[] = dnaEntities.map(entity => {
    const appearances: EntityAppearance[] = [];

    for (const sc of sceneCards) {
      // Determine if entity appears in this scene
      const isInScene =
        entity.sceneAppearances.includes(sc.id) ||
        sc.prompts.some(p =>
          p.promptText.toLowerCase().includes(entity.name.toLowerCase())
        );

      if (!isInScene) continue;

      // Find which prompts reference the entity
      const promptIds = sc.prompts
        .filter(p => p.promptText.toLowerCase().includes(entity.name.toLowerCase()))
        .map(p => p.id);

      // Determine the predominant shot context for this scene
      const firstPrompt = sc.prompts[0] as PromptCard | undefined;
      const contextType = firstPrompt ? detectShotType(firstPrompt.shotType) : 'medium';

      appearances.push({
        sceneId: sc.id,
        sceneNumber: sc.sceneNumber,
        promptIds,
        contextType,
        presenceStrength: promptIds.length > 0 ? 'primary' : 'implied',
        promptExcerpt: sc.prompts[0]?.promptText.slice(0, 120),
      });
    }

    return {
      id: entity.id,
      name: entity.name,
      type: entity.type === 'architecture' ? 'architecture' : entity.type,
      canonicalDescription: entity.canonicalDescription,
      appearances,
      revisionHistory: [],
      isProtected: entity.isProtected ?? false,
      tags: entity.isSpiritual ? ['spiritual'] : [],
    };
  });

  return {
    items,
    builtAt: new Date().toISOString(),
    totalScenes: sceneCards.length,
  };
}

/**
 * Find all scenes that contain a given entity (by id or name).
 */
export function findScenesForEntity(
  entityId: string,
  entityName: string,
  catalog: EntityCatalog,
  sceneCards: SceneCard[]
): SceneCard[] {
  const catalogItem = catalog.items.find(
    item => item.id === entityId || item.name.toLowerCase() === entityName.toLowerCase()
  );

  if (!catalogItem) {
    // Fallback: text search in prompts
    const nameLower = entityName.toLowerCase();
    return sceneCards.filter(sc =>
      sc.prompts.some(p => p.promptText.toLowerCase().includes(nameLower))
    );
  }

  const sceneIdSet = new Set(catalogItem.appearances.map(a => a.sceneId));
  return sceneCards.filter(sc => sceneIdSet.has(sc.id));
}
