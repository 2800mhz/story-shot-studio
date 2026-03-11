import { useReducer, useCallback, useRef } from 'react';
import type { AppState, AppAction } from '@/types';

function loadKeys(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

const initialState: AppState = {
  mainText: '',
  documentText: '',
  episodes: [],
  scenes: [],
  extractedEntities: [],
  sceneAnalyses: {},
  consistencyGroups: [],
  activeSceneId: null,
  selectionMode: 'scene',
  apiKeys: loadKeys('gemini_api_keys'),
  currentKeyIndex: 0,
  settings: {
    model: localStorage.getItem('gemini_model') || 'gemini-2.5-flash',
    thinkingMode: false,
    variantCount: 3,
    temperature: 1.0,
    imageModel: localStorage.getItem('gemini_image_model') || 'gemini-2.0-flash-exp',
  },
  imageApiKeys: loadKeys('gemini_image_api_keys'),
  mainFileName: '',
  sceneCards: [],
  characters: [],
  locations: [],
  timeContexts: loadJson('time_contexts', []),
  masterPrompt: '',
  episodePrompt: '',
  isAnalyzing: false,
  isGeneratingPrompts: false,
};

// Actions that should NOT push to undo history (transient / settings)
const NON_UNDOABLE = new Set<string>([
  'SET_ACTIVE_SCENE', 'SET_SELECTION_MODE', 'SET_CURRENT_KEY_INDEX',
  'ROTATE_API_KEY', 'SET_API_KEYS', 'SET_IMAGE_API_KEYS', 'SET_SETTINGS',
  'START_ANALYSIS', 'START_PROMPT_GENERATION',
]);

// Merge two arrays by id, preferring existing items
function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map(existing.map(item => [item.id, item]));
  incoming.forEach(item => { if (!map.has(item.id)) map.set(item.id, item); });
  return Array.from(map.values());
}

// Merge two TimeContext arrays by label, preferring existing items (keeps existing IDs)
function mergeTimeContextsByLabel<T extends { id: string; label: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map(existing.map(item => [item.label, item]));
  incoming.forEach(item => { if (!map.has(item.label)) map.set(item.label, item); });
  return Array.from(map.values());
}

type InternalAction = AppAction | { type: '__RESTORE__'; payload: AppState };

function reducer(state: AppState, action: InternalAction): AppState {
  if (action.type === '__RESTORE__') {
    persistState(action.payload);
    return action.payload;
  }

  const next = reducerCore(state, action);
  if (next !== state) persistState(next);
  return next;
}

function persistState(s: AppState) {
  try {
    // Only persist user preferences (API keys, settings) — not project-specific data.
    // Project data is stored in Supabase per-episode to avoid cross-project data leakage.
    localStorage.setItem('gemini_api_keys', JSON.stringify(s.apiKeys));
    localStorage.setItem('gemini_image_api_keys', JSON.stringify(s.imageApiKeys));
    localStorage.setItem('gemini_model', s.settings.model);
    if (s.settings.imageModel) localStorage.setItem('gemini_image_model', s.settings.imageModel);
  } catch { /* storage full — silently ignore */ }
}

