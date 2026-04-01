import { useState, useEffect } from 'react';

let globalCopiedId: string | null = null;

export function setGlobalCopiedId(id: string | null) {
  globalCopiedId = id;
  window.dispatchEvent(new CustomEvent('prompt-copied', { detail: id }));
}

export function useClipboardState() {
  const [copiedId, setCopiedIdState] = useState<string | null>(globalCopiedId);

  useEffect(() => {
    // Initial sync
    setCopiedIdState(globalCopiedId);

    const handleCopied = (e: Event) => {
      const customEvent = e as CustomEvent<string | null>;
      setCopiedIdState(customEvent.detail);
    };

    window.addEventListener('prompt-copied', handleCopied);
    return () => {
      window.removeEventListener('prompt-copied', handleCopied);
    };
  }, []);

  return { copiedId, setCopiedId: setGlobalCopiedId };
}
