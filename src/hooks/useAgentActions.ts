import { useCallback } from 'react';
import { aiProvider } from '@/lib/aiProvider';
import { buildAgentContext, buildAgentUserPrompt } from '@/lib/agentContext';
import { AGENT_INTENT_SYSTEM_PROMPT, buildAgentIntentPrompt, parseAgentIntent, planAgentIntent } from '@/lib/agentIntent';
import { applyAgentOperations, expandDirectPromptUpdatesForOperationSet } from '@/lib/agentOperations';
import { parseAgentOperationSet, stripAgentResultBlock } from '@/lib/agentParser';
import { AGENT_SYSTEM_PROMPT } from '@/lib/agentPrompts';
import { tryBuildLocalAgentOperationSet } from '@/lib/agentLocalActions';
import { resolveLocalAgentQuery } from '@/lib/agentLocalQueries';
import { AGENT_MODEL_OPTIONS } from '@/lib/agentModel';
import { generatePromptsForScene } from '@/lib/promptGenerator';
import { SceneReference } from '@/types';

function unique(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function inferCommandTags(command: string) {
  const lower = command.toLocaleLowerCase('tr-TR');
  const tags: string[] = [];

  const sceneMatch = lower.match(/sahne\s+(\d+)/);
  if (sceneMatch?.[1]) tags.push(`Sahne ${sceneMatch[1]}`);

  if (/prompt/.test(lower)) tags.push('Prompt');
  if (/visual note|gorsel not|görsel not/.test(lower)) tags.push('Görsel not');
  if (/\bnote\b|\bnot\b/.test(lower)) tags.push('Not');
  if (/karakter|adam|kadin|kadın|goc(ebe)?|göçebe/.test(lower)) tags.push('Karakter');
  if (/mekan|mekân|lokasyon|yer/.test(lower)) tags.push('Mekan');
  if (/referans|gorsel|görsel/.test(lower)) tags.push('Referans');
  if (/pinned/.test(lower)) tags.push('Pinned');
  if (/stil|style|render/.test(lower)) tags.push('Stil');

  return unique(tags).slice(0, 4);
}

function inferOperationSetTags(operationSet: any) {
  const tags: string[] = [];
  if (operationSet.affectedSceneIds?.length) tags.push(`${operationSet.affectedSceneIds.length} sahne`);
  if (operationSet.stalePromptSceneIds?.length) tags.push(`${operationSet.stalePromptSceneIds.length} stale`);

  for (const operation of operationSet.operations || []) {
    switch (operation.type) {
      case 'update_prompt_text':
        tags.push('Prompt');
        break;
      case 'update_character':
      case 'add_character':
      case 'remove_character':
      case 'attach_character_to_scene':
      case 'detach_character_from_scene':
        tags.push('Karakter');
        break;
      case 'update_scene_visual_note':
        tags.push('Görsel not');
        break;
      case 'update_scene_note':
        tags.push('Not');
        break;
      case 'update_location':
        tags.push('Mekan');
        break;
      case 'add_reference_to_scene':
      case 'remove_reference_from_scene':
      case 'add_scene_reference':
        tags.push('Referans');
        break;
      case 'mark_prompt_stale':
        tags.push('Stale');
        break;
      default:
        break;
    }
  }

  return unique(tags).slice(0, 5);
}

function inferIntentTags(intent: any) {
  const tags: string[] = [];

  switch (intent?.target?.type) {
    case 'character':
      tags.push('Karakter');
      break;
    case 'scene':
      tags.push('Sahne');
      break;
    case 'location':
      tags.push('Mekan');
      break;
    case 'prompt':
      tags.push('Prompt');
      break;
    case 'episode':
      tags.push('Episode');
      break;
    default:
      break;
  }

  switch (intent?.edit?.kind) {
    case 'wardrobe':
      tags.push('Kiyafet');
      break;
    case 'character_appearance':
      tags.push('Gorunus');
      break;
    case 'visual_note':
      tags.push('Gorsel not');
      break;
    case 'scene_note':
      tags.push('Not');
      break;
    case 'location_update':
      tags.push('Mekan');
      break;
    case 'prompt_rewrite':
      tags.push('Prompt');
      break;
    default:
      break;
  }

  if (intent?.target?.sceneNumber) tags.push(`Sahne ${intent.target.sceneNumber}`);

  return unique(tags).slice(0, 4);
}

export function useAgentActions({
  agent,
  state,
  dispatch,
  toast,
  selectedEntityId,
  agentCommand,
  setAgentCommand,
  setNoKeysWarning,
  episodeId,
}: {
  agent: any;
  state: any;
  dispatch: any;
  toast: any;
  selectedEntityId: string | null;
  agentCommand: string;
  setAgentCommand: (cmd: string) => void;
  setNoKeysWarning: (val: boolean) => void;
  episodeId?: string;
}) {
  const regenerateStaleScenes = useCallback(async (operationSet: any, nextState: any) => {
    if (!operationSet.stalePromptSceneIds?.length) return operationSet;

    const recoveredSceneIds: string[] = [];

    for (const sceneId of operationSet.stalePromptSceneIds) {
      const scene = nextState.sceneCards.find((item: any) => item.id === sceneId);
      if (!scene) continue;

      try {
        dispatch({ type: 'START_PROMPT_GENERATION', payload: { sceneId } });

        const sceneCharacters = nextState.characters.filter((character: any) => scene.characterIds.includes(character.id));
        const sceneLocations = nextState.locations.filter((location: any) => scene.locationIds.includes(location.id));
        const sceneTimeContexts = nextState.timeContexts.filter((timeContext: any) => (scene.timeContextIds ?? []).includes(timeContext.id));
        const aspectRatio = scene.prompts?.[0]?.aspectRatio || '16:9';

        const result = await generatePromptsForScene(
          scene,
          sceneCharacters,
          sceneLocations,
          state.masterPrompt,
          undefined,
          undefined,
          aspectRatio,
          scene.analysis,
          sceneTimeContexts,
          state.episodePrompt || undefined,
          nextState.references,
          'regenerate',
          undefined,
          state.projectType,
          state.renderMode,
        );

        dispatch({
          type: 'FINISH_PROMPT_GENERATION',
          payload: {
            sceneId,
            prompts: result.prompts,
            analysis: result.analysis,
          },
        });

        recoveredSceneIds.push(sceneId);
      } catch (error) {
        console.warn(`Agent auto-regenerate failed for scene ${sceneId}:`, error);
      }
    }

    if (recoveredSceneIds.length === 0) return operationSet;

    const nextOperationSet = {
      ...operationSet,
      stalePromptSceneIds: operationSet.stalePromptSceneIds.filter((sceneId: string) => !recoveredSceneIds.includes(sceneId)),
      summary: operationSet.stalePromptSceneIds.length === recoveredSceneIds.length
        ? `${operationSet.summary} Etkilenen sahnelerin promptları doğrudan yeniden üretildi.`
        : `${operationSet.summary} ${recoveredSceneIds.length} sahnenin promptu doğrudan yeniden üretildi.`,
    };

    return nextOperationSet;
  }, [
    dispatch,
    state.episodePrompt,
    state.masterPrompt,
    state.projectType,
    state.renderMode,
  ]);

  const applyOperationSet = useCallback(async (operationSet: any, mode: 'auto' | 'manual' = 'manual') => {
    const nextState = applyAgentOperations({
      sceneCards: state.sceneCards,
      characters: state.characters,
      locations: state.locations,
      timeContexts: state.timeContexts,
      references: state.references,
    }, operationSet);

    const referencesWithEpisode = nextState.references.map((reference: any): SceneReference => ({
      ...reference,
      episodeId: reference.episodeId || episodeId || '',
    }));

    dispatch({ type: 'SET_SCENES', payload: nextState.sceneCards });
    dispatch({ type: 'SET_CHARACTERS', payload: nextState.characters });
    dispatch({ type: 'SET_LOCATIONS', payload: nextState.locations });
    dispatch({ type: 'SET_TIME_CONTEXTS', payload: nextState.timeContexts });
    dispatch({ type: 'SET_REFERENCES', payload: referencesWithEpisode });

    const finalizedOperationSet = await regenerateStaleScenes(operationSet, {
      ...nextState,
      references: referencesWithEpisode,
    });

    agent.setLastOperationSet(finalizedOperationSet);
    agent.clearPendingOperationSet();
    agent.addMessage({
      role: 'status',
      content:
        mode === 'auto'
          ? `Uygulandı: ${finalizedOperationSet.summary}`
          : `Manuel uygulandı: ${finalizedOperationSet.summary}`,
      status: 'done',
      tags: inferOperationSetTags(finalizedOperationSet),
    });
    toast({
      title: mode === 'auto' ? 'Agent değişikliği uygulandı' : 'Agent değişiklikleri uygulandı',
      description: finalizedOperationSet.summary,
    });
  }, [
    agent,
    dispatch,
    episodeId,
    regenerateStaleScenes,
    state.characters,
    state.locations,
    state.references,
    state.sceneCards,
    state.timeContexts,
    toast,
  ]);

  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const [, base64 = ''] = result.split(',');
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  const handleAddAgentAttachment = useCallback(async (file: File) => {
    try {
      if (file.type && !file.type.startsWith('image/')) {
        toast({
          title: 'Görsel eklenemedi',
          description: 'Lütfen PNG, JPG, WEBP gibi bir görsel dosyası seç.',
          variant: 'destructive',
        });
        return;
      }

      const base64 = await fileToBase64(file);
      const attachmentId = crypto.randomUUID();
      const mimeType = file.type || 'image/png';
      let analysis = '';

      agent.setAttachments((prev: any) => [
        ...prev,
        {
          id: attachmentId,
          type: 'image',
          name: file.name,
          mimeType,
          base64,
        },
      ]);

      toast({
        title: 'Görsel eklendi',
        description: 'Agent komutunda bu görseli bağlam olarak kullanacak.',
      });

      if (aiProvider.isInitialized() && aiProvider.hasKeys()) {
        try {
          const attachmentSummary = await aiProvider.generateContent(
            'Describe this image for an editing agent. Focus on subject identity, clothing, accessories, color palette, and shape language. Return a short plain-text description.',
            'You are a visual reference analyst for a film editing tool. Respond in one short paragraph only.',
            {
              operationType: 'agent_attachment_analysis',
              images: [{ inlineData: { data: base64, mimeType } }],
              ...AGENT_MODEL_OPTIONS,
            },
          );
          analysis = attachmentSummary.trim();
        } catch (attachmentError) {
          console.warn('Attachment analysis skipped:', attachmentError);
          analysis = 'Görsel eklendi; otomatik ön analiz alınamadı.';
        }
      } else {
        analysis = 'Görsel eklendi; komut gönderilirken görsel bağlamı kullanılacak.';
      }

      agent.setAttachments((prev: any) => prev.map((attachment: any) => (
        attachment.id === attachmentId ? { ...attachment, analysis } : attachment
      )));
    } catch (error) {
      console.error('Failed to attach image:', error);
      toast({
        title: 'Görsel eklenemedi',
        description: 'Dosya okunurken bir hata oluştu.',
        variant: 'destructive',
      });
    }
  }, [agent, fileToBase64, toast]);

  const handleSubmitAgentCommand = useCallback(async () => {
    const command = agentCommand.trim();
    if (!command) return;

    if (!aiProvider.isInitialized() || !aiProvider.hasKeys()) {
      setNoKeysWarning(true);
      return;
    }

    agent.setOpen(true);
    agent.setIsBusy(true);
    agent.setIsStreaming(true);
    agent.clearPendingOperationSet();

    agent.addMessage({
      role: 'user',
      content: command,
      attachments: agent.attachments,
      tags: inferCommandTags(command),
    });

    const assistantMessageId = agent.addMessage({
      role: 'assistant',
      content: '',
      streaming: true,
    });

    setAgentCommand('');
    const activityId = agent.startActivity('thinking', ['Komut alındı', 'Bağlam hazırlanıyor']);

    try {
      const localQuery = resolveLocalAgentQuery({
        command,
        episodePrompt: state.episodePrompt,
        masterPrompt: state.masterPrompt,
      });

      if (localQuery) {
        agent.updateMessage(assistantMessageId, {
          content: localQuery.message,
          streaming: false,
          tags: inferCommandTags(command),
        });
        agent.finishActivity(activityId, {
          label: 'answered_locally',
          details: localQuery.details,
        });
        return;
      }

      const localOperationSet = tryBuildLocalAgentOperationSet({
        command,
        state: {
          characters: state.characters,
          sceneCards: state.sceneCards,
        },
      });

      if (localOperationSet) {
        agent.updateMessage(assistantMessageId, {
          content: localOperationSet.summary,
          streaming: false,
          tags: inferOperationSetTags(localOperationSet),
        });
        await applyOperationSet(localOperationSet, 'auto');
        agent.finishActivity(activityId, {
          label: 'applied_local_edit',
          details: [
            'Karakter-sahne ilişkileri yerel olarak çözüldü',
            `${localOperationSet.operations.length} operasyon üretildi`,
            'LLM çağrısı yapılmadı',
          ],
        });
        agent.clearAttachments();
        return;
      }

      const images = agent.attachments
        .filter((attachment: any) => attachment.base64)
        .map((attachment: any) => ({
          inlineData: {
            data: attachment.base64!,
            mimeType: attachment.mimeType,
          },
        }));

      if (images.length === 0) {
        try {
          const intentPrompt = buildAgentIntentPrompt({
            command,
            activeSceneId: state.activeSceneId,
            selectedEntityId,
            sceneCards: state.sceneCards,
            characters: state.characters,
            locations: state.locations,
            timeContexts: state.timeContexts,
            references: state.references,
          });

          const rawIntent = await aiProvider.generateContent(intentPrompt, AGENT_INTENT_SYSTEM_PROMPT, {
            operationType: 'agent_intent',
            responseMimeType: 'application/json',
            ...AGENT_MODEL_OPTIONS,
          });

          const parsedIntent = parseAgentIntent(rawIntent);
          const plannedOperationSet = planAgentIntent({
            intent: parsedIntent,
            sceneCards: state.sceneCards,
            characters: state.characters,
            locations: state.locations,
            activeSceneId: state.activeSceneId,
            selectedEntityId,
          });

          if (plannedOperationSet) {
            const operationSet = expandDirectPromptUpdatesForOperationSet({
              sceneCards: state.sceneCards,
              characters: state.characters,
              locations: state.locations,
              timeContexts: state.timeContexts,
              references: state.references,
            }, plannedOperationSet);

            agent.updateMessage(assistantMessageId, {
              content: plannedOperationSet.summary,
              streaming: false,
              tags: inferOperationSetTags(operationSet).length > 0
                ? inferOperationSetTags(operationSet)
                : inferIntentTags(parsedIntent),
            });

            if (operationSet.operations.length > 0 || operationSet.stalePromptSceneIds.length > 0) {
              await applyOperationSet(operationSet, 'auto');
            } else {
              agent.setPendingOperationSet(operationSet);
              agent.setLastOperationSet(operationSet);
            }

            agent.finishActivity(activityId, {
              label: 'resolved_intent',
              details: [
                `Hedef: ${parsedIntent.target.type}`,
                `Duzenleme: ${parsedIntent.edit.kind}`,
                `${operationSet.operations.length} operasyon planlandi`,
                `${operationSet.stalePromptSceneIds.length} stale sahne`,
              ],
            });

            agent.clearAttachments();
            return;
          }
        } catch (intentError) {
          console.warn('Intent-first agent flow failed, falling back to operation JSON:', intentError);
        }
      }

      const context = buildAgentContext({
        activeSceneId: state.activeSceneId,
        selectedEntityId,
        sceneCards: state.sceneCards,
        characters: state.characters,
        locations: state.locations,
        timeContexts: state.timeContexts,
        references: state.references,
        episodePrompt: state.episodePrompt,
        masterPrompt: state.masterPrompt,
      });

      const prompt = buildAgentUserPrompt({
        command,
        context,
        attachments: agent.attachments,
      });

      let streamed = '';
      const response = images.length > 0
        ? await aiProvider.generateContent(prompt, AGENT_SYSTEM_PROMPT, {
            operationType: 'agent_edit',
            images,
            ...AGENT_MODEL_OPTIONS,
          })
        : await aiProvider.generateContentStream(prompt, AGENT_SYSTEM_PROMPT, {
            operationType: 'agent_edit_stream',
            ...AGENT_MODEL_OPTIONS,
            onChunk: (text) => {
              streamed = text;
              agent.updateMessage(assistantMessageId, {
                content: stripAgentResultBlock(text) || 'Düşünüyorum...',
                tags: inferCommandTags(command),
              });
            },
          });

      const finalText = images.length > 0 ? response : streamed || response;
      const parsedOperationSet = parseAgentOperationSet(finalText);
      const operationSet = expandDirectPromptUpdatesForOperationSet({
        sceneCards: state.sceneCards,
        characters: state.characters,
        locations: state.locations,
        timeContexts: state.timeContexts,
        references: state.references,
      }, parsedOperationSet);

      agent.updateMessage(assistantMessageId, {
        content: stripAgentResultBlock(finalText) || 'Değişiklik hazır.',
        streaming: false,
        tags: inferOperationSetTags(operationSet).length > 0
          ? inferOperationSetTags(operationSet)
          : inferCommandTags(command),
      });

      if (operationSet.operations.length > 0 || operationSet.stalePromptSceneIds.length > 0) {
        await applyOperationSet(operationSet, 'auto');
      } else {
        agent.setPendingOperationSet(operationSet);
        agent.setLastOperationSet(operationSet);
      }

      agent.finishActivity(activityId, {
        label: images.length > 0 ? 'worked_with_image_context' : 'worked_with_scene_context',
        details: [
          images.length > 0
            ? `${images.length} görsel kullanıldı`
            : 'Metin tabanlı düzenleme akışı kullanıldı',
          `${operationSet.operations.length} operasyon üretildi`,
          `${operationSet.stalePromptSceneIds.length} stale sahne`,
        ],
      });

      agent.clearAttachments();
    } catch (error) {
      console.error('Agent command failed:', error);
      agent.updateMessage(assistantMessageId, {
        content: error instanceof Error ? error.message : 'Agent komutu işlenemedi.',
        streaming: false,
        status: 'error',
        tags: ['Hata'],
      });
      agent.finishActivity(activityId, {
        label: 'failed',
        details: [error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu.'],
      });
      toast({
        title: 'Agent komutu başarısız',
        description: error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      agent.setIsBusy(false);
      agent.setIsStreaming(false);
    }
  }, [
    agent,
    agentCommand,
    applyOperationSet,
    selectedEntityId,
    setAgentCommand,
    setNoKeysWarning,
    state.activeSceneId,
    state.characters,
    state.locations,
    state.masterPrompt,
    state.episodePrompt,
    state.references,
    state.sceneCards,
    state.timeContexts,
    toast,
  ]);

  const handleApplyAgentChanges = useCallback(() => {
    const operationSet = agent.pendingOperationSet;
    if (!operationSet) return;
    void applyOperationSet(operationSet, 'manual');
  }, [agent.pendingOperationSet, applyOperationSet]);

  return {
    handleAddAgentAttachment,
    handleSubmitAgentCommand,
    handleApplyAgentChanges,
  };
}
