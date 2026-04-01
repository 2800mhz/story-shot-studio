import { useState, useEffect } from 'react';

let globalCopiedId: string | null = null;
const listeners = new Set<(id: string | null) => void>();

export function setGlobalCopiedId(id: string | null) {
  globalCopiedId = id;
  listeners.forEach((listener) => listener(id));
}

export function useClipboardState() {
  const [copiedId, setCopiedIdState] = useState<string | null>(globalCopiedId);

  useEffect(() => {
    listeners.add(setCopiedIdState);
    return () => {
      listeners.delete(setCopiedIdState);
    };
  }, []);

  return { copiedId, setCopiedId: setGlobalCopiedId };
}
