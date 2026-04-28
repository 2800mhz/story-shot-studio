import type { Character, Location, SceneCard, SceneReference, TimeContext } from '@/types';
import type { AgentAttachment, AgentScope } from './agentSchema';

interface AgentContextInput {
  activeSceneId: string | null;
  selectedEntityId?: string | null;
  sceneCards: SceneCard[];
  characters: Character[];
  locations: Location[];
  timeContexts: TimeContext[];
  references: SceneReference[];
  episodePrompt?: string;
  masterPrompt?: string;
}

export function buildAgentContext(input: AgentContextInput) {
  const {
    activeSceneId,
    selectedEntityId,
    sceneCards,
    characters,
    locations,
    timeContexts,
    references,
    episodePrompt,
    masterPrompt,
  } = input;

  const activeScene = activeSceneId
    ? sceneCards.find((scene) => scene.id === activeSceneId) ?? null
    : null;

  const normalizedScenes = sceneCards.map((scene) => ({
    id: scene.id,
    sceneNumber: scene.sceneNumber,
    text: scene.text,
    visualNote: scene.visualNote,
    characterIds: scene.characterIds,
    locationIds: scene.locationIds,
    timeContextIds: scene.timeContextIds,
    pinnedPrompt: scene.prompts.find((prompt) => prompt.isPinned)?.promptText ?? null,
    pinnedPromptId: scene.prompts.find((prompt) => prompt.isPinned)?.id ?? null,
    promptSummaries: scene.prompts.map((prompt) => ({
      id: prompt.id,
      label: prompt.label,
      shotType: prompt.shotType,
      summary: prompt.summary,
      isPinned: !!prompt.isPinned,
      isStale: !!prompt.isStale,
      // Provide the full prompt text so the agent can update non-pinned prompts too.
      // (Versions are tracked in app state; agent only needs the latest text.)
      promptText: prompt.promptText,
    })),
  }));

  const selectedCharacter = selectedEntityId
    ? characters.find((character) => character.id === selectedEntityId) ?? null
    : null;

  return {
    activeSceneId,
    selectedEntityId,
    projectState: {
      masterPrompt: masterPrompt || '',
      episodePrompt: episodePrompt || '',
      scenes: normalizedScenes,
      characters,
      locations,
      timeContexts,
      references: references.map((reference) => ({
        id: reference.id,
        description: reference.description || '',
        referenceType: reference.referenceType,
        fileUrl: reference.fileUrl,
        assignedSceneIds: reference.assignedSceneIds,
      })),
    },
    focusHints: {
      activeSceneId,
      activeSceneSummary: activeScene ? `Scene ${activeScene.sceneNumber}: ${activeScene.text.substring(0, 50)}...` : 'None',
      selectedEntityId,
      selectedCharacterName: selectedCharacter ? selectedCharacter.name : 'None',
    },
  };
}

export function buildAgentUserPrompt(args: {
  command: string;
  context: ReturnType<typeof buildAgentContext>;
  attachments: AgentAttachment[];
}) {
  const { command, context, attachments } = args;

  const attachmentText = attachments.length === 0
    ? 'No image attachments.'
    : attachments.map((attachment, index) => [
        `Attachment ${index + 1}:`,
        `- name: ${attachment.name}`,
        `- mimeType: ${attachment.mimeType}`,
        attachment.analysis ? `- analysis: ${attachment.analysis}` : null,
      ].filter(Boolean).join('\n')).join('\n\n');

  return [
    `USER COMMAND: ${command}`,
    '',
    'FOCUS HINTS:',
    JSON.stringify(context.focusHints, null, 2),
    '',
    'ATTACHMENTS:',
    attachmentText,
    '',
    'PROJECT STATE:',
    JSON.stringify(context.projectState, null, 2),
  ].join('\n');
}
