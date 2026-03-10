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
    .select('*')
    .eq('project_id', projectId)
    .order('episode_number', { ascending: true });

  if (error) throw error;
  return data || [];
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

    // ── Step 1: Fetch existing scenes (sorted by scene_number) ──────────────
    // We match by position so that UUIDs remain stable across saves.
    // This is essential for prompt history: prompts reference scene_id (UUID).
    // If we DELETE+INSERT every save, new UUIDs break the FK reference for
    // the soft-delete UPDATE in savePrompts.
    const existingScenes: any[] = await withRetry(async () => {
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number')
        .eq('episode_id', episodeId)
        .order('scene_number', { ascending: true });
      if (error) throw error;
      return data || [];
    }, 'Fetch existing scenes');

    // ── Step 2: Build update/insert payloads ────────────────────────────────
    const toUpdate: any[] = [];
    const toInsert: any[] = [];

    scenes.forEach((scene, idx) => {
      const characterIds = Array.isArray(scene.characterIds)
        ? scene.characterIds.filter((id: unknown) => typeof id === 'string') : [];
      const locationIds = Array.isArray(scene.locationIds)
        ? scene.locationIds.filter((id: unknown) => typeof id === 'string') : [];
      const timeContextIds = Array.isArray(scene.timeContextIds)
        ? scene.timeContextIds.filter((id: unknown) => typeof id === 'string') : [];

      const fields = {
        episode_id: episodeId,
        scene_number: idx + 1,
        text: scene.text || '',
        visual_note: scene.visualNote || null,
        character_ids: characterIds,
        location_ids: locationIds,
        time_context_ids: timeContextIds,
        analysis: scene.analysis || null,
        optimizations: scene.optimizations || [],
      };

      if (existingScenes[idx]) {
        toUpdate.push({ id: existingScenes[idx].id, ...fields });
      } else {
        toInsert.push(fields);
      }
    });

    // ── Step 3: Delete scenes no longer present (tail rows) ─────────────────
    const extraIds = existingScenes.slice(scenes.length).map((s: any) => s.id);
    if (extraIds.length > 0) {
      await withRetry(async () => {
        const { error } = await supabase.from('scenes').delete().in('id', extraIds);
        if (error) throw error;
      }, `Delete ${extraIds.length} extra scenes`);
    }

    // ── Step 4: UPDATE existing ──────────────────────────────────────────────
    const allSaved: any[] = [];
    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const chunk = toUpdate.slice(i, i + BATCH_SIZE);
      const data = await withRetry(async () => {
        const results = await Promise.all(
          chunk.map((row: any) =>
            supabase.from('scenes').update(row).eq('id', row.id).select().single()
          )
        );
        const errors = results.filter(r => r.error);
        if (errors.length) throw errors[0].error;
        return results.map(r => r.data);
      }, `Update scenes chunk ${Math.ceil(i / BATCH_SIZE) + 1}`);
      allSaved.push(...data);
    }

    // ── Step 5: INSERT new scenes ────────────────────────────────────────────
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const chunk = toInsert.slice(i, i + BATCH_SIZE);
      const data = await withRetry(async () => {
        const { data, error } = await supabase.from('scenes').insert(chunk).select();
        if (error) throw error;
        return data || [];
      }, `Insert new scenes chunk ${Math.ceil(i / BATCH_SIZE) + 1}`);
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
    // Soft-delete existing active prompts (mark is_active = false) instead of hard DELETE.
    // This preserves prompt history so users can restore previous versions.
    await withRetry(async () => {
      const { error } = await supabase
        .from('prompts')
        .update({ is_active: false })
        .eq('scene_id', sceneId)
        .eq('is_active', true);
      if (error) throw error;
    }, `Soft-delete prompts for ${sceneId}`);

    if (prompts.length === 0) {
      return [];
    }

    const promptsToInsert = prompts.map(prompt => ({
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
    }));

    // Insert with retry
    const data = await withRetry(async () => {
      const { data, error } = await supabase
        .from('prompts')
        .insert(promptsToInsert)
        .select();
      if (error) throw error;
      return data || [];
    }, `Insert prompts for ${sceneId}`);

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
  return data || [];
}

/**
 * Returns the prompt history (soft-deleted / previous versions) for a scene.
 * Useful for a "Restore Previous Prompt" UI feature.
 */
export async function fetchPromptHistory(sceneId: string) {
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
  
  console.log(`[fetchPromptHistory] SceneID: ${sceneId} -> Found ${data?.length || 0} prompts`, data);
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
