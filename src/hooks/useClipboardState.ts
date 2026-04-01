import { useState, useEffect } from 'react';

// React dışı global hafıza — Context/Zustand'a gerek yok
let _copiedId: string | null = null;
const _listeners = new Set<() => void>();

function setCopiedIdGlobal(id: string | null) {
  _copiedId = id;
  _listeners.forEach(fn => fn());
}

export function useClipboardState() {
  const [copiedId, setCopiedIdLocal] = useState<string | null>(_copiedId);

  useEffect(() => {
    const listener = () => setCopiedIdLocal(_copiedId);
    _listeners.add(listener);
    // İlk mount'ta senkronize et
    setCopiedIdLocal(_copiedId);
    return () => {
      _listeners.delete(listener);
    };
  }, []);

  const setCopiedId = (id: string | null) => {
    setCopiedIdGlobal(id);
  };

  return { copiedId, setCopiedId };
}
