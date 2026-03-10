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
  summary?: string;
  attachedEntityIds?: string[];
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
  title?: string;
  text?: string;
  startIndex?: number;
  endIndex?: number;
  episodeTitle: string;
  source?: 'ai' | 'manual';
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

export interface ExtractedEntity {
  id: string;
  type: 'character' | 'location' | 'object';
  name: string;
  visualDescription: string;
  sceneIds: string[];
  firstMention: number;
}

export interface SceneAnalysis {
  sceneId: string;
  narrativeType: 'static' | 'sequence' | 'timelapse';
  suggestedPromptCount: number;
  entityReferences: string[];
  temporalComplexity: 'simple' | 'moderate' | 'complex';
  reasoning?: string;
}

export interface Character {
  id: string;
  name: string;
  description?: string;
  basePrompt?: string;
  age?: string;
  ethnicity?: string;
  clothing?: string;
  physicalFeatures?: string;
  role?: string;
  isCrowd?: boolean;
}

export interface Location {
  id: string;
  name: string;
  description?: string;
  basePrompt?: string;
  period?: string;
  geography?: string;
  architecture?: string;
  atmosphere?: string;
}

export interface TimeContext {
  id: string;
  label: string;
  era?: string;
  season?: string;
  timeOfDay?: string;
  lighting?: string;
  weather?: string;
  historicalNotes?: string;
}

export interface PromptCard {
  id: string;
  type?: 'wide' | 'medium' | 'closeup';
  label?: string; // "Prompt A", "Prompt B", "Prompt C"
  shotType: string;
  summary: string;
  explanation?: string; // AI-generated explanation of what this prompt shows
  promptText: string;
  versions: string[];
  aspectRatio?: '16:9' | '4:3' | '1:1' | '9:16';
  generationType?: 'initial' | 'regenerate' | 'revision';
  revisionPrompt?: string;
}

export interface PromptAnalysis {
  complexity: 'minimal' | 'low' | 'medium' | 'high' | 'extreme';
  difficultyScore: number;
  hasCrowd: boolean;
  hasArchitecture: boolean;
  hasTransformation: boolean;
  hasHistoricalFigure: boolean;
  recommendedStyle: string;
  productionNotes: string[];
}

export interface GenerationResult {
  prompts: PromptCard[];
  analysis: PromptAnalysis;
  optimizations: string[];
}

export interface SceneCard {
  id: string;
  sceneNumber: number;
  text: string;
  visualNote: string;
  characterIds: string[];
  locationIds: string[];
  timeContextIds: string[];
  prompts: PromptCard[];
  status: 'analyzed' | 'generating' | 'ready';
  noteEditable: boolean;
  analysis?: PromptAnalysis;
  optimizations?: string[];
}

export interface AppState {
  mainText: string;
  documentText: string;
  episodes: Episode[];
  scenes: Scene[];
  extractedEntities: ExtractedEntity[];
  sceneAnalyses: Record<string, SceneAnalysis>;
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
  // Two-stage AI workflow
  sceneCards: SceneCard[];
  characters: Character[];
  locations: Location[];
  timeContexts: TimeContext[];
  masterPrompt: string;
  episodePrompt: string;
  isAnalyzing: boolean;
  isGeneratingPrompts: boolean;
}

export type AppAction =
  | { type: 'SET_MAIN_TEXT'; payload: { text: string; fileName: string } }
  | { type: 'SET_EXTRACTED_ENTITIES'; payload: ExtractedEntity[] }
  | { type: 'ADD_EXTRACTED_ENTITY'; payload: ExtractedEntity }
  | { type: 'UPDATE_ENTITY'; payload: { entityId: string; updates: Partial<ExtractedEntity> } }
  | { type: 'SET_SCENE_ANALYSIS'; payload: { sceneId: string; analysis: SceneAnalysis } }
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
  | { type: 'REMOVE_SUB_SCENE_PROMPT'; payload: { sceneId: string; subSceneId: string; promptId: string } }
  | { type: 'ATTACH_ENTITY_TO_PROMPT'; payload: { sceneId: string; promptId: string; entityId: string } }
  | { type: 'DETACH_ENTITY_FROM_PROMPT'; payload: { sceneId: string; promptId: string; entityId: string } }
  // Two-stage AI workflow actions
  | { type: 'START_ANALYSIS' }
  | { type: 'FINISH_ANALYSIS'; payload: { sceneCards: SceneCard[]; characters: Character[]; locations: Location[]; suggestedTimeContexts?: TimeContext[] } }
  | { type: 'SET_TIME_CONTEXTS'; payload: TimeContext[] }
  | { type: 'UPDATE_SCENE_CARD_NOTE'; payload: { sceneId: string; note: string } }
  | { type: 'ADD_CHARACTER_TO_SCENE_CARD'; payload: { sceneId: string; characterId: string } }
  | { type: 'REMOVE_CHARACTER_FROM_SCENE_CARD'; payload: { sceneId: string; characterId: string } }
  | { type: 'ADD_LOCATION_TO_SCENE_CARD'; payload: { sceneId: string; locationId: string } }
  | { type: 'REMOVE_LOCATION_FROM_SCENE_CARD'; payload: { sceneId: string; locationId: string } }
  | { type: 'ADD_NEW_CHARACTER_TO_SCENE_CARD'; payload: { sceneId: string; character: Character } }
  | { type: 'ADD_NEW_LOCATION_TO_SCENE_CARD'; payload: { sceneId: string; location: Location } }
  | { type: 'START_PROMPT_GENERATION'; payload: { sceneId: string } }
  | { 
      type: 'FINISH_PROMPT_GENERATION'; 
      payload: { 
        sceneId: string; 
        prompts: PromptCard[];
        analysis?: PromptAnalysis;
        optimizations?: string[];
      } 
    }
  | { type: 'DELETE_SCENE_CARD'; payload: string }
  | { type: 'SET_MASTER_PROMPT'; payload: string }
  | { type: 'SET_EPISODE_PROMPT'; payload: string }
  | { type: 'SET_ANALYZING'; payload: boolean }
  | { type: 'SET_DOCUMENT_TEXT'; payload: string }
  | { type: 'SET_SCENES'; payload: SceneCard[] }
  | { type: 'SET_CHARACTERS'; payload: Character[] }
  | { type: 'SET_LOCATIONS'; payload: Location[] }
  | { type: 'UPSERT_CHARACTER'; payload: Character }
  | { type: 'DELETE_CHARACTER'; payload: string }
  | { type: 'UPSERT_LOCATION'; payload: Location }
  | { type: 'DELETE_LOCATION'; payload: string }
  | { type: 'ADD_TIME_CONTEXT'; payload: TimeContext }
  | { type: 'UPDATE_TIME_CONTEXT'; payload: TimeContext }
  | { type: 'DELETE_TIME_CONTEXT'; payload: string }
  | { type: 'ADD_TIME_CONTEXT_TO_SCENE_CARD'; payload: { sceneId: string; timeContextId: string } }
  | { type: 'REMOVE_TIME_CONTEXT_FROM_SCENE_CARD'; payload: { sceneId: string; timeContextId: string } };
