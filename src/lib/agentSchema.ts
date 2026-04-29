import { z } from 'zod';

export const agentAttachmentSchema = z.object({
  id: z.string(),
  type: z.literal('image'),
  name: z.string(),
  mimeType: z.string(),
  fileUrl: z.string().optional(),
  base64: z.string().optional(),
  analysis: z.string().optional(),
});

export const agentScopeSchema = z.enum(['active-scene', 'selected-entity', 'episode']);

export const updateSceneNoteOperationSchema = z.object({
  type: z.literal('update_scene_note'),
  sceneId: z.string(),
  note: z.string(),
});

export const updateSceneVisualNoteOperationSchema = z.object({
  type: z.literal('update_scene_visual_note'),
  sceneId: z.string(),
  visualNote: z.string(),
});

export const updatePromptTextOperationSchema = z.object({
  type: z.literal('update_prompt_text'),
  sceneId: z.string(),
  promptId: z.string(),
  promptText: z.string(),
});

export const markPromptStaleOperationSchema = z.object({
  type: z.literal('mark_prompt_stale'),
  sceneId: z.string(),
  promptId: z.string().optional(),
  reason: z.string().optional(),
});

export const updateCharacterOperationSchema = z.object({
  type: z.literal('update_character'),
  characterId: z.string(),
  changes: z.object({
    name: z.string().optional(),
    role: z.string().optional(),
    visualDescription: z.string().optional(),
    age: z.string().optional(),
    ethnicity: z.string().optional(),
    clothing: z.string().optional(),
    physicalFeatures: z.string().optional(),
    hair: z.string().optional(),
    beard: z.string().optional(),
  }).passthrough(),
});

export const removeCharacterOperationSchema = z.object({
  type: z.literal('remove_character'),
  characterId: z.string(),
});

export const addCharacterOperationSchema = z.object({
  type: z.literal('add_character'),
  character: z.object({
    id: z.string().optional(),
    name: z.string(),
    role: z.string().optional(),
    visualDescription: z.string().optional(),
    age: z.string().optional(),
    ethnicity: z.string().optional(),
    clothing: z.string().optional(),
    physicalFeatures: z.string().optional(),
    hair: z.string().optional(),
    beard: z.string().optional(),
  }).passthrough(),
});

export const updateLocationOperationSchema = z.object({
  type: z.literal('update_location'),
  locationId: z.string(),
  changes: z.object({
    name: z.string().optional(),
    visualDescription: z.string().optional(),
    period: z.string().optional(),
    geography: z.string().optional(),
    architecture: z.string().optional(),
    atmosphere: z.string().optional(),
  }).passthrough(),
});

export const attachCharacterToSceneOperationSchema = z.object({
  type: z.literal('attach_character_to_scene'),
  sceneId: z.string(),
  characterId: z.string(),
});

export const detachCharacterFromSceneOperationSchema = z.object({
  type: z.literal('detach_character_from_scene'),
  sceneId: z.string(),
  characterId: z.string(),
});

export const addReferenceToSceneOperationSchema = z.object({
  type: z.literal('add_reference_to_scene'),
  sceneId: z.string(),
  referenceId: z.string(),
});

export const removeReferenceFromSceneOperationSchema = z.object({
  type: z.literal('remove_reference_from_scene'),
  sceneId: z.string(),
  referenceId: z.string(),
});

export const addSceneReferenceOperationSchema = z.object({
  type: z.literal('add_scene_reference'),
  reference: z.object({
    id: z.string().optional(),
    description: z.string().optional(),
    referenceType: z.enum(['subject', 'style', 'scene']),
    fileUrl: z.string().optional(),
    filePath: z.string().optional(),
    assignedSceneIds: z.array(z.string()).default([]),
    aiAnalysis: z.string().optional(),
  }).passthrough(),
});

export const agentOperationSchema = z.discriminatedUnion('type', [
  updateSceneNoteOperationSchema,
  updateSceneVisualNoteOperationSchema,
  updatePromptTextOperationSchema,
  markPromptStaleOperationSchema,
  updateCharacterOperationSchema,
  removeCharacterOperationSchema,
  addCharacterOperationSchema,
  updateLocationOperationSchema,
  attachCharacterToSceneOperationSchema,
  detachCharacterFromSceneOperationSchema,
  addReferenceToSceneOperationSchema,
  removeReferenceFromSceneOperationSchema,
  addSceneReferenceOperationSchema,
]);

export const agentOperationSetSchema = z.object({
  summary: z.string(),
  reasoning: z.string().optional(),
  affectedSceneIds: z.array(z.string()).default([]),
  stalePromptSceneIds: z.array(z.string()).default([]),
  operations: z.array(agentOperationSchema).default([]),
});

export type AgentAttachment = z.infer<typeof agentAttachmentSchema>;
export type AgentScope = z.infer<typeof agentScopeSchema>;
export type AgentOperation = z.infer<typeof agentOperationSchema>;
export type AgentOperationSet = z.infer<typeof agentOperationSetSchema>;

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'status';
  content: string;
  createdAt: string;
  streaming?: boolean;
  status?: 'idle' | 'warming' | 'thinking' | 'applying' | 'error' | 'done';
  attachments?: AgentAttachment[];
}

export interface AgentActivityItem {
  id: string;
  label: string;
  startedAt: string;
  finishedAt?: string;
  details?: string[];
}
