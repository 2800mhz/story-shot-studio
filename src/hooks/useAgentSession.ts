import { useMemo, useState } from 'react';
import type { AgentActivityItem, AgentAttachment, AgentMessage, AgentOperationSet } from '@/lib/agentSchema';

export function useAgentSession() {
  const [open, setOpen] = useState(false);
  const [heightPercent, setHeightPercent] = useState(41);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [attachments, setAttachments] = useState<AgentAttachment[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingOperationSet, setPendingOperationSet] = useState<AgentOperationSet | null>(null);
  const [lastOperationSet, setLastOperationSet] = useState<AgentOperationSet | null>(null);
  const [activities, setActivities] = useState<AgentActivityItem[]>([]);

  const addMessage = (message: Omit<AgentMessage, 'id' | 'createdAt'>) => {
    const next: AgentMessage = {
      ...message,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, next]);
    return next.id;
  };

  const updateMessage = (id: string, changes: Partial<AgentMessage>) => {
    setMessages((prev) => prev.map((message) => (
      message.id === id ? { ...message, ...changes } : message
    )));
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
  };

  const clearAttachments = () => setAttachments([]);
  const clearPendingOperationSet = () => setPendingOperationSet(null);
  const startActivity = (label: string, details?: string[]) => {
    const next: AgentActivityItem = {
      id: crypto.randomUUID(),
      label,
      startedAt: new Date().toISOString(),
      details,
    };
    setActivities((prev) => [next, ...prev].slice(0, 12));
    return next.id;
  };
  const finishActivity = (id: string, updates?: Partial<AgentActivityItem>) => {
    setActivities((prev) => prev.map((item) => (
      item.id === id
        ? { ...item, finishedAt: new Date().toISOString(), ...updates }
        : item
    )));
  };

  const session = useMemo(() => ({
    open,
    heightPercent,
    messages,
    attachments,
    isBusy,
    isStreaming,
    pendingOperationSet,
    lastOperationSet,
    activities,
  }), [open, heightPercent, messages, attachments, isBusy, isStreaming, pendingOperationSet, lastOperationSet, activities]);

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
    lastOperationSet,
    setLastOperationSet,
    activities,
    startActivity,
    finishActivity,
  };
}
