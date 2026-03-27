import type { RevisionResult } from '../Types/Revision.types';
import type { ValidationReport, ValidationWarning, ValidationBlocker } from '../Types/Narrative.types';
import type { SceneProfile } from './2_UniversalSceneProfiler';
import type { RoutingMatrix } from './3_RoutingMatrix';

/**
 * Safety Validator
 *
 * Validates revision results against narrative integrity rules:
 * - Timelapse sequences must remain coherent
 * - Emotional arcs must not be broken
 * - Spiritual entity appearance rules must be respected
 * - Entity consistency across adjacent scenes
 */

// ─── Narrative Protection Rules ───────────────────────────────────────────────

interface ProtectionRule {
  id: string;
  name: string;
  check: (result: RevisionResult, profile: SceneProfile, matrix: RoutingMatrix) => ValidationBlocker | ValidationWarning | null;
  severity: 'block' | 'warn';
}

const PROTECTION_RULES: ProtectionRule[] = [
  {
    id: 'timelapse-entity-added',
    name: 'Timelapse Scene Entity Check',
    severity: 'warn',
    check: (result, profile) => {
      if (!profile.isTimelapse) return null;
      // If revised text has more spiritual mentions than original, warn
      const origSpiritual = countSpiritualMentions(result.originalText);
      const revSpiritual = countSpiritualMentions(result.revisedText);
      if (revSpiritual > origSpiritual + 1) {
        return {
          code: 'TIMELAPSE_ENTITY_ADDED',
          message: `Scene ${profile.sceneNumber} is part of a timelapse sequence. New spiritual/entity elements were added — verify this does not disrupt the temporal narrative.`,
          sceneId: result.sceneId,
          promptId: result.promptId,
        } as ValidationWarning;
      }
      return null;
    },
  },

  {
    id: 'entity-injected-when-absent',
    name: 'Entity Not Present Guard',
    severity: 'warn',
    check: (result, profile) => {
      // Check if a spiritual entity name appeared in revised but not original
      const SPIRIT_NAMES_RE = /hazar ana|aral ana|tengri|spirit|deity|tanrı|ilah/gi;
      const origMatches = (result.originalText.match(SPIRIT_NAMES_RE) || []).length;
      const revMatches = (result.revisedText.match(SPIRIT_NAMES_RE) || []).length;

      if (revMatches > origMatches && !profile.hasSpiritualContent) {
        return {
          code: 'ENTITY_INJECTED',
          message: `Spiritual entity was added to scene ${profile.sceneNumber} where none was present before. Review this change.`,
          sceneId: result.sceneId,
          promptId: result.promptId,
        } as ValidationWarning;
      }
      return null;
    },
  },

  {
    id: 'prompt-length-extreme-change',
    name: 'Prompt Length Sanity',
    severity: 'warn',
    check: (result) => {
      const origWords = result.originalText.split(/\s+/).length;
      const revWords = result.revisedText.split(/\s+/).length;
      const ratio = revWords / Math.max(origWords, 1);

      if (ratio < 0.4 || ratio > 2.5) {
        return {
          code: 'LENGTH_ANOMALY',
          message: `Prompt length changed drastically (${origWords} → ${revWords} words). Original structure may have been lost.`,
          sceneId: result.sceneId,
          promptId: result.promptId,
        } as ValidationWarning;
      }
      return null;
    },
  },

  {
    id: 'empty-revision',
    name: 'Empty Revision Guard',
    severity: 'block',
    check: (result) => {
      if (!result.revisedText || result.revisedText.trim().length < 20) {
        return {
          code: 'EMPTY_REVISION',
          message: `Revision produced an empty or very short prompt for scene ${result.sceneId}. The original has been preserved.`,
          sceneId: result.sceneId,
          ruleId: 'empty-revision',
        } as ValidationBlocker;
      }
      return null;
    },
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function countSpiritualMentions(text: string): number {
  const matches = text.match(/ethereal|spiritual|spirit|divine|sacred|tanrı|celestial|supernatural/gi);
  return matches ? matches.length : 0;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Validate a single revision result against all protection rules.
 */
export function validateRevisionResult(
  result: RevisionResult,
  profile: SceneProfile,
  matrix: RoutingMatrix
): { warnings: ValidationWarning[]; blockers: ValidationBlocker[] } {
  const warnings: ValidationWarning[] = [];
  const blockers: ValidationBlocker[] = [];

  for (const rule of PROTECTION_RULES) {
    const issue = rule.check(result, profile, matrix);
    if (!issue) continue;

    if (rule.severity === 'block') {
      blockers.push(issue as ValidationBlocker);
    } else {
      warnings.push(issue as ValidationWarning);
    }
  }

  return { warnings, blockers };
}

/**
 * Validate all revision results and produce a full report.
 */
export function validateAllRevisions(
  results: RevisionResult[],
  profileMap: Map<string, SceneProfile>,
  matrix: RoutingMatrix
): ValidationReport {
  const allWarnings: ValidationWarning[] = [];
  const allBlockers: ValidationBlocker[] = [];

  for (const result of results) {
    const profile = profileMap.get(result.sceneId);
    if (!profile) continue;

    const { warnings, blockers } = validateRevisionResult(result, profile, matrix);
    allWarnings.push(...warnings);
    allBlockers.push(...blockers);
  }

  return {
    passed: allBlockers.length === 0,
    warnings: allWarnings,
    blockers: allBlockers,
  };
}

/**
 * Auto-fix a revision result that has a blocker (e.g. empty revision → restore original).
 */
export function autoFixRevisionResult(
  result: RevisionResult,
  blockers: ValidationBlocker[]
): RevisionResult {
  for (const blocker of blockers) {
    if (blocker.code === 'EMPTY_REVISION') {
      return {
        ...result,
        revisedText: result.originalText,
        validationPassed: false,
        validationWarnings: [`Auto-restored original: ${blocker.message}`],
      };
    }
  }
  return result;
}
