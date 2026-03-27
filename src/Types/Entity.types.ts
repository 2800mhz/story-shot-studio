export type EntityType = 'character' | 'location' | 'object' | 'architecture' | 'environment';

export type PresenceStrength = 'primary' | 'secondary' | 'background' | 'implied';

export type ShotContext = 'wide' | 'medium' | 'closeup' | 'atmospheric';

export interface EntityAppearance {
  sceneId: string;
  sceneNumber: number;
  promptIds: string[];
  /** How this entity appears in the given scene */
  contextType: ShotContext;
  /** How prominent the entity is in this scene */
  presenceStrength: PresenceStrength;
  /** Excerpt of the prompt text showing the entity */
  promptExcerpt?: string;
}

export interface EntityRevisionRecord {
  id: string;
  timestamp: string;
  instruction: string;
  previousDescription: string;
  newDescription: string;
  affectedSceneCount: number;
}

export interface EntityCatalogItem {
  id: string;
  name: string;
  type: EntityType;
  /** Current canonical visual description used in prompts */
  canonicalDescription: string;
  /** All scenes where this entity appears */
  appearances: EntityAppearance[];
  /** History of revisions applied to this entity */
  revisionHistory: EntityRevisionRecord[];
  /** Entity cannot be auto-modified */
  isProtected: boolean;
  tags: string[];
  /** Contextual description variants by shot type */
  contextualDescriptions?: Partial<Record<ShotContext, string>>;
}

export interface EntityCatalog {
  items: EntityCatalogItem[];
  /** ISO timestamp of last build */
  builtAt: string;
  totalScenes: number;
}