function reducerCore(state: AppState, action: InternalAction): AppState {
  switch (action.type) {
    case 'SET_MAIN_TEXT':
      return { ...state, mainText: action.payload.text, documentText: action.payload.text, mainFileName: action.payload.fileName };
    case 'SET_EXTRACTED_ENTITIES':
      return { ...state, extractedEntities: action.payload };
    case 'ADD_EXTRACTED_ENTITY':
      return { ...state, extractedEntities: [...state.extractedEntities, action.payload] };
    case 'UPDATE_ENTITY': {
      const { entityId, updates } = action.payload;
      return {
        ...state,
        extractedEntities: state.extractedEntities.map(e =>
          e.id === entityId ? { ...e, ...updates } : e
        ),
      };
    }
    case 'SET_SCENE_ANALYSIS':
      return {
        ...state,
        sceneAnalyses: {
          ...state.sceneAnalyses,
          [action.payload.sceneId]: action.payload.analysis,
        },
      };
    case 'SET_EPISODES':
      return { ...state, episodes: action.payload };
    case 'REORDER_EPISODES':
      return { ...state, episodes: action.payload };
    case 'MOVE_EPISODE': {
      const { episodeId, newParentId } = action.payload;
      const ep = state.episodes.find(e => e.id === episodeId);
      if (!ep) return state;
      return {
        ...state,
        episodes: state.episodes.map(e =>
          e.id === episodeId ? { ...e, parentId: newParentId, level: newParentId ? 1 : 0 } : e
        ),
      };
    }
    case 'ADD_SCENE':
      return { ...state, scenes: [...state.scenes, action.payload] };
    case 'REMOVE_SCENE': {
      const newGroups = state.consistencyGroups.map(g => ({
        ...g,
        sceneIds: g.sceneIds.filter(id => id !== action.payload),
      })).filter(g => g.sceneIds.length > 0);
      const updatedScenes = state.scenes.filter(s => s.id !== action.payload);
      return {
        ...state,
        scenes: updatedScenes,
        consistencyGroups: newGroups,
        activeSceneId: state.activeSceneId === action.payload ? null : state.activeSceneId,
      };
    }
    case 'UPDATE_SCENE':
      return { ...state, scenes: state.scenes.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'REORDER_SCENES':
      return { ...state, scenes: action.payload };
    case 'SET_ACTIVE_SCENE':
      return { ...state, activeSceneId: action.payload };
    case 'SET_SELECTION_MODE':
      return { ...state, selectionMode: action.payload };
    case 'SET_API_KEYS':
      localStorage.setItem('gemini_api_keys', JSON.stringify(action.payload));
      return { ...state, apiKeys: action.payload, currentKeyIndex: 0 };
    case 'SET_IMAGE_API_KEYS':
      localStorage.setItem('gemini_image_api_keys', JSON.stringify(action.payload));
      return { ...state, imageApiKeys: action.payload };
    case 'SET_CURRENT_KEY_INDEX':
      return { ...state, currentKeyIndex: action.payload };
    case 'ROTATE_API_KEY':
      if (state.apiKeys.length <= 1) return state;
      return { ...state, currentKeyIndex: (state.currentKeyIndex + 1) % state.apiKeys.length };
    case 'SET_SETTINGS': {
      const newSettings = { ...state.settings, ...action.payload };
      localStorage.setItem('gemini_model', newSettings.model);
      if (newSettings.imageModel) localStorage.setItem('gemini_image_model', newSettings.imageModel);
      return { ...state, settings: newSettings };
    }
    case 'ADD_SEGMENT_TO_SCENE':
      return {
        ...state,
        scenes: state.scenes.map(s =>
          s.id === action.payload.sceneId
            ? { ...s, segments: [...s.segments, action.payload.segment] }
            : s
        ),
      };
    case 'ADD_SUBJECT_REFERENCE':
      return {
        ...state,
        scenes: state.scenes.map(s =>
          s.id === action.payload.sceneId
            ? { ...s, subjectReferences: [...s.subjectReferences, action.payload.segment] }
            : s
        ),
      };
    case 'SET_SCENE_NOTE':
      return {
        ...state,
        scenes: state.scenes.map(s =>
          s.id === action.payload.sceneId ? { ...s, note: action.payload.note } : s
        ),
      };
    case 'SET_GROUP_NOTE':
      return {
        ...state,
        consistencyGroups: state.consistencyGroups.map(g =>
          g.id === action.payload.groupId ? { ...g, note: action.payload.note } : g
        ),
      };
    case 'REMOVE_PROMPT': {
      const scene = state.scenes.find(s => s.id === action.payload.sceneId);
      if (!scene) return state;
      const newPrompts = scene.prompts.filter(p => p.id !== action.payload.promptId);
      return {
        ...state,
        scenes: state.scenes.map(s =>
          s.id === action.payload.sceneId
            ? { ...s, prompts: newPrompts, status: newPrompts.length === 0 ? 'pending' : s.status }
            : s
        ),
      };
    }
    case 'ADD_SUB_SCENE':
      return {
        ...state,
        scenes: state.scenes.map(s =>
          s.id === action.payload.sceneId
            ? { ...s, subScenes: [...(s.subScenes || []), action.payload.subScene] }
            : s
        ),
      };
    case 'REMOVE_SUB_SCENE':
      return {
        ...state,
        scenes: state.scenes.map(s =>
          s.id === action.payload.sceneId
            ? { ...s, subScenes: (s.subScenes || []).filter(ss => ss.id !== action.payload.subSceneId) }
            : s
        ),
      };
    case 'UPDATE_SUB_SCENE':
      return {
        ...state,
        scenes: state.scenes.map(s =>
          s.id === action.payload.sceneId
            ? { ...s, subScenes: (s.subScenes || []).map(ss => ss.id === action.payload.subScene.id ? action.payload.subScene : ss) }
            : s
        ),
      };
    case 'SET_SUB_SCENE_NOTE':
      return {
        ...state,
        scenes: state.scenes.map(s =>
          s.id === action.payload.sceneId
            ? { ...s, subScenes: (s.subScenes || []).map(ss => ss.id === action.payload.subSceneId ? { ...ss, note: action.payload.note } : ss) }
            : s
        ),
      };
    case 'REMOVE_SUB_SCENE_PROMPT': {
      const scene = state.scenes.find(s => s.id === action.payload.sceneId);
      if (!scene) return state;
      return {
        ...state,
        scenes: state.scenes.map(s =>
          s.id === action.payload.sceneId
            ? {
                ...s,
                subScenes: (s.subScenes || []).map(ss =>
                  ss.id === action.payload.subSceneId
                    ? { ...ss, prompts: ss.prompts.filter(p => p.id !== action.payload.promptId), status: ss.prompts.filter(p => p.id !== action.payload.promptId).length === 0 ? 'pending' : ss.status }
                    : ss
                ),
              }
            : s
        ),
      };
    }
    case 'ADD_CONSISTENCY_GROUP':
      return { ...state, consistencyGroups: [...state.consistencyGroups, action.payload] };
    case 'ATTACH_ENTITY_TO_PROMPT': {
      const { sceneId, promptId, entityId } = action.payload;
      return {
        ...state,
        scenes: state.scenes.map(scene => {
          if (scene.id !== sceneId) return scene;
          return {
            ...scene,
            prompts: scene.prompts.map(p => {
              if (p.id !== promptId) return p;
              const attachedIds = p.attachedEntityIds || [];
              if (attachedIds.includes(entityId)) return p;
              return { ...p, attachedEntityIds: [...attachedIds, entityId] };
            }),
          };
        }),
      };
    }
    case 'DETACH_ENTITY_FROM_PROMPT': {
      const { sceneId, promptId, entityId } = action.payload;
      return {
        ...state,
        scenes: state.scenes.map(scene => {
          if (scene.id !== sceneId) return scene;
          return {
            ...scene,
            prompts: scene.prompts.map(p => {
              if (p.id !== promptId) return p;
              return {
                ...p,
                attachedEntityIds: (p.attachedEntityIds || []).filter(id => id !== entityId),
              };
            }),
          };
        }),
      };
    }
    case 'ADD_SCENE_TO_GROUP': {
      const updatedGroups = state.consistencyGroups.map(g =>
        g.id === action.payload.groupId
          ? { ...g, sceneIds: g.sceneIds.includes(action.payload.sceneId) ? g.sceneIds : [...g.sceneIds, action.payload.sceneId] }
          : g
      );
      const updatedScenes = state.scenes.map(s =>
        s.id === action.payload.sceneId
          ? { ...s, consistencyGroupIds: s.consistencyGroupIds.includes(action.payload.groupId) ? s.consistencyGroupIds : [...s.consistencyGroupIds, action.payload.groupId] }
          : s
      );
      return { ...state, consistencyGroups: updatedGroups, scenes: updatedScenes };
    }
    case 'REMOVE_SCENE_FROM_GROUP': {
      const groups = state.consistencyGroups.map(g =>
        g.id === action.payload.groupId
          ? { ...g, sceneIds: g.sceneIds.filter(id => id !== action.payload.sceneId) }
          : g
      ).filter(g => g.sceneIds.length > 0);
      const scenes = state.scenes.map(s =>
        s.id === action.payload.sceneId ? { ...s, consistencyGroupIds: s.consistencyGroupIds.filter(gId => gId !== action.payload.groupId) } : s
      );
      return { ...state, consistencyGroups: groups, scenes };
    }
    // Two-stage AI workflow
    case 'START_ANALYSIS':
      return { ...state, isAnalyzing: true };
    case 'FINISH_ANALYSIS': {
      const { sceneCards: newCards, characters: newChars, locations: newLocs, suggestedTimeContexts } = action.payload;
      // Merge incoming time contexts by label (dedup), preferring existing entries
      const mergedTimeContexts = suggestedTimeContexts?.length
        ? mergeTimeContextsByLabel(state.timeContexts, suggestedTimeContexts)
        : state.timeContexts;

      // Build a mapping from incoming (analyzer-generated) time context IDs to canonical (merged) IDs.
      // When an incoming label matches an existing time context, the merged list keeps the existing ID.
      const incomingIdToLabel = new Map<string, string>();
      (suggestedTimeContexts ?? []).forEach(tc => {
        if (tc.label) incomingIdToLabel.set(tc.id, tc.label);
      });
      const canonicalLabelToId = new Map<string, string>();
      mergedTimeContexts.forEach(tc => canonicalLabelToId.set(tc.label, tc.id));

      // Remap each card's timeContextIds from incoming IDs to canonical IDs
      // Each card keeps ONLY its own time context (not all of them)
      const updatedNewCards = newCards.map(sc => ({
        ...sc,
        timeContextIds: (sc.timeContextIds ?? [])
          .map(incomingId => {
            const label = incomingIdToLabel.get(incomingId);
            if (label) {
              return canonicalLabelToId.get(label) ?? incomingId;
            }
            return incomingId;
          })
          .filter((id, idx, arr) => arr.indexOf(id) === idx), // deduplicate
      }));

      return {
        ...state,
        isAnalyzing: false,
        sceneCards: [...state.sceneCards, ...updatedNewCards],
        characters: mergeById(state.characters, newChars),
        locations: mergeById(state.locations, newLocs),
        timeContexts: mergedTimeContexts,
      };
    }
    case 'REPLACE_ANALYSIS': {
      const { sceneCards: newCards, characters: newChars, locations: newLocs, suggestedTimeContexts } = action.payload;
      const mergedTimeContexts = suggestedTimeContexts?.length
        ? mergeTimeContextsByLabel(state.timeContexts, suggestedTimeContexts)
        : state.timeContexts;

      const incomingIdToLabel = new Map<string, string>();
      (suggestedTimeContexts ?? []).forEach(tc => {
        if (tc.label) incomingIdToLabel.set(tc.id, tc.label);
      });
      const canonicalLabelToId = new Map<string, string>();
      mergedTimeContexts.forEach(tc => canonicalLabelToId.set(tc.label, tc.id));

      const updatedNewCards = newCards.map(sc => ({
        ...sc,
        timeContextIds: (sc.timeContextIds ?? [])
          .map(incomingId => {
            const label = incomingIdToLabel.get(incomingId);
            if (label) {
              return canonicalLabelToId.get(label) ?? incomingId;
            }
            return incomingId;
          })
          .filter((id, idx, arr) => arr.indexOf(id) === idx),
      }));

      return {
        ...state,
        isAnalyzing: false,
        sceneCards: updatedNewCards,
        characters: newChars,
        locations: newLocs,
        timeContexts: mergedTimeContexts,
      };
    }
    case 'SET_TIME_CONTEXTS':
      return { ...state, timeContexts: action.payload };
    case 'UPDATE_SCENE_CARD_NOTE':
      return {
        ...state,
        sceneCards: state.sceneCards.map(sc =>
          sc.id === action.payload.sceneId ? { ...sc, visualNote: action.payload.note } : sc
        ),
      };
    case 'ADD_CHARACTER_TO_SCENE_CARD':
      return {
        ...state,
        sceneCards: state.sceneCards.map(sc =>
          sc.id === action.payload.sceneId
            ? { ...sc, characterIds: sc.characterIds.includes(action.payload.characterId) ? sc.characterIds : [...sc.characterIds, action.payload.characterId] }
            : sc
        ),
      };
    case 'REMOVE_CHARACTER_FROM_SCENE_CARD':
      return {
        ...state,
        sceneCards: state.sceneCards.map(sc =>
          sc.id === action.payload.sceneId
            ? { ...sc, characterIds: sc.characterIds.filter(id => id !== action.payload.characterId) }
            : sc
        ),
      };
    case 'ADD_LOCATION_TO_SCENE_CARD':
      return {
        ...state,
        sceneCards: state.sceneCards.map(sc =>
          sc.id === action.payload.sceneId
            ? { ...sc, locationIds: sc.locationIds.includes(action.payload.locationId) ? sc.locationIds : [...sc.locationIds, action.payload.locationId] }
            : sc
        ),
      };
    case 'REMOVE_LOCATION_FROM_SCENE_CARD':
      return {
        ...state,
        sceneCards: state.sceneCards.map(sc =>
          sc.id === action.payload.sceneId
            ? { ...sc, locationIds: sc.locationIds.filter(id => id !== action.payload.locationId) }
            : sc
        ),
      };
    case 'START_PROMPT_GENERATION':
      return {
        ...state,
        sceneCards: state.sceneCards.map(sc =>
          sc.id === action.payload.sceneId ? { ...sc, status: 'generating' } : sc
        ),
      };
    case 'FINISH_PROMPT_GENERATION':
      return {
        ...state,
        sceneCards: state.sceneCards.map(sc =>
          sc.id === action.payload.sceneId ? { 
            ...sc, 
            prompts: action.payload.prompts, 
            status: 'ready',
            analysis: action.payload.analysis,
            optimizations: action.payload.optimizations,
          } : sc
        ),
      };
    case 'DELETE_SCENE_CARD':
      return {
        ...state,
        sceneCards: state.sceneCards.filter(sc => sc.id !== action.payload),
      };
    case 'ADD_NEW_CHARACTER_TO_SCENE_CARD': {
      const { sceneId, character } = action.payload;
      return {
        ...state,
        characters: [...state.characters, character],
        sceneCards: state.sceneCards.map(sc =>
          sc.id === sceneId
            ? { ...sc, characterIds: [...sc.characterIds, character.id] }
            : sc
        ),
      };
    }
    case 'ADD_NEW_LOCATION_TO_SCENE_CARD': {
      const { sceneId, location } = action.payload;
      return {
        ...state,
        locations: [...state.locations, location],
        sceneCards: state.sceneCards.map(sc =>
          sc.id === sceneId
            ? { ...sc, locationIds: [...sc.locationIds, location.id] }
            : sc
        ),
      };
    }
    case 'SET_MASTER_PROMPT':
      return { ...state, masterPrompt: action.payload };
    case 'SET_EPISODE_PROMPT':
      return { ...state, episodePrompt: action.payload };
    case 'SET_ANALYZING':
      return { ...state, isAnalyzing: action.payload };
    case 'SET_DOCUMENT_TEXT':
      return { ...state, documentText: action.payload, mainText: action.payload };
    case 'SET_SCENES':
      return { ...state, sceneCards: action.payload };
    case 'SET_CHARACTERS':
      return { ...state, characters: action.payload };
    case 'SET_LOCATIONS':
      return { ...state, locations: action.payload };
    case 'UPSERT_CHARACTER': {
      const exists = state.characters.some(c => c.id === action.payload.id);
      return {
        ...state,
        characters: exists
          ? state.characters.map(c => c.id === action.payload.id ? action.payload : c)
          : [...state.characters, action.payload],
      };
    }
    case 'DELETE_CHARACTER':
      return {
        ...state,
        characters: state.characters.filter(c => c.id !== action.payload),
        sceneCards: state.sceneCards.map(sc => ({
          ...sc,
          characterIds: sc.characterIds.filter(id => id !== action.payload),
        })),
      };
    case 'UPSERT_LOCATION': {
      const exists = state.locations.some(l => l.id === action.payload.id);
      return {
        ...state,
        locations: exists
          ? state.locations.map(l => l.id === action.payload.id ? action.payload : l)
          : [...state.locations, action.payload],
      };
    }
    case 'DELETE_LOCATION':
      return {
        ...state,
        locations: state.locations.filter(l => l.id !== action.payload),
        sceneCards: state.sceneCards.map(sc => ({
          ...sc,
          locationIds: sc.locationIds.filter(id => id !== action.payload),
        })),
      };
    case 'ADD_TIME_CONTEXT':
      return { ...state, timeContexts: [...state.timeContexts, action.payload] };
    case 'UPDATE_TIME_CONTEXT':
      return {
        ...state,
        timeContexts: state.timeContexts.map(tc => tc.id === action.payload.id ? action.payload : tc),
      };
    case 'DELETE_TIME_CONTEXT':
      return {
        ...state,
        timeContexts: state.timeContexts.filter(tc => tc.id !== action.payload),
        sceneCards: state.sceneCards.map(sc => ({
          ...sc,
          timeContextIds: sc.timeContextIds.filter(id => id !== action.payload),
        })),
      };
    case 'ADD_TIME_CONTEXT_TO_SCENE_CARD':
      return {
        ...state,
        sceneCards: state.sceneCards.map(sc =>
          sc.id === action.payload.sceneId
            ? { ...sc, timeContextIds: sc.timeContextIds.includes(action.payload.timeContextId) ? sc.timeContextIds : [...sc.timeContextIds, action.payload.timeContextId] }
            : sc
        ),
      };
    case 'REMOVE_TIME_CONTEXT_FROM_SCENE_CARD':
      return {
        ...state,
        sceneCards: state.sceneCards.map(sc =>
          sc.id === action.payload.sceneId
            ? { ...sc, timeContextIds: sc.timeContextIds.filter(id => id !== action.payload.timeContextId) }
            : sc
        ),
      };
    case 'REORDER_SCENE_CARDS':
      return { ...state, sceneCards: action.payload };
    default:
      return state;
  }
}

const MAX_HISTORY = 50;

export function useAppState() {
  const [state, rawDispatch] = useReducer(reducer, initialState);

  // Keep a snapshot of current state for undo
  const stateRef = useRef<AppState>(initialState);
  const historyRef = useRef<AppState[]>([initialState]);
  const indexRef = useRef(0);
  stateRef.current = state;

  const dispatch = useCallback((action: AppAction) => {
    const isUndoable = !NON_UNDOABLE.has(action.type);

    if (isUndoable) {
      const before = stateRef.current;
      // Compute next state deterministically
      const after = reducer(before, action);
      // Trim forward history
      historyRef.current = historyRef.current.slice(0, indexRef.current + 1);
      historyRef.current.push(after);
      if (historyRef.current.length > MAX_HISTORY) {
        historyRef.current.shift();
      } else {
        indexRef.current++;
      }
    }

    rawDispatch(action);
  }, []);

  const undo = useCallback(() => {
    if (indexRef.current <= 0) return;
    indexRef.current--;
    const snap = historyRef.current[indexRef.current];
    rawDispatch({ type: '__RESTORE__', payload: snap });
  }, []);

  const redo = useCallback(() => {
    if (indexRef.current >= historyRef.current.length - 1) return;
    indexRef.current++;
    const snap = historyRef.current[indexRef.current];
    rawDispatch({ type: '__RESTORE__', payload: snap });
  }, []);

  return { state, dispatch, undo, redo };
}
