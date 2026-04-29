import { useCallback } from 'react';
import { aiProvider } from '@/lib/aiProvider';
import { buildAgentContext, buildAgentUserPrompt } from '@/lib/agentContext';
import { applyAgentOperations } from '@/lib/agentOperations';
import { parseAgentOperationSet, stripAgentResultBlock } from '@/lib/agentParser';
import { AGENT_SYSTEM_PROMPT } from '@/lib/agentPrompts';
import { tryBuildLocalAgentOperationSet } from '@/lib/agentLocalActions';
import { resolveLocalAgentQuery } from '@/lib/agentLocalQueries';
import { SceneReference } from '@/types';

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
  const applyOperationSet = useCallback((operationSet: any, mode: 'auto' | 'manual' = 'manual') => {
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

    agent.setLastOperationSet(operationSet);
    agent.clearPendingOperationSet();
    agent.addMessage({
      role: 'status',
      content: mode === 'auto'
        ? `Uygulandı: ${operationSet.summary}`
        : `Manuel uygulandı: ${operationSet.summary}`,
      status: 'done',
    });
    toast({
      title: mode === 'auto' ? 'Agent değişikliği uygulandı' : 'Agent değişiklikleri uygulandı',
      description: operationSet.summary,
    });
  }, [
    agent,
    dispatch,
    episodeId,
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
      const base64 = await fileToBase64(file);
      let analysis = '';
      if (aiProvider.isInitialized() && aiProvider.hasKeys()) {
        try {
          const attachmentSummary = await aiProvider.generateContent(
            'Describe this image for an editing agent. Focus on subject identity, clothing, accessories, color palette, and shape language. Return a short plain-text description.',
            'You are a visual reference analyst for a film editing tool. Respond in one short paragraph only.',
            {
              operationType: 'agent_attachment_analysis',
              images: [{ inlineData: { data: base64, mimeType: file.type || 'image/png' } }],
            }
          );
          analysis = attachmentSummary.trim();
        } catch (attachmentError) {
          console.warn('Attachment analysis skipped:', attachmentError);
        }
      }
      agent.setAttachments((prev: any) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: 'image',
          name: file.name,
          mimeType: file.type || 'image/png',
          base64,
          analysis,
        },
      ]);
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
        });
        applyOperationSet(localOperationSet, 'auto');
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

      const images = agent.attachments
        .filter((attachment: any) => attachment.base64)
        .map((attachment: any) => ({
          inlineData: {
            data: attachment.base64!,
            mimeType: attachment.mimeType,
          },
        }));

      let streamed = '';
      const response = images.length > 0
        ? await aiProvider.generateContent(prompt, AGENT_SYSTEM_PROMPT, {
            operationType: 'agent_edit',
            images,
          })
        : await aiProvider.generateContentStream(prompt, AGENT_SYSTEM_PROMPT, {
            operationType: 'agent_edit_stream',
            onChunk: (text) => {
              streamed = text;
              agent.updateMessage(assistantMessageId, {
                content: stripAgentResultBlock(text) || 'Düşünüyorum...',
              });
            },
          });

      const finalText = images.length > 0 ? response : streamed || response;
      agent.updateMessage(assistantMessageId, {
        content: stripAgentResultBlock(finalText) || 'Değişiklik hazır.',
        streaming: false,
      });

      const operationSet = parseAgentOperationSet(finalText);
      if (operationSet.operations.length > 0 || operationSet.stalePromptSceneIds.length > 0) {
        applyOperationSet(operationSet, 'auto');
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
    applyOperationSet(operationSet, 'manual');
  }, [agent.pendingOperationSet, applyOperationSet]);

  return {
    handleAddAgentAttachment,
    handleSubmitAgentCommand,
    handleApplyAgentChanges,
  };
}
