import { useReducer, useCallback, useRef } from 'react';
import type { AppAction, AppState } from '@/types';

function loadKeys(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

const initialState: AppState = {
  mainText: '',
  documentText: '',
  episodes: [],
  references: [],
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
  episodePromptTr: '',
  episodeStyleHistory: [],
  isAnalyzing: false,
  isGeneratingPrompts: false,
};

const NON_UNDOABLE = new Set<string>([
  'SET_ACTIVE_SCENE',
  'SET_SELECTION_MODE',
  'SET_CURRENT_KEY_INDEX',
  'ROTATE_API_KEY',
  'SET_API_KEYS',
  'SET_IMAGE_API_KEYS',
  'SET_SETTINGS',
  'START_ANALYSIS',
  'START_PROMPT_GENERATION',
  'SET_REFERENCES',
  'ADD_EPISODE_STYLE_VERSION',
  'SET_EPISODE_STYLE_HISTORY',
]);

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map(existing.map(item => [item.id, item]));
  incoming.forEach(item => {
    if (!map.has(item.id)) map.set(item.id, item);
  });
  return Array.from(map.values());
}

function mergeTimeContextsByLabel<T extends { id: string; label: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map(existing.map(item => [item.label, item]));
  incoming.forEach(item => {
    if (!map.has(item.label)) map.set(item.label, item);
  });
  return Array.from(map.values());
}

type InternalAction = AppAction | { type: '__RESTORE__'; payload: AppState };

function persistState(s: AppState) {
  try {
    localStorage.setItem('gemini_model', s.settings.model);
    if (s.settings.imageModel) localStorage.setItem('gemini_image_model', s.settings.imageModel);
  } catch {
    // noop
  }
}

function reducer(state: AppState, action: InternalAction): AppState {
  if (action.type === '__RESTORE__') {
    persistState(action.payload);
    return action.payload;
  }

  const next = reducerCore(state, action);
  if (next !== state) persistState(next);
  return next;
}

