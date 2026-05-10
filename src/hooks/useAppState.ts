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

function loadSetting(key: string, fallback: string): string {
  const raw = localStorage.getItem(key);
  return raw && raw.trim() ? raw : fallback;
}

function normalizeSettings(settings: AppState['settings']): AppState['settings'] {
  const geminiModel = settings.geminiModel?.trim() || settings.model?.trim() || 'gemini-2.0-flash';
  return {
    ...settings,
    model: geminiModel,
    geminiModel,
    groqModel: settings.groqModel?.trim() || 'llama-3.3-70b-versatile',
    deepinfraModel: settings.deepinfraModel?.trim() || 'zai-org/GLM-5',
    openaiModel: settings.openaiModel?.trim() || 'gpt-5.4',
    anthropicModel: settings.anthropicModel?.trim() || 'claude-3-5-sonnet-20241022',
  };
}

function pushUnique(values: string[], nextValue: string): string[] {
  return values.includes(nextValue) ? values : [...values, nextValue];
}

function markSceneCardPromptsStale(sceneCard: AppState['sceneCards'][number], reason: string): AppState['sceneCards'][number] {
  return {
    ...sceneCard,
    promptsNeedRefresh: true,
    staleReasons: pushUnique(sceneCard.staleReasons ?? [], reason),
    prompts: sceneCard.prompts.map((prompt) => ({
      ...prompt,
      isStale: true,
      staleReason: prompt.staleReason ?? reason,
    })),
  };
}

const MAX_PROMPT_VERSIONS = 6;

function clampPromptVersions<T extends { versions?: string[] }>(prompt: T): T {
  if (!Array.isArray(prompt.versions) || prompt.versions.length <= MAX_PROMPT_VERSIONS) {
    return prompt;
  }

  return {
    ...prompt,
    versions: prompt.versions.slice(-MAX_PROMPT_VERSIONS),
  };
}

function reconcileCameraAngleSlots(
  slots: AppState['sceneCards'][number]['cameraAngleSlots'],
  prompts: AppState['sceneCards'][number]['prompts'],
): AppState['sceneCards'][number]['cameraAngleSlots'] {
  if (!Array.isArray(slots)) return slots;

  const promptsById = new Map(prompts.map(prompt => [prompt.id, prompt]));
  const promptsBySlotId = new Map(
    prompts
      .filter(prompt => !!prompt.slotId)
      .map(prompt => [prompt.slotId as string, prompt])
  );

  return slots.map(slot => {
    const linkedPrompt = (slot.promptId ? promptsById.get(slot.promptId) : undefined)
      ?? promptsBySlotId.get(slot.id);

    if (linkedPrompt) {
      return { ...slot, promptId: linkedPrompt.id, isGenerating: false };
    }

    if (slot.promptId) {
      const { promptId: _orphanedPromptId, ...rest } = slot;
      return { ...rest, isGenerating: false };
    }

    return { ...slot, isGenerating: false };
  });
}

