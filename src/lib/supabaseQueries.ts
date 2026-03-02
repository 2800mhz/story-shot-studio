import { supabase } from './supabase';

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

    const { error: deleteError } = await supabase
      .from('scenes')
      .delete()
      .eq('episode_id', episodeId);

    if (deleteError) {
      console.error('❌ Delete error:', deleteError);
      throw deleteError;
    }

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

      return {
        episode_id: episodeId,
        scene_number: idx + 1,
        text: scene.text || '',
        visual_note: scene.visualNote || null,
        character_ids: characterIds,
        location_ids: locationIds,
        analysis: scene.analysis || null,
        optimizations: scene.optimizations || []
      };
    });

    console.log('📤 Inserting scenes:', scenesToInsert.length);

    const { data, error } = await supabase
      .from('scenes')
      .insert(scenesToInsert)
      .select();

    if (error) {
      console.error('❌ Insert error:', error);
      throw error;
    }

    console.log('✅ Scenes saved successfully:', data?.length);
    return data || [];
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
    console.log('💾 Saving prompts for scene:', sceneId, 'Count:', prompts.length);

    const { error: deleteError } = await supabase
      .from('prompts')
      .delete()
      .eq('scene_id', sceneId);

    if (deleteError) {
      console.error('❌ Delete prompts error:', deleteError);
      throw deleteError;
    }

    if (prompts.length === 0) {
      console.log('✅ No prompts to save');
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

    console.log('📤 Inserting prompts:', promptsToInsert.length);

    const { data, error } = await supabase
      .from('prompts')
      .insert(promptsToInsert)
      .select();

    if (error) {
      console.error('❌ Insert prompts error:', error);
      throw error;
    }

    console.log('✅ Prompts saved successfully:', data?.length);
    return data || [];
  } catch (error) {
    console.error('❌ savePrompts error:', error);
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
