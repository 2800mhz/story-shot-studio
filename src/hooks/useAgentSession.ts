import { useMemo, useState } from 'react';
import type { AgentAttachment, AgentMessage, AgentOperationSet } from '@/lib/agentSchema';

export function useAgentSession() {
  const [open, setOpen] = useState(false);
  const [heightPercent, setHeightPercent] = useState(41);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [attachments, setAttachments] = useState<AgentAttachment[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingOperationSet, setPendingOperationSet] = useState<AgentOperationSet | null>(null);

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

  const session = useMemo(() => ({
    open,
    heightPercent,
    messages,
    attachments,
    isBusy,
    isStreaming,
    pendingOperationSet,
  }), [open, heightPercent, messages, attachments, isBusy, isStreaming, pendingOperationSet]);

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
  };
}
