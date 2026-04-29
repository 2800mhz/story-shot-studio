import type { ProjectType, RenderMode } from '@/types';

export interface EpisodePreferences {
  projectType?: ProjectType;
  renderMode?: RenderMode;
}

function getStorageKey(episodeId: string): string {
  return `episode_preferences:${episodeId}`;
}

export function loadEpisodePreferences(episodeId: string): EpisodePreferences | null {
  try {
    const raw = localStorage.getItem(getStorageKey(episodeId));
    if (!raw) return null;
    return JSON.parse(raw) as EpisodePreferences;
  } catch {
    return null;
  }
}

export function saveEpisodePreferences(episodeId: string, preferences: EpisodePreferences): void {
  try {
    localStorage.setItem(getStorageKey(episodeId), JSON.stringify(preferences));
  } catch {
    // Ignore local storage failures for now.
  }
}
