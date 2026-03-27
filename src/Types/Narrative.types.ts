export type TemporalPosition = 'past' | 'present' | 'transition' | 'unknown';

export type EmotionalTone =
  | 'melancholic'
  | 'hopeful'
  | 'tense'
  | 'peaceful'
  | 'sacred'
  | 'neutral'
  | 'triumphant'
  | 'sorrowful';

export type NarrativeArcType = 'timelapse' | 'transformation' | 'static' | 'emotional_peak' | 'establishing';

export interface NarrativeContext {
  sceneId: string;
  arcType: NarrativeArcType;
  temporalPosition: TemporalPosition;
  emotionalTone: EmotionalTone;
  /** True if this scene is a narrative turning point */
  isKeyMoment: boolean;
  /** Constraints for safe revision */
  revisionConstraints: string[];
  /** Which narrative arc ID this scene belongs to */
  arcId?: string;
}

export interface NarrativeProtectionRule {
  id: string;
  name: string;
  description: string;
  appliesTo: 'all' | 'timelapse' | 'character_arc' | 'emotional_peak' | 'transformation';
  /** Human-readable constraint explanation */
  constraint: string;
  /** Severity: block revision or only warn */
  severity: 'block' | 'warn';
}

export interface ValidationReport {
  passed: boolean;
  warnings: ValidationWarning[];
  blockers: ValidationBlocker[];
}

export interface ValidationWarning {
  code: string;
  message: string;
  sceneId?: string;
  promptId?: string;
}

export interface ValidationBlocker {
  code: string;
  message: string;
  sceneId?: string;
  ruleId?: string;
}
