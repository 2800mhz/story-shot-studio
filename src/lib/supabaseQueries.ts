import { supabase } from './supabase';
import type { TimeContext } from '@/types';

// ── Retry helper with exponential backoff ────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;
const BATCH_SIZE = 20; // Max rows per INSERT to avoid payload limits

async function withRetry<T>(
  fn: () => Promise<T>,
  label = 'Supabase operation',
  retries = MAX_RETRIES,
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) {
        console.error(`❌ ${label} failed after ${retries} attempts:`, err);
        throw err;
      }
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(`⚠️ ${label} attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error(`${label}: unreachable`);
}

// ============================================
// PROJECT QUERIES
// ============================================

export async function fetchProject(projectId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProject(projectId: string, updates: {
  title?: string;
  style_guide?: string;
  master_prompt?: string;
}) {
  const { data, error } = await supabase
    .from('projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProject(projectId: string) {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) throw error;
}

// ============================================
// EPISODE QUERIES
// ============================================

export async function fetchEpisodes(projectId: string) {
  const { data, error } = await supabase
    .from('episodes')
    .select(`
      *,
      scenes:scenes(count)
    `)
    .eq('project_id', projectId)
    .order('episode_number', { ascending: true });

  if (error) throw error;
  
  return (data || []).map(ep => ({
    ...ep,
    scene_count: ep.scenes?.[0]?.count ?? 0
  }));
}

export async function fetchEpisode(episodeId: string) {
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('id', episodeId)
    .single();

  if (error) throw error;
  return data;
}

export async function createEpisode(projectId: string, title: string) {
  const { data: episodes } = await supabase
    .from('episodes')
    .select('episode_number')
    .eq('project_id', projectId)
    .order('episode_number', { ascending: false })
    .limit(1);

  const nextNumber = episodes && episodes.length > 0 ? episodes[0].episode_number + 1 : 1;

  const { data, error } = await supabase
    .from('episodes')
    .insert({
      project_id: projectId,
      episode_number: nextNumber,
      title: title || `Episode ${nextNumber}`,
      document_text: ''
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateEpisode(episodeId: string, updates: {
  title?: string;
  document_text?: string;
  character_data?: string;
  location_data?: string;
  time_contexts?: TimeContext[];
  episode_prompt?: string;
  episode_prompt_tr?: string;
  episode_style_history?: any[];
}) {
  const { data, error } = await supabase
    .from('episodes')
    .update(updates)
    .eq('id', episodeId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEpisode(episodeId: string) {
  const { error } = await supabase
    .from('episodes')
    .delete()
    .eq('id', episodeId);

  if (error) throw error;
}

export async function saveTimeContexts(episodeId: string, timeContexts: TimeContext[]): Promise<void> {
  const { error } = await supabase
    .from('episodes')
    .update({ time_contexts: timeContexts })
    .eq('id', episodeId);

  if (error) throw error;
}

// ============================================
// SCENE QUERIES
// ============================================

export async function fetchScenes(episodeId: string) {
  const { data, error } = await supabase
    .from('scenes')
    .select('*')
    .eq('episode_id', episodeId)
    .order('scene_number', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function saveScenes(episodeId: string, scenes: any[]) {
  try {
    console.log('💾 Saving scenes for episode:', episodeId, 'Count:', scenes.length);

    if (scenes.length === 0) {
      // Nothing to save — delete all existing scenes for this episode
      await withRetry(async () => {
        const { error } = await supabase.from('scenes').delete().eq('episode_id', episodeId);
        if (error) throw error;
      }, 'Delete all scenes (empty)');
      return [];
    }

    // ── Step 1: Prepare the bulk upsert payload ──────────────
    const scenesToUpsert = scenes.map((scene, idx) => {
      const characterIds = Array.isArray(scene.characterIds)
        ? scene.characterIds.filter((id: unknown) => typeof id === 'string') : [];
      const locationIds = Array.isArray(scene.locationIds)
        ? scene.locationIds.filter((id: unknown) => typeof id === 'string') : [];
      const timeContextIds = Array.isArray(scene.timeContextIds)
        ? scene.timeContextIds.filter((id: unknown) => typeof id === 'string') : [];

      return {
        id: scene.id, // now guaranteed to be a valid stable UUID
        episode_id: episodeId,
        scene_number: scene.sceneNumber ?? idx + 1,
        text: scene.text || '',
        visual_note: scene.visualNote || null,
        visual_style: scene.visualStyle || 'realistic',
        character_ids: characterIds,
        location_ids: locationIds,
        time_context_ids: timeContextIds,
        start_index: scene.startIndex ?? null,
        end_index: scene.endIndex ?? null,
        analysis: scene.analysis || null,
        optimizations: scene.optimizations || [],
      };
    });

    // ── Step 2: Fetch existing scene IDs for this episode to find deletions
    const existingIdsObj: any[] = await withRetry(async () => {
      const { data, error } = await supabase
        .from('scenes')
        .select('id')
        .eq('episode_id', episodeId);
      if (error) throw error;
      return data || [];
    }, 'Fetch existing scene IDs');

    const existingIds = existingIdsObj.map(row => row.id);
    const incomingIds = scenesToUpsert.map(s => s.id);
    const idsToDelete = existingIds.filter(id => !incomingIds.includes(id));

    // ── Step 3: Delete removed scenes ─────────────────
    if (idsToDelete.length > 0) {
      await withRetry(async () => {
        const { error } = await supabase.from('scenes').delete().in('id', idsToDelete);
        if (error) throw error;
      }, `Delete ${idsToDelete.length} removed scenes`);
    }

    // ── Step 4: Upsert all incoming scenes ──────────────────────────────────────────────
    const allSaved: any[] = [];
    const BATCH_SIZE = 10;

    for (let i = 0; i < scenesToUpsert.length; i += BATCH_SIZE) {
      const chunk = scenesToUpsert.slice(i, i + BATCH_SIZE);
      const data = await withRetry(async () => {
        const { data, error } = await supabase
          .from('scenes')
          .upsert(chunk, { onConflict: 'id' })
          .select();
        if (error) throw error;
        return data || [];
      }, `Upsert scenes chunk ${Math.ceil(i / BATCH_SIZE) + 1}`);
      allSaved.push(...data);
    }

    console.log('✅ Scenes upserted successfully:', allSaved.length);
    return allSaved;
  } catch (error) {
    console.error('❌ saveScenes error:', error);
    throw error;
  }
}



// ============================================
// PROMPT QUERIES
// ============================================

export async function savePrompts(sceneId: string, prompts: any[]) {
  try {
    // 1. Get current active prompts for this scene to see what exists
    const currentActive: any[] = await withRetry(async () => {
      const { data, error } = await supabase
        .from('prompts')
        .select('id')
        .eq('scene_id', sceneId)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    }, `Fetch active prompts for ${sceneId}`);

    const incomingIds = prompts.map(p => p.id).filter(Boolean);
    const idsToSoftDelete = currentActive
      .map(p => p.id)
      .filter(id => !incomingIds.includes(id));

    // 2. Soft-delete ONLY the prompts that were removed or regenerated entirely
    if (idsToSoftDelete.length > 0) {
      await withRetry(async () => {
        const { error } = await supabase
          .from('prompts')
          .update({ is_active: false })
          .in('id', idsToSoftDelete);
        if (error) throw error;
      }, `Soft-delete ${idsToSoftDelete.length} old prompts for ${sceneId}`);
    }

    if (prompts.length === 0) {
      return [];
    }

    // 3. Upsert the incoming prompts
    const promptsToUpsert = prompts.map(prompt => {
      // Look for an existing UUID to avoid Postgres assigning a new one blindly on insert
      const isValidUUID = prompt.id && prompt.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      return {
        ...(isValidUUID ? { id: prompt.id } : {}), // only send id if it's a valid uuid (not a temporary client ID like prompt-1234)
        scene_id: sceneId,
        type: prompt.type || null,
        label: prompt.label || null,
        shot_type: prompt.shotType || 'establishing',
        summary: prompt.summary || null,
        explanation: prompt.explanation || null,
        prompt_text: prompt.promptText || prompt.prompt_text || '',
        aspect_ratio: prompt.aspectRatio || '16:9',
        generation_type: prompt.generationType || 'initial',
        revision_prompt: prompt.revisionPrompt || null,
        is_active: true,
        is_pinned: prompt.isPinned ?? false,
      };
    });

    const data = await withRetry(async () => {
      const { data, error } = await supabase
        .from('prompts')
        .upsert(promptsToUpsert, { onConflict: 'id' })
        .select();
      if (error) throw error;
      return data || [];
    }, `Upsert prompts for ${sceneId}`);

    return data;
  } catch (error) {
    console.error(`❌ savePrompts error for ${sceneId}:`, error);
    throw error;
  }
}

export async function fetchPrompts(sceneId: string) {
  const { data, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('scene_id', sceneId)
    .eq('is_active', true);

  if (error) throw error;
  return (data || []).map((p: any) => ({ ...p, isPinned: p.is_pinned ?? false }));
}

/**
 * Atomically sets is_pinned=true for promptId and is_pinned=false for all
 * other active prompts in the same scene. Ensures only one pin per scene.
 */
export async function setPinnedPrompt(sceneId: string, promptId: string): Promise<void> {
  // 1. Unpin all active prompts for this scene
  await withRetry(async () => {
    const { error } = await supabase
      .from('prompts')
      .update({ is_pinned: false })
      .eq('scene_id', sceneId)
      .eq('is_active', true);
    if (error) throw error;
  }, `Unpin all prompts for scene ${sceneId}`);

  // 2. Pin only the selected prompt
  await withRetry(async () => {
    const { error } = await supabase
      .from('prompts')
      .update({ is_pinned: true })
      .eq('id', promptId);
    if (error) throw error;
  }, `Pin prompt ${promptId}`);
}

/**
 * Returns the prompt history (soft-deleted / previous versions) for a scene.
 * Useful for a "Restore Previous Prompt" UI feature.
 */
export async function fetchPromptHistory(sceneId: string) {
  // Prevent 400 Bad Request errors if called with a temporary client-side ID (e.g., "scene-123")
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sceneId);
  if (!isUUID) {
    return [];
  }

  // Fetch ALL prompts for this scene (both active and soft-deleted ones),
  // ordered by date descending. This gives a full chronological history.
  const { data, error } = await supabase
    .from('prompts')
    .select('id, type, label, shot_type, summary, explanation, prompt_text, aspect_ratio, generation_type, revision_prompt, created_at, is_active')
    .eq('scene_id', sceneId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchPromptHistory Error:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetches all prompts for multiple scenes in a SINGLE database request using
 * `.in('scene_id', sceneIds)` instead of firing one request per scene.
 * Returns a Map<sceneId, prompt[]> for O(1) lookup per scene.
 */
export async function fetchAllPromptsForScenes(sceneIds: string[]): Promise<Map<string, any[]>> {
  if (sceneIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('prompts')
    .select('*')
    .in('scene_id', sceneIds)
    .eq('is_active', true); // Only fetch active (current) prompts

  if (error) throw error;

  // Group by scene_id
  const result = new Map<string, any[]>();
  for (const row of data || []) {
    const bucket = result.get(row.scene_id) ?? [];
    bucket.push(row);
    result.set(row.scene_id, bucket);
  }
  return result;
}

// ============================================
// CHARACTER QUERIES
// ============================================

export async function fetchGlobalCharacters(projectId: string) {
  const { data, error } = await supabase
    .from('global_characters')
    .select('*')
    .eq('project_id', projectId);

  if (error) throw error;
  return data || [];
}

export async function saveGlobalCharacter(projectId: string, character: {
  name: string;
  description?: string;
  base_prompt?: string;
  first_appearance?: number;
}) {
  const { data, error } = await supabase
    .from('global_characters')
    .insert({
      project_id: projectId,
      ...character
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function upsertGlobalCharacter(projectId: string, character: {
  name: string;
  description?: string;
  base_prompt?: string;
}) {
  const { data, error } = await supabase
    .from('global_characters')
    .upsert(
      { project_id: projectId, ...character },
      { onConflict: 'project_id,name', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// LOCATION QUERIES
// ============================================

export async function fetchGlobalLocations(projectId: string) {
  const { data, error } = await supabase
    .from('global_locations')
    .select('*')
    .eq('project_id', projectId);

  if (error) throw error;
  return data || [];
}

export async function saveGlobalLocation(projectId: string, location: {
  name: string;
  description?: string;
  base_prompt?: string;
}) {
  const { data, error } = await supabase
    .from('global_locations')
    .insert({
      project_id: projectId,
      ...location
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function upsertGlobalLocation(projectId: string, location: {
  name: string;
  description?: string;
  base_prompt?: string;
}) {
  const { data, error } = await supabase
    .from('global_locations')
    .upsert(
      { project_id: projectId, ...location },
      { onConflict: 'project_id,name', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// REFERENCE QUERIES
// ============================================

export async function fetchReferences(episodeId: string) {
  const { data, error } = await supabase
    .from('references')
    .select('*')
    .eq('episode_id', episodeId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Convert snake_case back to camelCase mapping for the UI
  return (data || []).map(row => ({
    id: row.id,
    episodeId: row.episode_id,
    filePath: row.file_path,
    fileUrl: row.file_url,
    description: row.description,
    referenceType: row.reference_type,
    aiAnalysis: row.ai_analysis,
    assignedSceneIds: row.assigned_scene_ids || [],
    createdAt: row.created_at,
  }));
}

export async function saveReference(ref: any) {
  const { data: { user } } = await supabase.auth.getUser();
  const payload = {
    id: ref.id,
    episode_id: ref.episodeId,
    user_id: user?.id,
    file_path: ref.filePath,
    file_url: ref.fileUrl,
    description: ref.description,
    reference_type: ref.referenceType,
    ai_analysis: ref.aiAnalysis,
    assigned_scene_ids: ref.assignedSceneIds || [],
  };

  const { data, error } = await supabase
    .from('references')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteReference(id: string) {
  const { error } = await supabase
    .from('references')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function updateReferenceAssignments(id: string, sceneIds: string[]) {
  const { data, error } = await supabase
    .from('references')
    .update({ assigned_scene_ids: sceneIds })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
