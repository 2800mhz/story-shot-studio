import type { ShotContext } from './Entity.types';

export type RevisionScope = 'global' | 'entity' | 'scene_type' | 'temporal';

export interface StyleModification {
  aspect: 'color' | 'lighting' | 'tone' | 'camera' | 'composition' | 'atmosphere';
  instruction: string;
}

export interface EntityModification {
  entityId?: string;
  entityName: string;
  modification: string;
  /** Different instructions for different shot contexts */
  contextualVariants?: Partial<Record<ShotContext, string>>;
  /** Whether to only apply when entity is present, not add it if absent */
  onlyWhenPresent?: boolean;
}

export interface TemporalConstraint {
  periodLabel: string;
  /** If true, preserve the existing narrative arc for this period */
  preserveArc: boolean;
  allowedModifications?: string[];
}

export interface NarrativeConstraint {
  preserveEmotionalArc: boolean;
  preserveTimelapseSequence: boolean;
  preserveCharacterProgression: boolean;
  notes?: string;
}

export interface RevisionInstruction {
  /** Original user text */
  rawText: string;
  /** Resolved entity id if instruction targets a specific entity */
  targetEntityId?: string;
  targetEntityName?: string;
  scope: RevisionScope;
  styleModifications?: StyleModification[];
  entityModifications?: EntityModification[];
  temporalConstraints?: TemporalConstraint[];
  narrativeConstraints?: NarrativeConstraint;
  /** Parsed intent label for display */
  intentLabel?: string;
}

export interface RevisionResult {
  sceneId: string;
  promptId: string;
  originalText: string;
  revisedText: string;
  contextType: ShotContext;
  revisionRationale: string;
  /** Was validation check passed */
  validationPassed: boolean;
  validationWarnings?: string[];
}

export interface BulkRevisionProgress {
  done: number;
  total: number;
  isRunning: boolean;
  currentSceneId?: string;
}

export interface BulkRevisionJob {
  id: string;
  instruction: RevisionInstruction;
  targetEntityId?: string;
  /** Scenes determined to need revision */
  affectedSceneIds: string[];
  results: RevisionResult[];
  status: 'pending' | 'running' | 'complete' | 'error';
  progress: BulkRevisionProgress;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface RevisionPreviewItem {
  sceneId: string;
  sceneNumber: number;
  promptId: string;
  shotType: string;
  originalText: string;
  revisedText: string;
  /** User accepted or rejected this revision */
  accepted?: boolean;
}
