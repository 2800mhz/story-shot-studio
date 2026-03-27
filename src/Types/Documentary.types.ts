export interface TimePeriod {
  id: string;
  label: string;
  era: string;
  startSceneNumber?: number;
  endSceneNumber?: number;
  /** true if this period represents the current/present state (e.g. desolation vs. golden era) */
  isCurrentState?: boolean;
  colorPalette?: string;
  atmosphere?: string;
}

export interface GeographicRegion {
  id: string;
  name: string;
  climate?: string;
  terrain?: string;
  historicalName?: string;
}

export interface DocumentaryEntity {
  id: string;
  name: string;
  type: 'character' | 'location' | 'object' | 'architecture' | 'environment';
  canonicalDescription: string;
  /** Scene IDs where this entity appears */
  sceneAppearances: string[];
  visualRole: 'protagonist' | 'supporting' | 'environmental' | 'symbolic';
  /** true for spiritual/supernatural entities that have special appearance rules */
  isSpiritual?: boolean;
  /** true if this entity's description should not be auto-modified */
  isProtected?: boolean;
  /** Free-form tags for filtering */
  tags?: string[];
}

export interface NarrativeArc {
  id: string;
  label: string;
  /** Scene IDs that form this arc */
  sceneIds: string[];
  arcType: 'timelapse' | 'transformation' | 'emotional' | 'chronological';
  /** How strictly revisions should preserve this arc */
  protectionLevel: 'strict' | 'moderate' | 'flexible';
  description?: string;
}

export interface DocumentaryDNA {
  projectId: string;
  episodeId: string;
  title: string;
  genre: 'documentary' | 'historical' | 'nature' | 'cultural' | 'hybrid';
  periods: TimePeriod[];
  regions: GeographicRegion[];
  entities: DocumentaryEntity[];
  narrativeArcs: NarrativeArc[];
  globalStyleNotes?: string;
  /** ISO timestamp of last analysis */
  lastAnalyzedAt?: string;
}