const initialState: AppState = {
  projectType: 'documentary',
  renderMode: 'photoreal',
  mainText: '',
  documentText: '',
  episodes: [],
  references: [],
  activeSceneId: null,
  apiKeys: loadKeys('gemini_api_keys'),
  currentKeyIndex: 0,
  settings: {
    model: loadSetting('gemini_model', 'gemini-2.0-flash'),
    geminiModel: loadSetting('gemini_model', 'gemini-2.0-flash'),
    groqModel: loadSetting('groq_model', 'llama-3.3-70b-versatile'),
    deepinfraModel: loadSetting('deepinfra_model', 'zai-org/GLM-5'),
    openaiModel: loadSetting('openai_model', 'gpt-5.4'),
    anthropicModel: loadSetting('anthropic_model', 'claude-3-5-sonnet-20241022'),
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

// Actions that should NOT push to undo history (transient / settings)
const NON_UNDOABLE = new Set<string>([
  'SET_ACTIVE_SCENE', 'SET_CURRENT_KEY_INDEX',
  'ROTATE_API_KEY', 'SET_API_KEYS', 'SET_IMAGE_API_KEYS', 'SET_SETTINGS',
  'START_ANALYSIS', 'START_PROMPT_GENERATION', 'SET_REFERENCES',
  'RESET_EPISODE_WORKSPACE',
  'ADD_EPISODE_STYLE_VERSION', 'SET_EPISODE_STYLE_HISTORY',
  // AI output hydration can get very large; keeping every generation step in undo
  // history burns memory quickly and provides limited user value.
  'FINISH_ANALYSIS', 'FINISH_PROMPT_GENERATION', 'SET_ALL_PROMPTS',
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
    localStorage.setItem('gemini_model', s.settings.geminiModel || s.settings.model);
    localStorage.setItem('groq_model', s.settings.groqModel);
    localStorage.setItem('deepinfra_model', s.settings.deepinfraModel);
    localStorage.setItem('openai_model', s.settings.openaiModel);
    localStorage.setItem('anthropic_model', s.settings.anthropicModel);
    if (s.settings.imageModel) localStorage.setItem('gemini_image_model', s.settings.imageModel);
  } catch { /* storage full — silently ignore */ }
}

function reducerCore(state: AppState, action: InternalAction): AppState {
  switch (action.type) {
    case 'SET_PROJECT_TYPE':
      return { ...state, projectType: action.payload };
    case 'SET_RENDER_MODE':
      return { ...state, renderMode: action.payload };
    case 'SET_MAIN_TEXT':
      return { ...state, mainText: action.payload.text, documentText: action.payload.text, mainFileName: action.payload.fileName };
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
    case 'SET_ACTIVE_SCENE':
      return { ...state, activeSceneId: action.payload };
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
      const newSettings = normalizeSettings({ ...state.settings, ...action.payload });
      localStorage.setItem('gemini_model', newSettings.geminiModel);
      localStorage.setItem('groq_model', newSettings.groqModel);
      localStorage.setItem('deepinfra_model', newSettings.deepinfraModel);
      localStorage.setItem('openai_model', newSettings.openaiModel);
      localStorage.setItem('anthropic_model', newSettings.anthropicModel);
      if (newSettings.imageModel) localStorage.setItem('gemini_image_model', newSettings.imageModel);
      return { ...state, settings: newSettings };
    }
    case 'SET_REFERENCES':
      return { ...state, references: action.payload };
    case 'ADD_REFERENCE':
      return { ...state, references: [...state.references, action.payload] };
    case 'REMOVE_REFERENCE':
      return { ...state, references: state.references.filter(r => r.id !== action.payload) };
    case 'UPDATE_REFERENCE':
      return {
        ...state,
        references: state.references.map(r => r.id === action.payload.id ? action.payload : r)
      };
    // Two-stage AI workflow
    case 'START_ANALYSIS':
      return { ...state, isAnalyzing: true };
    case 'FINISH_ANALYSIS': {
      const { sceneCards: newCards, characters: newChars, locations: newLocs, suggestedTimeContexts, mode = 'append' } = action.payload;
      const shouldReplace = mode === 'replace';
      const baseTimeContexts = shouldReplace ? [] : state.timeContexts;
      // Merge incoming time contexts by label (dedup), preferring existing entries
      const mergedTimeContexts = suggestedTimeContexts?.length
        ? mergeTimeContextsByLabel(baseTimeContexts, suggestedTimeContexts)
        : baseTimeContexts;

      // Build a mapping from incoming (analyzer-generated) time context IDs to canonical (merged) IDs.
      // When an incoming label matches an existing time context, the merged list keeps the existing ID.
      const incomingIdToLabel = new Map<string, string>();
      (suggestedTimeContexts ?? []).forEach(tc => {
        if (tc.label) incomingIdToLabel.set(tc.id, tc.label);
      });
      const canonicalLabelToId = new Map<string, string>();
      mergedTimeContexts.forEach(tc => canonicalLabelToId.set(tc.label, tc.id));

      const nextSequenceStart = shouldReplace || state.sceneCards.length === 0
        ? 1
        : Math.max(...state.sceneCards.map(s => s.sceneNumber)) + 1;

      // Remap each card's timeContextIds from incoming IDs to canonical IDs
      // Each card keeps ONLY its own time context (not all of them)
      const updatedNewCards = newCards.map((sc, index) => ({
        ...sc,
        sceneNumber: nextSequenceStart + index,
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
        sceneCards: shouldReplace ? updatedNewCards : [...state.sceneCards, ...updatedNewCards],
        characters: shouldReplace ? newChars : mergeById(state.characters, newChars),
        locations: shouldReplace ? newLocs : mergeById(state.locations, newLocs),
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
          sc.id === action.payload.sceneId ? (() => {
            const nextPrompts = action.payload.prompts.map(clampPromptVersions);
            const hasStalePrompts = nextPrompts.some(prompt => prompt.isStale);
            return {
              ...sc,
              prompts: nextPrompts,
              status: 'ready',
              analysis: action.payload.analysis,
              promptsNeedRefresh: hasStalePrompts,
              staleReasons: hasStalePrompts ? sc.staleReasons : [],
              cameraAngleSlots: reconcileCameraAngleSlots(action.payload.cameraAngleSlots ?? sc.cameraAngleSlots, nextPrompts),
            };
          })() : sc
        ),
      };
    case 'SET_CAMERA_ANGLE_SLOTS':
      return {
        ...state,
        sceneCards: state.sceneCards.map(sc =>
          sc.id === action.payload.sceneId
            ? { ...sc, cameraAngleSlots: action.payload.slots }
            : sc
        ),
      };
    case 'START_SLOT_PROMPT_GENERATION':
      return {
        ...state,
        sceneCards: state.sceneCards.map(sc =>
          sc.id === action.payload.sceneId
            ? {
                ...sc,
                cameraAngleSlots: (sc.cameraAngleSlots ?? []).map(slot =>
                  slot.id === action.payload.slotId ? { ...slot, isGenerating: true } : slot
                ),
              }
            : sc
        ),
      };
    case 'FINISH_SLOT_PROMPT_GENERATION': {
      const { sceneId, slotId, prompt } = action.payload;
      return {
        ...state,
        sceneCards: state.sceneCards.map(sc => {
          if (sc.id !== sceneId) return sc;
          const updatedSlots = (sc.cameraAngleSlots ?? []).map(slot =>
            slot.id === slotId
              ? { ...slot, promptId: prompt.id, isGenerating: false }
              : slot
          );
          return {
            ...sc,
            prompts: [...sc.prompts, clampPromptVersions(prompt)],
            cameraAngleSlots: updatedSlots,
          };
        }),
      };
    }

    case 'SET_ALL_PROMPTS':
      return {
        ...state,
        sceneCards: state.sceneCards.map(sc => {
          const prompts = action.payload[sc.id];
          if (prompts) {
            const nextPrompts = prompts.map(clampPromptVersions);
            const hasStalePrompts = nextPrompts.some(prompt => prompt.isStale);
            return {
              ...sc,
              prompts: nextPrompts,
              status: 'ready',
              promptsNeedRefresh: hasStalePrompts,
              staleReasons: hasStalePrompts ? sc.staleReasons : [],
              cameraAngleSlots: reconcileCameraAngleSlots(sc.cameraAngleSlots, nextPrompts),
            };
          }
          return sc;
        })
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
      return {
        ...state,
        sceneCards: action.payload.map((sceneCard) => ({
          ...sceneCard,
          prompts: Array.isArray(sceneCard.prompts) ? sceneCard.prompts.map(clampPromptVersions) : [],
        })),
      };
    case 'SET_CHARACTERS':
      return { ...state, characters: action.payload };
    case 'SET_LOCATIONS':
      return { ...state, locations: action.payload };
    case 'RESET_EPISODE_WORKSPACE':
      return {
        ...state,
        mainText: '',
        documentText: '',
        episodes: [],
        sceneCards: [],
        references: [],
        activeSceneId: null,
        episodePrompt: '',
        episodePromptTr: '',
        episodeStyleHistory: [],
        characters: [],
        locations: [],
        timeContexts: [],
        isAnalyzing: false,
      };
    case 'UPSERT_CHARACTER': {
      const exists = state.characters.some(c => c.id === action.payload.id);
      const previous = state.characters.find(c => c.id === action.payload.id);
      const didChange = !!previous && JSON.stringify(previous) !== JSON.stringify(action.payload);
      return {
        ...state,
        characters: exists
          ? state.characters.map(c => c.id === action.payload.id ? action.payload : c)
          : [...state.characters, action.payload],
        sceneCards: didChange
          ? state.sceneCards.map(sc =>
              sc.characterIds.includes(action.payload.id)
                ? markSceneCardPromptsStale(sc, 'Character attributes updated')
                : sc
            )
          : state.sceneCards,
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
      const previous = state.locations.find(l => l.id === action.payload.id);
      const didChange = !!previous && JSON.stringify(previous) !== JSON.stringify(action.payload);
      return {
        ...state,
        locations: exists
          ? state.locations.map(l => l.id === action.payload.id ? action.payload : l)
          : [...state.locations, action.payload],
        sceneCards: didChange
          ? state.sceneCards.map(sc =>
              sc.locationIds.includes(action.payload.id)
                ? markSceneCardPromptsStale(sc, 'Location attributes updated')
                : sc
            )
          : state.sceneCards,
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
    case 'SET_PINNED_PROMPT': {
      const { sceneId, promptId, byAI } = action.payload;
      return {
        ...state,
        sceneCards: state.sceneCards.map(sc =>
          sc.id === sceneId
            ? {
                ...sc,
                prompts: sc.prompts.map(p => ({
                  ...p,
                  isPinned: p.id === promptId,
                  isPinnedByAI: byAI ? p.id === promptId : false,
                })),
              }
            : sc
        ),
      };
    }
    case 'IMPORT_PROJECT':
      return {
        ...state,
        // Eğer episode bilgileri state'te özel tutuluyorsa onlara aktar
        episodePrompt: action.payload.episodePrompt || state.episodePrompt,
        episodePromptTr: action.payload.episodePromptTr || state.episodePromptTr,
        characters: action.payload.characters,
        locations: action.payload.locations,
        timeContexts: action.payload.timeContexts,
        sceneCards: action.payload.sceneCards,
      };
    default:
      return state;
  }
}

const MAX_HISTORY = 15;

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
      // Use reducerCore here so undo snapshots do not trigger duplicate
      // persistence work before the real dispatch runs.
      const after = reducerCore(before, action);
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