function reducerCore(state: AppState, action: InternalAction): AppState {
  switch (action.type) {
    case 'SET_MAIN_TEXT':
      return { ...state, mainText: action.payload.text, documentText: action.payload.text, mainFileName: action.payload.fileName };
    case 'SET_EPISODES':
      return { ...state, episodes: action.payload };
    case 'REORDER_EPISODES':
      return { ...state, episodes: action.payload };
    case 'MOVE_EPISODE':
      return {
        ...state,
        episodes: state.episodes.map(e =>
          e.id === action.payload.episodeId
            ? { ...e, parentId: action.payload.newParentId, level: action.payload.newParentId ? 1 : 0 }
            : e,
        ),
      };
    case 'SET_ACTIVE_SCENE':
      return { ...state, activeSceneId: action.payload };
    case 'SET_SELECTION_MODE':
      return { ...state, selectionMode: action.payload };
    case 'SET_API_KEYS':
      return { ...state, apiKeys: action.payload, currentKeyIndex: 0 };
    case 'SET_IMAGE_API_KEYS':
      return { ...state, imageApiKeys: action.payload };
    case 'SET_CURRENT_KEY_INDEX':
      return { ...state, currentKeyIndex: action.payload };
    case 'ROTATE_API_KEY':
      if (state.apiKeys.length <= 1) return state;
      return { ...state, currentKeyIndex: (state.currentKeyIndex + 1) % state.apiKeys.length };
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };

    case 'SET_REFERENCES':
      return { ...state, references: action.payload };
    case 'ADD_REFERENCE':
      return { ...state, references: [...state.references, action.payload] };
    case 'REMOVE_REFERENCE':
      return { ...state, references: state.references.filter(r => r.id !== action.payload) };
    case 'UPDATE_REFERENCE':
      return { ...state, references: state.references.map(r => r.id === action.payload.id ? action.payload : r) };

    case 'START_ANALYSIS':
      return { ...state, isAnalyzing: true };
    case 'FINISH_ANALYSIS': {
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

      const nextSequenceStart = state.sceneCards.length > 0
        ? Math.max(...state.sceneCards.map(s => s.sceneNumber)) + 1
        : 1;

      const updatedNewCards = newCards.map((sc, index) => ({
        ...sc,
        sceneNumber: nextSequenceStart + index,
        timeContextIds: (sc.timeContextIds ?? [])
          .map(incomingId => {
            const label = incomingIdToLabel.get(incomingId);
            if (label) return canonicalLabelToId.get(label) ?? incomingId;
            return incomingId;
          })
          .filter((id, idx, arr) => arr.indexOf(id) === idx),
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

    case 'SET_TIME_CONTEXTS':
      return { ...state, timeContexts: action.payload };
    case 'UPDATE_SCENE_CARD_NOTE':
      return {
        ...state,
        sceneCards: state.sceneCards.map(sc => sc.id === action.payload.sceneId ? { ...sc, visualNote: action.payload.note } : sc),
      };
    case 'ADD_CHARACTER_TO_SCENE_CARD':
      return {
        ...state,
        sceneCards: state.sceneCards.map(sc =>
          sc.id === action.payload.sceneId
            ? { ...sc, characterIds: sc.characterIds.includes(action.payload.characterId) ? sc.characterIds : [...sc.characterIds, action.payload.characterId] }
            : sc,
        ),
      };
    case 'REMOVE_CHARACTER_FROM_SCENE_CARD':
      return {
        ...state,
        sceneCards: state.sceneCards.map(sc =>
          sc.id === action.payload.sceneId
            ? { ...sc, characterIds: sc.characterIds.filter(id => id !== action.payload.characterId) }
            : sc,
        ),
      };
    case 'ADD_LOCATION_TO_SCENE_CARD':
      return {
        ...state,
        sceneCards: state.sceneCards.map(sc =>
          sc.id === action.payload.sceneId
            ? { ...sc, locationIds: sc.locationIds.includes(action.payload.locationId) ? sc.locationIds : [...sc.locationIds, action.payload.locationId] }
            : sc,
        ),
      };
    case 'REMOVE_LOCATION_FROM_SCENE_CARD':
      return {
        ...state,
        sceneCards: state.sceneCards.map(sc =>
          sc.id === action.payload.sceneId
            ? { ...sc, locationIds: sc.locationIds.filter(id => id !== action.payload.locationId) }
            : sc,
        ),
      };

    case 'START_PROMPT_GENERATION':
      return {
        ...state,
        sceneCards: state.sceneCards.map(sc => sc.id === action.payload.sceneId ? { ...sc, status: 'generating' } : sc),
      };
    case 'FINISH_PROMPT_GENERATION':
      return {
        ...state,
        sceneCards: state.sceneCards.map(sc =>
          sc.id === action.payload.sceneId
            ? {
                ...sc,
                prompts: action.payload.prompts,
                status: 'ready',
                analysis: action.payload.analysis,
                optimizations: action.payload.optimizations,
              }
            : sc,
        ),
      };
    case 'SET_ALL_PROMPTS':
      return {
        ...state,
        sceneCards: state.sceneCards.map(sc => {
          const prompts = action.payload[sc.id];
          return prompts ? { ...sc, prompts, status: 'ready' } : sc;
        }),
      };
    case 'DELETE_SCENE_CARD':
      return { ...state, sceneCards: state.sceneCards.filter(sc => sc.id !== action.payload) };
    case 'ADD_NEW_CHARACTER_TO_SCENE_CARD':
      return {
        ...state,
        characters: [...state.characters, action.payload.character],
        sceneCards: state.sceneCards.map(sc =>
          sc.id === action.payload.sceneId ? { ...sc, characterIds: [...sc.characterIds, action.payload.character.id] } : sc,
        ),
      };
    case 'ADD_NEW_LOCATION_TO_SCENE_CARD':
      return {
        ...state,
        locations: [...state.locations, action.payload.location],
        sceneCards: state.sceneCards.map(sc =>
          sc.id === action.payload.sceneId ? { ...sc, locationIds: [...sc.locationIds, action.payload.location.id] } : sc,
        ),
      };

    case 'SET_MASTER_PROMPT':
      return { ...state, masterPrompt: action.payload };
    case 'SET_EPISODE_PROMPT':
      return { ...state, episodePrompt: action.payload };
    case 'SET_EPISODE_PROMPT_TR':
      return { ...state, episodePromptTr: action.payload };
    case 'ADD_EPISODE_STYLE_VERSION':
      return { ...state, episodeStyleHistory: [action.payload, ...state.episodeStyleHistory].slice(0, 50) };
    case 'SET_EPISODE_STYLE_HISTORY':
      return { ...state, episodeStyleHistory: action.payload };

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
            : sc,
        ),
      };
    case 'REMOVE_TIME_CONTEXT_FROM_SCENE_CARD':
      return {
        ...state,
        sceneCards: state.sceneCards.map(sc =>
          sc.id === action.payload.sceneId
            ? { ...sc, timeContextIds: sc.timeContextIds.filter(id => id !== action.payload.timeContextId) }
            : sc,
        ),
      };

    case 'REORDER_SCENE_CARDS':
      return { ...state, sceneCards: action.payload };
    case 'SET_PINNED_PROMPT':
      return {
        ...state,
        sceneCards: state.sceneCards.map(sc =>
          sc.id === action.payload.sceneId
            ? {
                ...sc,
                prompts: sc.prompts.map(p => ({
                  ...p,
                  isPinned: p.id === action.payload.promptId,
                  isPinnedByAI: action.payload.byAI ? p.id === action.payload.promptId : false,
                })),
              }
            : sc,
        ),
      };

    default:
      return state;
  }
}

const MAX_HISTORY = 50;

export function useAppState() {
  const [state, rawDispatch] = useReducer(reducer, initialState);

  const stateRef = useRef<AppState>(initialState);
  const historyRef = useRef<AppState[]>([initialState]);
  const indexRef = useRef(0);
  stateRef.current = state;

  const dispatch = useCallback((action: AppAction) => {
    const isUndoable = !NON_UNDOABLE.has(action.type);

    if (isUndoable) {
      const before = stateRef.current;
      const after = reducer(before, action);
      historyRef.current = historyRef.current.slice(0, indexRef.current + 1);
      historyRef.current.push(after);
      if (historyRef.current.length > MAX_HISTORY) {
        historyRef.current.shift();
      } else {
        indexRef.current += 1;
      }
    }

    rawDispatch(action);
  }, []);

  const undo = useCallback(() => {
    if (indexRef.current <= 0) return;
    indexRef.current -= 1;
    rawDispatch({ type: '__RESTORE__', payload: historyRef.current[indexRef.current] });
  }, []);

  const redo = useCallback(() => {
    if (indexRef.current >= historyRef.current.length - 1) return;
    indexRef.current += 1;
    rawDispatch({ type: '__RESTORE__', payload: historyRef.current[indexRef.current] });
  }, []);

  return { state, dispatch, undo, redo };
}
