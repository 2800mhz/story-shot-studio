import type { SceneCard } from '@/types';
import type { RevisionInstruction } from '../Types/Revision.types';
import type { EntityCatalog } from '../Types/Entity.types';
import type { SceneProfile } from './2_UniversalSceneProfiler';

/**
 * A routing decision for a single scene.
 */
export interface SceneRoutingDecision {
  sceneId: string;
  sceneNumber: number;
  /** Whether this scene should receive a revision */
  shouldRevise: boolean;
  /** IDs of prompts within the scene that should be revised */
  targetPromptIds: string[];
  /** Reason for the routing decision */
  rationale: string;
  /** Priority — higher = revise first */
  priority: number;
  /** Constraints that must be respected during revision of this scene */
  revisionConstraints: string[];
}

/**
 * The full routing matrix for a revision job.
 */
export interface RoutingMatrix {
  instruction: RevisionInstruction;
  decisions: SceneRoutingDecision[];
  /** Total scenes that will be revised */
  totalAffected: number;
  /** Total scenes that were skipped */
  totalSkipped: number;
  /** Summary of why scenes were included/excluded */
  summary: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isEntityPresentInScene(
  entityId: string,
  entityName: string,
  profile: SceneProfile,
  catalog: EntityCatalog
): boolean {
  // Check catalog appearances
  const catalogItem = catalog.items.find(i => i.id === entityId);
  if (catalogItem) {
    if (catalogItem.appearances.some(a => a.sceneId === profile.sceneId)) return true;
  }

  // Check if entity name is mentioned in prompts
  const nameLower = entityName.toLowerCase();
  return profile.detectedEntityNames.some(n => n.toLowerCase() === nameLower) ||
    profile.detectedEntityNames.some(n => nameLower.includes(n.toLowerCase()) || n.toLowerCase().includes(nameLower));
}

function buildEntityConstraints(
  profile: SceneProfile,
  instruction: RevisionInstruction
): string[] {
  const constraints: string[] = [...profile.revisionBoundaries];

  if (instruction.narrativeConstraints) {
    const nc = instruction.narrativeConstraints;
    if (nc.preserveTimelapseSequence && profile.isTimelapse) {
      constraints.push('Preserve timelapse temporal order.');
    }
    if (nc.preserveEmotionalArc && profile.sceneType === 'character_moment') {
      constraints.push('Preserve character emotional expression.');
    }
  }

  // If instruction says onlyWhenPresent, ensure we don't add entity if absent
  if (instruction.entityModifications) {
    for (const em of instruction.entityModifications) {
      if (em.onlyWhenPresent) {
        const present = isEntityPresentInScene(
          em.entityId || '',
          em.entityName,
          profile,
          { items: [], builtAt: '', totalScenes: 0 }
        );
        if (!present) {
          constraints.push(`Do NOT add "${em.entityName}" to this scene — it is not present here.`);
        }
      }
    }
  }

  return constraints;
}

function computePriority(profile: SceneProfile, entityPresent: boolean): number {
  let p = 0;
  if (entityPresent) p += 10;
  if (profile.sceneType === 'spiritual') p += 5;
  if (profile.sceneType === 'character_moment') p += 3;
  if (profile.sceneType === 'establishing') p += 2;
  return p;
}

function selectTargetPrompts(
  scene: SceneCard,
  entityName?: string
): string[] {
  if (!entityName) {
    return scene.prompts.map(p => p.id);
  }
  const nameLower = entityName.toLowerCase();
  const matching = scene.prompts.filter(p =>
    p.promptText.toLowerCase().includes(nameLower)
  );
  return matching.length > 0 ? matching.map(p => p.id) : scene.prompts.map(p => p.id);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Build the routing matrix for a revision job.
 *
 * This decides:
 * - Which scenes to revise
 * - Which prompts within each scene to revise
 * - What constraints apply to each revision
 *
 * @param instruction  Parsed revision instruction
 * @param sceneCards   All scene cards
 * @param profiles     Universal profiles for all scenes
 * @param catalog      Entity catalog
 */
export function buildRoutingMatrix(
  instruction: RevisionInstruction,
  sceneCards: SceneCard[],
  profiles: SceneProfile[],
  catalog: EntityCatalog
): RoutingMatrix {
  const profileMap = new Map(profiles.map(p => [p.sceneId, p]));
  const decisions: SceneRoutingDecision[] = [];

  for (const scene of sceneCards) {
    const profile = profileMap.get(scene.id);
    if (!profile) continue;

    let shouldRevise = false;
    let rationale = '';

    if (instruction.scope === 'global') {
      // Global revisions affect all scenes
      shouldRevise = true;
      rationale = 'Global revision — applied to all scenes.';
    } else if (instruction.scope === 'entity') {
      // Entity revisions only affect scenes where the entity appears
      const entityId = instruction.targetEntityId || '';
      const entityName = instruction.targetEntityName || '';
      const present = isEntityPresentInScene(entityId, entityName, profile, catalog);

      if (present) {
        shouldRevise = true;
        rationale = `Entity "${entityName}" is present in this scene.`;
      } else {
        shouldRevise = false;
        rationale = `Entity "${entityName}" is NOT present in this scene — skipped.`;
      }
    } else if (instruction.scope === 'scene_type') {
      // Scene-type revisions
      shouldRevise = true;
      rationale = 'Scene-type revision applied.';
    }

    const targetPromptIds = shouldRevise
      ? selectTargetPrompts(scene, instruction.targetEntityName)
      : [];

    const revisionConstraints = buildEntityConstraints(profile, instruction);
    const entityPresent = instruction.targetEntityId
      ? isEntityPresentInScene(instruction.targetEntityId, instruction.targetEntityName || '', profile, catalog)
      : true;

    decisions.push({
      sceneId: scene.id,
      sceneNumber: scene.sceneNumber,
      shouldRevise,
      targetPromptIds,
      rationale,
      priority: shouldRevise ? computePriority(profile, entityPresent) : 0,
      revisionConstraints,
    });
  }

  // Sort by priority descending
  decisions.sort((a, b) => b.priority - a.priority);

  const totalAffected = decisions.filter(d => d.shouldRevise).length;
  const totalSkipped = decisions.filter(d => !d.shouldRevise).length;

  const summary =
    instruction.scope === 'global'
      ? `Global revision: all ${totalAffected} scenes will be revised.`
      : `Entity "${instruction.targetEntityName || 'unknown'}" appears in ${totalAffected} scenes (${totalSkipped} skipped).`;

  return {
    instruction,
    decisions,
    totalAffected,
    totalSkipped,
    summary,
  };
}

/**
 * Filter the sceneCards down to only those that should be revised, in priority order.
 */
export function getAffectedScenes(
  matrix: RoutingMatrix,
  allScenes: SceneCard[]
): SceneCard[] {
  const affectedIds = new Set(
    matrix.decisions.filter(d => d.shouldRevise).map(d => d.sceneId)
  );
  return allScenes
    .filter(s => affectedIds.has(s.id))
    .sort((a, b) => {
      const pa = matrix.decisions.find(d => d.sceneId === a.id)?.priority ?? 0;
      const pb = matrix.decisions.find(d => d.sceneId === b.id)?.priority ?? 0;
      return pb - pa;
    });
}
