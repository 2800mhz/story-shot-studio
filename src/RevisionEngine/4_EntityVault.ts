import type { EntityCatalogItem, EntityCatalog, ShotContext, EntityRevisionRecord } from '../Types/Entity.types';

/**
 * Layer 4: Entity Vault
 *
 * The Entity Vault is the single source of truth for canonical entity descriptions.
 * It provides:
 * - Retrieval of current descriptions (with contextual variants by shot type)
 * - Update of descriptions after a revision job
 * - Context-aware description generation (same entity described differently for wide vs. close-up)
 */

// ─── Context-Aware Description Adjustments ──────────────────────────────────

const CONTEXT_PREFIXES: Record<ShotContext, string> = {
  wide: 'Visible in the distance,',
  medium: 'In the mid-ground,',
  closeup: 'Seen in close detail,',
  atmospheric: 'As a background atmospheric presence,',
};

/**
 * Generate a context-aware description for an entity given a shot context.
 * Uses the canonical description as a base, with minor adjustments.
 */
export function getContextualDescription(
  entity: EntityCatalogItem,
  context: ShotContext
): string {
  // If a specific contextual variant has been stored, use it
  if (entity.contextualDescriptions?.[context]) {
    return entity.contextualDescriptions[context]!;
  }

  // Otherwise derive from canonical description with a prefix hint
  const prefix = CONTEXT_PREFIXES[context];
  return `${prefix} ${entity.canonicalDescription}`;
}

/**
 * Retrieve an entity from the vault by id or name.
 */
export function getEntityFromVault(
  catalog: EntityCatalog,
  entityIdOrName: string
): EntityCatalogItem | undefined {
  return (
    catalog.items.find(item => item.id === entityIdOrName) ||
    catalog.items.find(
      item => item.name.toLowerCase() === entityIdOrName.toLowerCase()
    )
  );
}

/**
 * Update a single entity's canonical description in the vault.
 * Returns a new catalog (immutable update).
 */
export function updateEntityInVault(
  catalog: EntityCatalog,
  entityId: string,
  newDescription: string,
  instruction: string,
  affectedSceneCount: number
): EntityCatalog {
  const revisionRecord: EntityRevisionRecord = {
    id: `rev-${Date.now()}`,
    timestamp: new Date().toISOString(),
    instruction,
    previousDescription: '',
    newDescription,
    affectedSceneCount,
  };

  const updatedItems = catalog.items.map(item => {
    if (item.id !== entityId) return item;

    revisionRecord.previousDescription = item.canonicalDescription;

    return {
      ...item,
      canonicalDescription: newDescription,
      revisionHistory: [...item.revisionHistory, revisionRecord],
    };
  });

  return { ...catalog, items: updatedItems };
}

/**
 * Store a contextual description variant for an entity.
 * Returns a new catalog (immutable update).
 */
export function setContextualDescription(
  catalog: EntityCatalog,
  entityId: string,
  context: ShotContext,
  description: string
): EntityCatalog {
  const updatedItems = catalog.items.map(item => {
    if (item.id !== entityId) return item;
    return {
      ...item,
      contextualDescriptions: {
        ...(item.contextualDescriptions || {}),
        [context]: description,
      },
    };
  });

  return { ...catalog, items: updatedItems };
}

/**
 * Mark an entity as protected so it won't be auto-revised.
 */
export function protectEntity(
  catalog: EntityCatalog,
  entityId: string,
  protect: boolean
): EntityCatalog {
  const updatedItems = catalog.items.map(item =>
    item.id === entityId ? { ...item, isProtected: protect } : item
  );
  return { ...catalog, items: updatedItems };
}

/**
 * Get entities that appear in a given scene.
 */
export function getEntitiesForScene(
  catalog: EntityCatalog,
  sceneId: string
): EntityCatalogItem[] {
  return catalog.items.filter(item =>
    item.appearances.some(a => a.sceneId === sceneId)
  );
}

/**
 * Get the top N most-mentioned entities across all scenes.
 */
export function getTopEntities(
  catalog: EntityCatalog,
  limit = 10
): EntityCatalogItem[] {
  return [...catalog.items]
    .sort((a, b) => b.appearances.length - a.appearances.length)
    .slice(0, limit);
}
