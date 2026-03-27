import type { SceneCard, PromptCard } from '@/types';
import type { ShotContext, PresenceStrength } from '../Types/Entity.types';
import type { NarrativeArcType, TemporalPosition, EmotionalTone } from '../Types/Narrative.types';

/**
 * A universal profile describing the narrative and visual context of a scene.
 */
export interface SceneProfile {
  sceneId: string;
  sceneNumber: number;
  /** Detected shot / scene type */
  sceneType: 'establishing' | 'action' | 'character_moment' | 'spiritual' | 'timelapse' | 'landscape' | 'detail';
  /** Dominant shot context derived from prompt types */
  dominantShotContext: ShotContext;
  /** Detected temporal position */
  temporalPosition: TemporalPosition;
  /** Detected emotional tone */
  emotionalTone: EmotionalTone;
  /** Detected narrative arc type */
  narrativeArcType: NarrativeArcType;
  /** Whether this scene is a timelapse */
  isTimelapse: boolean;
  /** Whether this scene contains spiritual / abstract entities */
  hasSpiritualContent: boolean;
  /** IDs of character entities present */
  characterIds: string[];
  /** IDs of location entities present */
  locationIds: string[];
  /** Free-text entity names detected in prompt text */
  detectedEntityNames: string[];
  /** Things that must be preserved during revision */
  revisionBoundaries: string[];
  /** How strongly each prompt references entities */
  promptProfiles: PromptProfile[];
}

