export interface TextSegment {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
}

export interface PromptVariant {
  id: string;
  shotType: string;
  text: string;
  versions: string[];
  isRevising: boolean;
  imageUrl?: string;
  imageStatus?: 'idle' | 'generating' | 'done' | 'error';
}

export interface SubScene {
  id: string;
  parentSceneId: string;
  label: string;         // e.g. "kuyuyu", "çadırlar", "saraylar"
  segments: TextSegment[];
  subjectReferences: TextSegment[];
  consistencyGroupIds: string[];
  prompts: PromptVariant[];
  status: 'pending' | 'generating' | 'done' | 'error';
  note?: string;
}

export interface Scene {
  id: string;
  number: number;
  episodeTitle: string;
  segments: TextSegment[];
  subjectReferences: TextSegment[];
  consistencyGroupIds: string[];
  prompts: PromptVariant[];
  status: 'pending' | 'generating' | 'done' | 'error';
  note?: string;
  subScenes?: SubScene[];
}

export interface ConsistencyGroup {
  id: string;
  label: string; // "A", "B", "C"...
  color: string; // tailwind color token
  sceneIds: string[];
  note?: string;
}

export interface Episode {
  id: string;
  title: string;
  startIndex: number;
  endIndex: number;
  parentId: string | null;
  level: number; // 0 = top-level (country), 1 = sub-section
}

export type SelectionMode = 'scene' | 'reference' | 'consistency' | 'append';

export interface AppState {
  mainText: string;
  text5N1K: string;
  episodes: Episode[];
  scenes: Scene[];
  consistencyGroups: ConsistencyGroup[];
  activeSceneId: string | null;
  selectionMode: SelectionMode;
  apiKeys: string[];
  currentKeyIndex: number;
  settings: {
    model: string;
    thinkingMode: boolean;
    variantCount: 1 | 2 | 3;
    temperature: number;
    imageModel: string;
  };
  imageApiKeys: string[];
  mainFileName: string;
  n1kFileName: string;
}

export type AppAction =
  | { type: 'SET_MAIN_TEXT'; payload: { text: string; fileName: string } }
  | { type: 'SET_5N1K_TEXT'; payload: { text: string; fileName: string } }
  | { type: 'CLEAR_MAIN_TEXT' }
  | { type: 'CLEAR_5N1K_TEXT' }
  | { type: 'SET_EPISODES'; payload: Episode[] }
  | { type: 'REORDER_EPISODES'; payload: Episode[] }
  | { type: 'MOVE_EPISODE'; payload: { episodeId: string; newParentId: string | null } }
  | { type: 'ADD_SCENE'; payload: Scene }
  | { type: 'REMOVE_SCENE'; payload: string }
  | { type: 'UPDATE_SCENE'; payload: Scene }
  | { type: 'REORDER_SCENES'; payload: Scene[] }
  | { type: 'SET_ACTIVE_SCENE'; payload: string | null }
  | { type: 'SET_SELECTION_MODE'; payload: SelectionMode }
  | { type: 'SET_API_KEYS'; payload: string[] }
  | { type: 'SET_IMAGE_API_KEYS'; payload: string[] }
  | { type: 'SET_CURRENT_KEY_INDEX'; payload: number }
  | { type: 'ROTATE_API_KEY' }
  | { type: 'SET_SETTINGS'; payload: Partial<AppState['settings']> }
  | { type: 'ADD_SEGMENT_TO_SCENE'; payload: { sceneId: string; segment: TextSegment } }
  | { type: 'ADD_SUBJECT_REFERENCE'; payload: { sceneId: string; segment: TextSegment } }
  | { type: 'ADD_CONSISTENCY_GROUP'; payload: ConsistencyGroup }
  | { type: 'ADD_SCENE_TO_GROUP'; payload: { groupId: string; sceneId: string } }
  | { type: 'REMOVE_SCENE_FROM_GROUP'; payload: { groupId: string; sceneId: string } }
  | { type: 'SET_SCENE_NOTE'; payload: { sceneId: string; note: string } }
  | { type: 'SET_GROUP_NOTE'; payload: { groupId: string; note: string } }
  | { type: 'REMOVE_PROMPT'; payload: { sceneId: string; promptId: string } }
  // SubScene actions
  | { type: 'ADD_SUB_SCENE'; payload: { sceneId: string; subScene: SubScene } }
  | { type: 'REMOVE_SUB_SCENE'; payload: { sceneId: string; subSceneId: string } }
  | { type: 'UPDATE_SUB_SCENE'; payload: { sceneId: string; subScene: SubScene } }
  | { type: 'SET_SUB_SCENE_NOTE'; payload: { sceneId: string; subSceneId: string; note: string } }
  | { type: 'REMOVE_SUB_SCENE_PROMPT'; payload: { sceneId: string; subSceneId: string; promptId: string } };
