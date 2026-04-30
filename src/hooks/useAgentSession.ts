import { useEffect, useMemo, useRef, useState } from 'react';
import type { AgentActivityItem, AgentAttachment, AgentMessage, AgentOperationSet } from '@/lib/agentSchema';
import {
  ensureAgentSession,
  fetchAgentMessages,
  fetchLatestAgentOperationLog,
  saveAgentMessage,
  saveAgentOperationLog,
  touchAgentSession,
} from '@/lib/supabaseQueries';

export function useAgentSession(args?: { episodeId?: string; userId?: string }) {
  const episodeId = args?.episodeId;
  const userId = args?.userId;
  const [open, setOpen] = useState(false);
  const [heightPercent, setHeightPercent] = useState(41);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [attachments, setAttachments] = useState<AgentAttachment[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingOperationSet, setPendingOperationSet] = useState<AgentOperationSet | null>(null);
  const [lastOperationSetState, setLastOperationSetState] = useState<AgentOperationSet | null>(null);
  const [activities, setActivities] = useState<AgentActivityItem[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const hydrationRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrateAgentSession() {
      if (!episodeId || !userId) return;

      try {
        const session = await ensureAgentSession(episodeId, userId);
        if (cancelled) return;

        setSessionId(session.id);

        const [storedMessages, latestLog] = await Promise.all([
          fetchAgentMessages(session.id),
          fetchLatestAgentOperationLog(session.id),
        ]);

        if (cancelled) return;

        setMessages(storedMessages);
        setLastOperationSetState(latestLog);
        hydrationRef.current = true;
      } catch (error) {
        console.warn('Agent session hydration skipped:', error);
      }
    }

    hydrationRef.current = false;
    void hydrateAgentSession();

    return () => {
      cancelled = true;
    };
  }, [episodeId, userId]);

  const persistMessage = (message: AgentMessage) => {
    if (!sessionId || !userId || !hydrationRef.current) return;
    void saveAgentMessage(sessionId, userId, message).catch((error) => {
      console.warn('Agent message persistence failed:', error);
    });
  };

  const addMessage = (message: Omit<AgentMessage, 'id' | 'createdAt'>) => {
    const next: AgentMessage = {
      ...message,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, next]);
    persistMessage(next);
    return next.id;
  };

  const updateMessage = (id: string, changes: Partial<AgentMessage>) => {
    setMessages((prev) => {
      const nextMessages = prev.map((message) => (
        message.id === id ? { ...message, ...changes } : message
      ));

      const updated = nextMessages.find((message) => message.id === id);
      if (updated) persistMessage(updated);

      return nextMessages;
    });
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
  };

  const clearAttachments = () => setAttachments([]);
  const clearPendingOperationSet = () => setPendingOperationSet(null);

  const setLastOperationSet = (operationSet: AgentOperationSet | null) => {
    setLastOperationSetState(operationSet);

    if (!operationSet || !sessionId || !userId || !hydrationRef.current) return;

    void saveAgentOperationLog(sessionId, userId, operationSet).catch((error) => {
      console.warn('Agent operation log persistence failed:', error);
    });
  };

  const startActivity = (label: string, details?: string[]) => {
    const next: AgentActivityItem = {
      id: crypto.randomUUID(),
      label,
      startedAt: new Date().toISOString(),
      details,
    };
    setActivities((prev) => [next, ...prev].slice(0, 12));
    if (sessionId && hydrationRef.current) {
      void touchAgentSession(sessionId).catch(() => undefined);
    }
    return next.id;
  };

  const finishActivity = (id: string, updates?: Partial<AgentActivityItem>) => {
    setActivities((prev) => prev.map((item) => (
      item.id === id
        ? { ...item, finishedAt: new Date().toISOString(), ...updates }
        : item
    )));
    if (sessionId && hydrationRef.current) {
      void touchAgentSession(sessionId).catch(() => undefined);
    }
  };

  const session = useMemo(() => ({
    open,
    heightPercent,
    messages,
    attachments,
    isBusy,
    isStreaming,
    pendingOperationSet,
    lastOperationSet: lastOperationSetState,
    activities,
    sessionId,
  }), [
    open,
    heightPercent,
    messages,
    attachments,
    isBusy,
    isStreaming,
    pendingOperationSet,
    lastOperationSetState,
    activities,
    sessionId,
  ]);

  return {
    session,
    setOpen,
    setHeightPercent,
    setMessages,
    addMessage,
    updateMessage,
    attachments,
    setAttachments,
    removeAttachment,
    clearAttachments,
    isBusy,
    setIsBusy,
    isStreaming,
    setIsStreaming,
    pendingOperationSet,
    setPendingOperationSet,
    clearPendingOperationSet,
    lastOperationSet: lastOperationSetState,
    setLastOperationSet,
    activities,
    startActivity,
    finishActivity,
    sessionId,
  };
}
