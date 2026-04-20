export type NarrativeLayer =
  | 'historical'   // Tarihsel canlandırma — karakter + mekân + dönem aktif
  | 'scientific'   // Bilimsel/nörofizyolojik — modern lab, makro biyoloji, soyut anatomi
  | 'modern'       // Günümüz belgeseli — röportaj, modern mekân, çağdaş yaşam
  | 'universal';   // Evrensel/zamansız — duygular, insan doğası, soyut kavramlar

export interface TextSegment {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
}

export interface EpisodeStyleVersion {
  id: string;
  prompt: string;
  promptTr: string;
  instruction: string; // kullanıcının yazdığı yazı
  createdAt: string; // ISO string
}

export interface SceneReference {
  id: string;
  episodeId: string;
  filePath: string;
  fileUrl: string;
  description?: string;
  referenceType: 'subject' | 'style' | 'scene';
  aiAnalysis?: string;
  assignedSceneIds: string[];
  createdAt: string;
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
  role?: string;
  isCrowd?: boolean;
  visualDescription?: string; // 80-100 word anthropological visual reference (English)
  age?: string;
  ethnicity?: string;
  clothing?: string;
  physicalFeatures?: string;
  hair?: string;
  beard?: string;
}

export interface Location {
  id: string;
  name: string;
  visualDescription?: string; // 80-100 word photographic visual reference (English)
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
  isPinned?: boolean; // Raptiye: AI or user marks the best prompt per card
  isPinnedByAI?: boolean; // true if AI auto-selected this prompt
  hasSubjectReference?: boolean;
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
  visualStyle?: 'realistic' | 'symbolic' | 'scientific' | 'abstract';
  narrativeLayer?: NarrativeLayer;
  characterIds: string[];
  locationIds: string[];
  timeContextIds: string[];
  startIndex?: number;
  endIndex?: number;
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
  references: SceneReference[];
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
  episodePromptTr: string;
  episodeStyleHistory: EpisodeStyleVersion[];
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
  | { type: 'SET_ACTIVE_SCENE'; payload: string | null }
  | { type: 'SET_SELECTION_MODE'; payload: SelectionMode }
  | { type: 'SET_API_KEYS'; payload: string[] }
  | { type: 'SET_IMAGE_API_KEYS'; payload: string[] }
  | { type: 'SET_CURRENT_KEY_INDEX'; payload: number }
  | { type: 'ROTATE_API_KEY' }
  | { type: 'SET_SETTINGS'; payload: Partial<AppState['settings']> }
  | { type: 'SET_REFERENCES'; payload: SceneReference[] }
  | { type: 'ADD_REFERENCE'; payload: SceneReference }
  | { type: 'REMOVE_REFERENCE'; payload: string }
  | { type: 'UPDATE_REFERENCE'; payload: SceneReference }
  | { type: 'ADD_SEGMENT_TO_SCENE'; payload: { sceneId: string; segment: TextSegment } }
  | { type: 'ADD_SUBJECT_REFERENCE'; payload: { sceneId: string; segment: TextSegment } }
  | { type: 'ADD_CONSISTENCY_GROUP'; payload: ConsistencyGroup }
  | { type: 'ADD_SCENE_TO_GROUP'; payload: { groupId: string; sceneId: string } }
  | { type: 'REMOVE_SCENE_FROM_GROUP'; payload: { groupId: string; sceneId: string } }
  | { type: 'SET_SCENE_NOTE'; payload: { sceneId: string; note: string } }
  | { type: 'SET_GROUP_NOTE'; payload: { groupId: string; note: string } }
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
  | { type: 'SET_EPISODE_PROMPT_TR'; payload: string }
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
  | { type: 'REMOVE_TIME_CONTEXT_FROM_SCENE_CARD'; payload: { sceneId: string; timeContextId: string } }
  | { type: 'REORDER_SCENE_CARDS'; payload: SceneCard[] }
  | { type: 'SET_ALL_PROMPTS'; payload: Record<string, PromptCard[]> }
  | { type: 'SET_PINNED_PROMPT'; payload: { sceneId: string; promptId: string; byAI?: boolean } }
  | { type: 'ADD_EPISODE_STYLE_VERSION'; payload: EpisodeStyleVersion }
  | { type: 'SET_EPISODE_STYLE_HISTORY'; payload: EpisodeStyleVersion[] };
