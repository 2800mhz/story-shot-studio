import type { Character, Location, SceneCard, SceneReference, TimeContext } from '@/types';
import type { AgentAttachment, AgentScope } from './agentSchema';

interface AgentContextInput {
  scope: AgentScope;
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
    scope,
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
    promptSummaries: scene.prompts.map((prompt) => ({
      id: prompt.id,
      label: prompt.label,
      shotType: prompt.shotType,
      summary: prompt.summary,
      isPinned: !!prompt.isPinned,
      isStale: !!prompt.isStale,
    })),
  }));

  const sceneIdsForSelectedCharacter = selectedEntityId
    ? normalizedScenes
        .filter((scene) => scene.characterIds.includes(selectedEntityId))
        .map((scene) => scene.id)
    : [];

  const selectedCharacter = selectedEntityId
    ? characters.find((character) => character.id === selectedEntityId) ?? null
    : null;

  let scopedScenes = normalizedScenes;
  if (scope === 'active-scene' && activeScene) {
    scopedScenes = normalizedScenes.filter((scene) => scene.id === activeScene.id);
  } else if (scope === 'selected-entity' && selectedCharacter) {
    scopedScenes = normalizedScenes.filter((scene) => sceneIdsForSelectedCharacter.includes(scene.id));
  }

  return {
    scope,
    activeSceneId,
    selectedEntityId,
    projectState: {
      masterPrompt: masterPrompt || '',
      episodePrompt: episodePrompt || '',
      scenes: scopedScenes,
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
    scopeHints: {
      activeScene,
      selectedCharacter,
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
    'CURRENT SCOPE:',
    JSON.stringify({
      scope: context.scope,
      activeSceneId: context.activeSceneId,
      selectedEntityId: context.selectedEntityId,
    }, null, 2),
    '',
    'ATTACHMENTS:',
    attachmentText,
    '',
    'PROJECT STATE:',
    JSON.stringify(context.projectState, null, 2),
  ].join('\n');
}
