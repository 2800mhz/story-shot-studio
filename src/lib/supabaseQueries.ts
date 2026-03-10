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

    // Delete existing scenes (retried)
    await withRetry(async () => {
      const { error } = await supabase
        .from('scenes')
        .delete()
        .eq('episode_id', episodeId);
      if (error) throw error;
    }, 'Delete scenes');

    if (scenes.length === 0) {
      console.log('✅ No scenes to save');
      return [];
    }

    const scenesToInsert = scenes.map((scene, idx) => {
      const characterIds = Array.isArray(scene.characterIds)
        ? scene.characterIds.filter((id: unknown) => typeof id === 'string')
        : [];

      const locationIds = Array.isArray(scene.locationIds)
        ? scene.locationIds.filter((id: unknown) => typeof id === 'string')
        : [];

      const timeContextIds = Array.isArray(scene.timeContextIds)
        ? scene.timeContextIds.filter((id: unknown) => typeof id === 'string')
        : [];

      return {
        episode_id: episodeId,
        scene_number: idx + 1,
        text: scene.text || '',
        visual_note: scene.visualNote || null,
        character_ids: characterIds,
        location_ids: locationIds,
        time_context_ids: timeContextIds,
        analysis: scene.analysis || null,
        optimizations: scene.optimizations || []
      };
    });

    // Insert in chunks to avoid payload limits
    const allInserted: any[] = [];
    for (let i = 0; i < scenesToInsert.length; i += BATCH_SIZE) {
      const chunk = scenesToInsert.slice(i, i + BATCH_SIZE);
      const chunkLabel = `Insert scenes chunk ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(scenesToInsert.length / BATCH_SIZE)}`;
      console.log(`📤 ${chunkLabel} (${chunk.length} rows)`);

      const data = await withRetry(async () => {
        const { data, error } = await supabase
          .from('scenes')
          .insert(chunk)
          .select();
        if (error) throw error;
        return data || [];
      }, chunkLabel);

      allInserted.push(...data);
    }

    console.log('✅ Scenes saved successfully:', allInserted.length);
    return allInserted;
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
    // Delete existing prompts (retried)
    await withRetry(async () => {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('scene_id', sceneId);
      if (error) throw error;
    }, `Delete prompts for ${sceneId}`);

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
      aspect_ratio: prompt.aspectRatio || '16:9'
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
    .eq('scene_id', sceneId);

  if (error) throw error;
  return data || [];
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
