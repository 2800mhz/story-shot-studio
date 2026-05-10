export type NarrativeLayer =
  | 'historical'   // Tarihsel canlandırma — karakter + mekân + dönem aktif
  | 'scientific'   // Bilimsel/nörofizyolojik — modern lab, makro biyoloji, soyut anatomi
  | 'modern'       // Günümüz belgeseli — röportaj, modern mekân, çağdaş yaşam
  | 'universal';   // Evrensel/zamansız — duygular, insan doğası, soyut kavramlar

export type ProjectType = 'documentary' | 'commercial' | 'narrative';
export type RenderMode = 'photoreal' | 'stylized' | 'illustration' | 'animation';

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

export interface Episode {
  id: string;
  title: string;
  startIndex: number;
  endIndex: number;
  parentId: string | null;
  level: number; // 0 = top-level (country), 1 = sub-section
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

/**
 * Sinematik kamera açısı slotu — AI tarafından sahneye özel olarak tasarlanmış.
 * Hardcoded enum değil; gerçek sinemacı diliyle: focal length, açı derecesi, hareket tekniği. deneme klayve çalışıyor kontrol 
 */
export interface CameraAngleSlot {
  id: string;
  focalLength: string;    // örn: "85mm portrait lens", "16mm ultra-wide", "200mm telephoto"
  angleDeg: string;       // örn: "eye-level 0°", "low angle 20°", "bird's-eye 85°"
  technique: string;      // örn: "handheld", "static locked-off", "dolly track", "crane jib"
  framing: string;        // örn: "medium close-up", "extreme wide", "over-the-shoulder"
  label: string;          // Türkçe kısa etiket — "Portre — Göz Hizası"
  rationale: string;      // Türkçe 1 cümle — neden bu sahne için
  promptId?: string;      // Üretildiyse bağlı PromptCard.id
  isGenerating?: boolean; // On-demand üretim sırasında
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
  pinReason?: string;
  witnessIndicator?: string;
  lightSource?: string;
  hasSubjectReference?: boolean;
  isStale?: boolean;
  staleReason?: string;
  slotId?: string; // Hangi CameraAngleSlot'tan üretildi (on-demand ise)
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
  cameraAngleSlots?: CameraAngleSlot[];
}

export interface SceneCard {
  id: string;
  sceneNumber: number;
  text: string;
  visualNote: string;
  visualStyle?: 'cinematic' | 'symbolic' | 'scientific' | 'abstract';
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
  promptsNeedRefresh?: boolean;
  staleReasons?: string[];
  /** 6 sinematik kamera açısı slotu — prompt generation sırasında doldurulur */
  cameraAngleSlots?: CameraAngleSlot[];
}

export interface AppState {
  projectType: ProjectType;
  renderMode: RenderMode;
  mainText: string;
  documentText: string;
  episodes: Episode[];
  references: SceneReference[];
  activeSceneId: string | null;
  apiKeys: string[];
  currentKeyIndex: number;
  settings: {
    model: string;
    geminiModel: string;
    groqModel: string;
    deepinfraModel: string;
    openaiModel: string;
    anthropicModel: string;
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
  | { type: 'SET_PROJECT_TYPE'; payload: ProjectType }
  | { type: 'SET_RENDER_MODE'; payload: RenderMode }
  | { type: 'SET_MAIN_TEXT'; payload: { text: string; fileName: string } }
  | { type: 'SET_EPISODES'; payload: Episode[] }
  | { type: 'REORDER_EPISODES'; payload: Episode[] }
  | { type: 'MOVE_EPISODE'; payload: { episodeId: string; newParentId: string | null } }
  | { type: 'SET_ACTIVE_SCENE'; payload: string | null }
  | { type: 'SET_API_KEYS'; payload: string[] }
  | { type: 'SET_IMAGE_API_KEYS'; payload: string[] }
  | { type: 'SET_CURRENT_KEY_INDEX'; payload: number }
  | { type: 'ROTATE_API_KEY' }
  | { type: 'SET_SETTINGS'; payload: Partial<AppState['settings']> }
  | { type: 'SET_REFERENCES'; payload: SceneReference[] }
  | { type: 'ADD_REFERENCE'; payload: SceneReference }
  | { type: 'REMOVE_REFERENCE'; payload: string }
  | { type: 'UPDATE_REFERENCE'; payload: SceneReference }
  // Two-stage AI workflow actions
  | { type: 'START_ANALYSIS' }
  | { type: 'FINISH_ANALYSIS'; payload: { sceneCards: SceneCard[]; characters: Character[]; locations: Location[]; suggestedTimeContexts?: TimeContext[]; mode?: 'append' | 'replace' } }
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
      cameraAngleSlots?: CameraAngleSlot[];
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
  | { type: 'RESET_EPISODE_WORKSPACE' }
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
  | { type: 'SET_EPISODE_STYLE_HISTORY'; payload: EpisodeStyleVersion[] }
  | { type: 'SET_CAMERA_ANGLE_SLOTS'; payload: { sceneId: string; slots: CameraAngleSlot[] } }
  | { type: 'START_SLOT_PROMPT_GENERATION'; payload: { sceneId: string; slotId: string } }
  | { type: 'FINISH_SLOT_PROMPT_GENERATION'; payload: { sceneId: string; slotId: string; prompt: PromptCard } }
  | {
    type: 'IMPORT_PROJECT';
    payload: {
      episodeId?: string;
      episodeTitle?: string;
      episodePrompt?: string;
      episodePromptTr?: string;
      characters: Character[];
      locations: Location[];
      timeContexts: TimeContext[];
      sceneCards: SceneCard[];
    }
  };
