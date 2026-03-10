import React, { useEffect, useState } from 'react';
import { X, Clock, RotateCcw, Loader2, Sparkles, RefreshCw, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchPromptHistory } from '@/lib/supabaseQueries';

export interface HistoryEntry {
  id: string;
  shot_type: string;
  prompt_text: string;
  created_at: string;
  type?: string;
  label?: string;
  summary?: string;
  explanation?: string;
  aspect_ratio?: '16:9' | '4:3' | '1:1' | '9:16';
  generation_type?: 'initial' | 'regenerate' | 'revision';
  revision_prompt?: string;
  is_active?: boolean;
}

interface GenerationBatch {
  batchKey: string; // first entry's created_at
  generationType: 'initial' | 'regenerate' | 'revision';
  revisionPrompt?: string;
  entries: HistoryEntry[];
  isActive: boolean; // true if any entry in this batch is active
}

interface PromptHistoryModalProps {
  sceneId: string;
  onRestore: (entry: HistoryEntry) => void;
  onClose: () => void;
}

/**
 * Groups flat prompt history entries into generation "batches".
 * Entries are in the same batch if created within 10 seconds of each other
 * and share the same generation_type + revision_prompt.
 */
function groupIntoBatches(history: HistoryEntry[]): GenerationBatch[] {
  if (history.length === 0) return [];

  const BATCH_WINDOW_MS = 10_000; // 10 seconds
  const batches: GenerationBatch[] = [];

  // history is ordered by created_at DESC from DB, so reverse to group chronologically
  const sorted = [...history].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  let currentBatch: GenerationBatch | null = null;

  for (const entry of sorted) {
    const entryTime = new Date(entry.created_at).getTime();
    const genType = entry.generation_type || 'initial';

    const isNewBatch =
      !currentBatch ||
      genType !== currentBatch.generationType ||
      entry.revision_prompt !== currentBatch.revisionPrompt ||
      entryTime - new Date(currentBatch.batchKey).getTime() > BATCH_WINDOW_MS;

    if (isNewBatch) {
      currentBatch = {
        batchKey: entry.created_at,
        generationType: genType as GenerationBatch['generationType'],
        revisionPrompt: entry.revision_prompt,
        entries: [entry],
        isActive: !!entry.is_active,
      };
      batches.push(currentBatch);
    } else {
      currentBatch.entries.push(entry);
      if (entry.is_active) currentBatch.isActive = true;
    }
  }

  // Reverse so newest batches appear first
  return batches.reverse();
}