export interface PromptProfile {
  promptId: string;
  shotType: string;
  shotContext: ShotContext;
  /** Entity names explicitly mentioned in this prompt */
  entityMentions: string[];
  /** Short excerpt from the prompt text */
  textExcerpt: string;
  /** Estimated presence strength of the primary entity */
  entityPresenceStrength: PresenceStrength;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function detectShotContext(shotType: string): ShotContext {
  const s = (shotType || '').toLowerCase();
  if (s.includes('wide') || s.includes('establishing') || s.includes('aerial')) return 'wide';
  if (s.includes('close') || s.includes('detail')) return 'closeup';
  if (s.includes('atmosf') || s.includes('drone') || s.includes('overhead')) return 'atmospheric';
  return 'medium';
}

function detectSceneType(
  text: string,
  visualNote: string,
  hasSpiritual: boolean,
  isTimelapse: boolean
): SceneProfile['sceneType'] {
  const combined = (text + ' ' + visualNote).toLowerCase();

  if (isTimelapse) return 'timelapse';
  if (hasSpiritual) return 'spiritual';
  if (/yakın|close.?up|detay|yüz|göz|el|parmak/i.test(combined)) return 'detail';
  if (/karakter|konuşma|diyalog|duygu|ağlı|gülüm/i.test(combined)) return 'character_moment';
  if (/savaş|çatışma|hareket|koş|battle|combat|action/.test(combined)) return 'action';
  if (/manzara|peyzaj|landscape|dağ|ova|deniz|nehir|gökyüzü|horizon/i.test(combined)) return 'landscape';
  return 'establishing';
}

function detectEmotionalTone(text: string): EmotionalTone {
  const t = text.toLowerCase();
  if (/hüzün|üzünt|ağlı|mourning|melanchol|sorrow|elegy|yas/.test(t)) return 'melancholic';
  if (/umut|hope|hayat|joy|mutlu|kutlama|celebration/.test(t)) return 'hopeful';
  if (/gerilim|korku|tehlike|fear|danger|tense|tansiyon/.test(t)) return 'tense';
  if (/huzur|sessiz|dingin|peaceful|calm|tranquil|sükun/.test(t)) return 'peaceful';
  if (/kutsal|dua|tanrı|sacred|prayer|divine|holy|ilahi/.test(t)) return 'sacred';
  if (/zafer|zafer|triumph|victory|başarı/.test(t)) return 'triumphant';
  return 'neutral';
}

function detectTemporalPosition(text: string, visualNote: string, timeContextLabels: string[]): TemporalPosition {
  const combined = (text + ' ' + visualNote + ' ' + timeContextLabels.join(' ')).toLowerCase();
  if (/eski|geçmiş|antik|ancient|past|historical|tarih/i.test(combined)) return 'past';
  if (/bugün|günümüz|modern|present|today|şimdi/i.test(combined)) return 'present';
  if (/timelapse|geçiş|transition|dönüşüm|transform/i.test(combined)) return 'transition';
  return 'unknown';
}

function buildRevisionBoundaries(
  isTimelapse: boolean,
  sceneType: SceneProfile['sceneType'],
  hasSpiritualContent: boolean
): string[] {
  const boundaries: string[] = [];

  if (isTimelapse) {
    boundaries.push('Preserve temporal sequence — do not alter the time-order of this scene.');
  }
  if (sceneType === 'spiritual') {
    boundaries.push('Spiritual entity appearance rules must be respected.');
  }
  if (sceneType === 'character_moment') {
    boundaries.push('Character emotional expression must be preserved.');
  }
  if (hasSpiritualContent) {
    boundaries.push('If spiritual entity is absent from this scene, do not add it.');
  }

  return boundaries;
}

function buildPromptProfile(prompt: PromptCard, entityNames: string[]): PromptProfile {
  const shotContext = detectShotContext(prompt.shotType);
  const lower = prompt.promptText.toLowerCase();

  const entityMentions = entityNames.filter(name => lower.includes(name.toLowerCase()));
  const mentionCount = entityMentions.length;

  let entityPresenceStrength: PresenceStrength = 'implied';
  if (mentionCount > 2) entityPresenceStrength = 'primary';
  else if (mentionCount > 0) entityPresenceStrength = 'secondary';

  return {
    promptId: prompt.id,
    shotType: prompt.shotType,
    shotContext,
    entityMentions,
    textExcerpt: prompt.promptText.slice(0, 150),
    entityPresenceStrength,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Create a universal profile for a single scene card.
 *
 * @param scene          The scene card to profile
 * @param entityNames    All known entity names (from catalog) for mention detection
 * @param timeContextLabels  Labels from the scene's time contexts
 */
export function profileScene(
  scene: SceneCard,
  entityNames: string[],
  timeContextLabels: string[] = []
): SceneProfile {
  const isTimelapse = /^timelapse:/i.test(scene.visualNote || '');
  const hasSpiritualContent =
    scene.prompts.some(p =>
      /ethereal|spiritual|divine|sacred|tanrı|ruh|spirit|celestial|supernatural|holy/i.test(p.promptText)
    ) ||
    /tanrı|ruh|spirit|deity|ethereal|ilah|kutsal/i.test(scene.text + ' ' + scene.visualNote);

  const temporalPosition = detectTemporalPosition(scene.text, scene.visualNote, timeContextLabels);
  const emotionalTone = detectEmotionalTone(scene.text + ' ' + scene.visualNote);
  const sceneType = detectSceneType(scene.text, scene.visualNote, hasSpiritualContent, isTimelapse);

  const promptProfiles = scene.prompts.map(p => buildPromptProfile(p, entityNames));

  const dominantShotContext: ShotContext =
    promptProfiles.length > 0 ? promptProfiles[0].shotContext : 'medium';

  const detectedEntityNames = Array.from(
    new Set(promptProfiles.flatMap(pp => pp.entityMentions))
  );

  const narrativeArcType: NarrativeArcType = isTimelapse
    ? 'timelapse'
    : hasSpiritualContent
    ? 'static'
    : 'static';

  return {
    sceneId: scene.id,
    sceneNumber: scene.sceneNumber,
    sceneType,
    dominantShotContext,
    temporalPosition,
    emotionalTone,
    narrativeArcType,
    isTimelapse,
    hasSpiritualContent,
    characterIds: scene.characterIds || [],
    locationIds: scene.locationIds || [],
    detectedEntityNames,
    revisionBoundaries: buildRevisionBoundaries(isTimelapse, sceneType, hasSpiritualContent),
    promptProfiles,
  };
}

/**
 * Profile all scenes in a collection.
 */
export function profileAllScenes(
  sceneCards: SceneCard[],
  entityNames: string[],
  timeContextMap: Record<string, string[]> = {}
): SceneProfile[] {
  return sceneCards.map(sc => {
    const tcLabels = timeContextMap[sc.id] || [];
    return profileScene(sc, entityNames, tcLabels);
  });
}
