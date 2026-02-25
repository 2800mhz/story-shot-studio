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
  mainText: loadJson('app_mainText', ''),
  episodes: loadJson('app_episodes', []),
  scenes: loadJson('app_scenes', []),
  extractedEntities: loadJson('app_extractedEntities', []),
  sceneAnalyses: loadJson('app_sceneAnalyses', {}),
  consistencyGroups: loadJson('app_consistencyGroups', []),
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
  mainFileName: loadJson('app_mainFileName', ''),
};

// Actions that should NOT push to undo history (transient / settings)
const NON_UNDOABLE = new Set<string>([
  'SET_ACTIVE_SCENE', 'SET_SELECTION_MODE', 'SET_CURRENT_KEY_INDEX',
  'ROTATE_API_KEY', 'SET_API_KEYS', 'SET_IMAGE_API_KEYS', 'SET_SETTINGS',
]);

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
    localStorage.setItem('app_mainText', JSON.stringify(s.mainText));
    localStorage.setItem('app_episodes', JSON.stringify(s.episodes));
    localStorage.setItem('app_scenes', JSON.stringify(s.scenes));
    localStorage.setItem('app_extractedEntities', JSON.stringify(s.extractedEntities));
    localStorage.setItem('app_sceneAnalyses', JSON.stringify(s.sceneAnalyses));
    localStorage.setItem('app_consistencyGroups', JSON.stringify(s.consistencyGroups));
    localStorage.setItem('app_mainFileName', JSON.stringify(s.mainFileName));
  } catch { /* storage full — silently ignore */ }
}

function reducerCore(state: AppState, action: InternalAction): AppState {
  switch (action.type) {
    case 'SET_MAIN_TEXT':
      return { ...state, mainText: action.payload.text, mainFileName: action.payload.fileName };
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