export function PromptHistoryModal({ sceneId, onRestore, onClose }: PromptHistoryModalProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchPromptHistory(sceneId)
      .then(data => {
        if (active) {
          const entries = data as HistoryEntry[];
          setHistory(entries);
          // Auto-expand the first (most recent) batch
          const batches = groupIntoBatches(entries);
          if (batches.length > 0) setExpandedBatch(batches[0].batchKey);
        }
      })
      .catch(console.error)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sceneId]);

  // Close on ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleRestore = async (entry: HistoryEntry) => {
    setRestoringId(entry.id);
    onRestore(entry);
    setTimeout(() => { setRestoringId(null); onClose(); }, 600);
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('tr-TR', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  };

  const batchMeta = (batch: GenerationBatch) => {
    switch (batch.generationType) {
      case 'revision':
        return {
          label: 'Revizyon',
          icon: <PenLine className="h-3.5 w-3.5" />,
          color: 'text-amber-600',
          bg: 'bg-amber-50 border-amber-200',
          dot: 'bg-amber-400',
        };
      case 'regenerate':
        return {
          label: 'Yeniden Üretim',
          icon: <RefreshCw className="h-3.5 w-3.5" />,
          color: 'text-blue-600',
          bg: 'bg-blue-50 border-blue-200',
          dot: 'bg-blue-400',
        };
      default:
        return {
          label: 'İlk Üretim',
          icon: <Sparkles className="h-3.5 w-3.5" />,
          color: 'text-purple-600',
          bg: 'bg-purple-50 border-purple-200',
          dot: 'bg-purple-400',
        };
    }
  };

  const shotLabel = (entry: HistoryEntry) => entry.label || entry.shot_type || entry.type || 'Prompt';

  const batches = groupIntoBatches(history);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[85vh] flex flex-col rounded-xl border border-border bg-card shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Prompt Geçmişi</span>
            {!loading && batches.length > 0 && (
              <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                {batches.length} üretim turu
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
          {loading && (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Geçmiş yükleniyor...</span>
            </div>
          )}

          {!loading && batches.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Henüz başka versiyon üretilmedi.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Prompt yeniden üretildiğinde eski versiyonlar burada görünür.
              </p>
            </div>
          )}

          {!loading && batches.map((batch, batchIdx) => {
            const meta = batchMeta(batch);
            const isExpanded = expandedBatch === batch.batchKey;

            return (
              <div key={batch.batchKey} className="rounded-lg border border-border overflow-hidden">
                {/* Batch header — clickable to expand/collapse */}
                <button
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
                  onClick={() => setExpandedBatch(isExpanded ? null : batch.batchKey)}
                >
                  <span className={`shrink-0 ${meta.color}`}>{meta.icon}</span>
                  <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded border ${meta.bg} ${meta.color}`}>
                    {meta.label}
                  </span>
                  {batch.isActive && (
                    <span className="text-[10px] font-medium text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
                      ✓ Aktif
                    </span>
                  )}
                  {batchIdx === 0 && !batch.isActive && (
                    <span className="text-[10px] text-muted-foreground">en yeni</span>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                    {formatDate(batch.batchKey)} · {batch.entries.length} prompt
                  </span>
                  <span className="text-muted-foreground text-xs ml-1">
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </button>

                {/* Revision instruction (if any) */}
                {batch.generationType === 'revision' && batch.revisionPrompt && (
                  <div className="px-3 py-1.5 bg-amber-50/60 border-b border-amber-100 text-[11px] text-amber-700 italic">
                    💡 Revizyon talebi: "{batch.revisionPrompt}"
                  </div>
                )}

                {/* Prompt cards inside this batch */}
                {isExpanded && (
                  <div className="divide-y divide-border">
                    {batch.entries.map(entry => (
                      <div
                        key={entry.id}
                        className="group px-3 py-2.5 hover:bg-primary/5 transition-colors flex items-start gap-2"
                      >
                        <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${meta.dot}`} />
                        <div className="flex-1 min-w-0">
                          {/* Shot label + summary */}
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] font-medium text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">
                              {shotLabel(entry)}
                            </span>
                            {entry.is_active && (
                              <span className="text-[10px] text-green-600">✓ aktif</span>
                            )}
                          </div>
                          {/* Turkish summary */}
                          {entry.summary && (
                            <p className="text-[11px] text-foreground/80 font-medium mb-1 leading-snug">
                              {entry.summary}
                            </p>
                          )}
                          {/* English prompt text */}
                          <p className="text-[11px] text-muted-foreground leading-relaxed font-mono line-clamp-3">
                            {entry.prompt_text}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 shrink-0 text-xs gap-1 text-primary hover:bg-primary/10 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRestore(entry)}
                          disabled={restoringId === entry.id || !!entry.is_active}
                          title={entry.is_active ? 'Bu prompt zaten aktif' : 'Bu versiyonu geri yükle'}
                        >
                          {restoringId === entry.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <RotateCcw className="h-3 w-3" />
                          }
                          Geri Yükle
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2">
          <p className="text-[10px] text-muted-foreground">
            Her kart bir üretim turunu gösterir. Bir prompta tıklayarak o versiyonu geri yükleyebilirsiniz.
          </p>
        </div>
      </div>
    </div>
  );
}
