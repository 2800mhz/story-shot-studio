import type { SceneCard, PromptCard } from '@/types';
import type { RevisionInstruction, RevisionResult, BulkRevisionJob } from '../Types/Revision.types';
import type { EntityCatalog } from '../Types/Entity.types';
import type { SceneProfile } from './2_UniversalSceneProfiler';
import type { SceneRoutingDecision } from './3_RoutingMatrix';
import { getContextualDescription, getEntitiesForScene, updateEntityInVault } from './4_EntityVault';
import { aiProvider } from '@/lib/aiProvider';

/**
 * Layer 5: Execution Engine
 *
 * Executes revision jobs by:
 * 1. Building a context-aware AI prompt for each target scene/prompt pair
 * 2. Calling the AI provider
 * 3. Returning structured RevisionResult objects
 * 4. (Optionally) updating the Entity Vault after completion
 */

// ─── AI Prompt Builder ────────────────────────────────────────────────────────

function buildRevisionSystemPrompt(): string {
  return `You are an elite cinematic prompt revision specialist for documentary AI image generation.

Your task: Revise an existing image generation prompt according to a user instruction.

RULES:
1. Keep the revised prompt the same approximate length as the original (120-150 words).
2. Preserve all technical camera/lens/lighting specifications unless the instruction explicitly changes them.
3. Preserve the documentary realism style.
4. Apply ONLY what the instruction says — do not add new elements.
5. If the instruction says NOT to show an entity, remove all references to it.
6. If the instruction says to modify an entity's appearance, change ONLY how that entity looks.
7. NEVER add spiritual/supernatural entities to a scene where they did not appear before.
8. Preserve narrative boundaries listed in CONSTRAINTS.

OUTPUT FORMAT: Return ONLY the revised prompt text. No explanations, no JSON, no markdown.`;
}

function buildRevisionUserPrompt(
  originalPrompt: string,
  instruction: RevisionInstruction,
  profile: SceneProfile,
  decision: SceneRoutingDecision,
  entityCatalogContext: string
): string {
  const constraintBlock =
    decision.revisionConstraints.length > 0
      ? `\n\nCONSTRAINTS (must respect):\n${decision.revisionConstraints.map(c => `- ${c}`).join('\n')}`
      : '';

  const entityBlock = entityCatalogContext
    ? `\n\nENTITY DEFINITIONS (use these canonical descriptions):\n${entityCatalogContext}`
    : '';

  const contextNote = `Scene context: ${profile.sceneType} (${profile.dominantShotContext} shot), emotional tone: ${profile.emotionalTone}, temporal position: ${profile.temporalPosition}.`;

  return `ORIGINAL PROMPT:
${originalPrompt}

USER REVISION INSTRUCTION:
${instruction.rawText}

${contextNote}${entityBlock}${constraintBlock}

Revise the prompt accordingly. Return ONLY the revised prompt text.`;
}

function buildEntityContextBlock(
  sceneId: string,
  catalog: EntityCatalog,
  profile: SceneProfile
): string {
  const entities = getEntitiesForScene(catalog, sceneId);
  if (entities.length === 0) return '';

  return entities
    .map(entity => {
      const desc = getContextualDescription(entity, profile.dominantShotContext);
      return `- ${entity.name}: ${desc}`;
    })
    .join('\n');
}

// ─── Single Prompt Revision ───────────────────────────────────────────────────

/**
 * Revise a single prompt card using the AI provider.
 */
export async function revisePromptWithEngine(
  prompt: PromptCard,
  scene: SceneCard,
  profile: SceneProfile,
  decision: SceneRoutingDecision,
  instruction: RevisionInstruction,
  catalog: EntityCatalog
): Promise<RevisionResult> {
  const entityContext = buildEntityContextBlock(scene.id, catalog, profile);
  const userPrompt = buildRevisionUserPrompt(
    prompt.promptText,
    instruction,
    profile,
    decision,
    entityContext
  );

  let revisedText: string;
  try {
    revisedText = await aiProvider.generateContent(
      userPrompt,
      buildRevisionSystemPrompt(),
      { operationType: 'entity_revision' }
    );
    revisedText = revisedText.trim();
  } catch (err) {
    revisedText = prompt.promptText; // fallback to original on error
    console.error('RevisionEngine: AI call failed for prompt', prompt.id, err);
  }

  return {
    sceneId: scene.id,
    promptId: prompt.id,
    originalText: prompt.promptText,
    revisedText,
    contextType: profile.dominantShotContext,
    revisionRationale: decision.rationale,
    validationPassed: true,
    validationWarnings: [],
  };
}

// ─── Bulk Revision ────────────────────────────────────────────────────────────

export interface BulkRevisionParams {
  job: BulkRevisionJob;
  sceneCards: SceneCard[];
  profiles: Map<string, SceneProfile>;
  decisions: Map<string, SceneRoutingDecision>;
  catalog: EntityCatalog;
  onProgress?: (progress: { done: number; total: number; currentSceneId: string }) => void;
  onResult?: (result: RevisionResult) => void;
}

/**
 * Execute a bulk revision job.
 * Calls the AI sequentially (to respect rate limits) and reports progress.
 */
export async function executeBulkRevision(params: BulkRevisionParams): Promise<RevisionResult[]> {
  const { job, sceneCards, profiles, decisions, catalog, onProgress, onResult } = params;

  const results: RevisionResult[] = [];
  const sceneMap = new Map(sceneCards.map(sc => [sc.id, sc]));

  // Build the list of (scene, prompt) pairs to revise
  const tasks: Array<{ scene: SceneCard; prompt: PromptCard; profile: SceneProfile; decision: SceneRoutingDecision }> = [];

  for (const decision of job.affectedSceneIds.map(id => decisions.get(id)).filter(Boolean) as SceneRoutingDecision[]) {
    if (!decision.shouldRevise) continue;

    const scene = sceneMap.get(decision.sceneId);
    const profile = profiles.get(decision.sceneId);
    if (!scene || !profile) continue;

    for (const promptId of decision.targetPromptIds) {
      const prompt = scene.prompts.find(p => p.id === promptId);
      if (prompt) {
        tasks.push({ scene, prompt, profile, decision });
      }
    }
  }

  let done = 0;
  const total = tasks.length;

  for (const task of tasks) {
    onProgress?.({ done, total, currentSceneId: task.scene.id });

    const result = await revisePromptWithEngine(
      task.prompt,
      task.scene,
      task.profile,
      task.decision,
      job.instruction,
      catalog
    );

    results.push(result);
    onResult?.(result);
    done++;
  }

  onProgress?.({ done: total, total, currentSceneId: '' });

  return results;
}

/**
 * After a bulk revision job completes, update the Entity Vault if needed.
 */
export function updateVaultAfterRevision(
  catalog: EntityCatalog,
  job: BulkRevisionJob,
  newEntityDescription: string
): EntityCatalog {
  if (!job.instruction.targetEntityId || !newEntityDescription) return catalog;

  return updateEntityInVault(
    catalog,
    job.instruction.targetEntityId,
    newEntityDescription,
    job.instruction.rawText,
    job.affectedSceneIds.length
  );
}

/**
 * Create an initial BulkRevisionJob object.
 */
export function createRevisionJob(
  instruction: RevisionInstruction,
  affectedSceneIds: string[]
): BulkRevisionJob {
  return {
    id: `job-${Date.now()}`,
    instruction,
    targetEntityId: instruction.targetEntityId,
    affectedSceneIds,
    results: [],
    status: 'pending',
    progress: { done: 0, total: 0, isRunning: false },
    createdAt: new Date().toISOString(),
  };
}
