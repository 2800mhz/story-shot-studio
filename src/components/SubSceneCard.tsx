import React, { useState } from 'react';
import {
  Copy, Pencil, RefreshCw, ChevronLeft, Plus,
  Loader2, Trash2, Zap, Link2, X, StickyNote,
  ChevronDown, ChevronRight
} from 'lucide-react';
import type { PromptVariant, ConsistencyGroup, SubScene } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useClipboardState } from '@/hooks/useClipboardState';

interface SubSceneCardProps {
  subScene: SubScene;
  sceneIndex: number;
  parentEpisodeTitle: string;
  consistencyGroups: ConsistencyGroup[];
  allConsistencyGroups: ConsistencyGroup[];
  onGenerate: () => void;
  onRevise: (promptId: string, instruction: string) => void;
  onRefreshAll: () => void;
  onDelete: () => void;
  onDeletePrompt?: (promptId: string) => void;
  onSetNote?: (note: string) => void;
  onAddToGroup?: (groupId: string | null) => void;
  onRemoveFromGroup?: (groupId: string) => void;
}

export function SubSceneCard({
  subScene,
  sceneIndex,
  parentEpisodeTitle,
  consistencyGroups = [],
  allConsistencyGroups = [],
  onGenerate,
  onRevise,
  onRefreshAll,
  onDelete,
  onDeletePrompt,
  onSetNote,
  onAddToGroup,
  onRemoveFromGroup,
}: SubSceneCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [revisingId, setRevisingId] = useState<string | null>(null);
  const [revisionText, setRevisionText] = useState('');
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState(subScene.note || '');
  const [confirmDeletePromptId, setConfirmDeletePromptId] = useState<string | null>(null);

  // 🟢 Kopyalama durumu hook'u
  const { copiedId, setCopiedId } = useClipboardState();

  const prompts: PromptVariant[] = subScene.prompts || [];
  const status = subScene.status || 'pending';

  const handleCopy = (text: string, promptId: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(promptId);
  };

  const handleRevise = (promptId: string) => {
    if (!revisionText.trim()) return;
    onRevise(promptId, revisionText);
    setRevisionText('');
    setRevisingId(null);
  };

  const handleNoteSave = () => {
    onSetNote?.(noteText);
    setShowNote(false);
  };

  const currentGroupIds = new Set(consistencyGroups.map(g => g.id));
  const availableGroups = allConsistencyGroups.filter(g => !currentGroupIds.has(g.id));

  return (
    <div className="ml-3 mt-1.5 rounded-md border border-dashed border-border/60 bg-muted/10 overflow-hidden">
      {/* Sub-scene header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={(e) => { e.stopPropagation(); setIsOpen(p => !p); }}
            className="flex items-center gap-1 text-[11px] font-medium text-foreground/80 hover:text-foreground"
          >
            {isOpen
              ? <ChevronDown className="h-3 w-3" />
              : <ChevronRight className="h-3 w-3" />
            }
            🎬 Alt Sahne {sceneIndex}: <span className="text-primary/80">{subScene.label}</span>
          </button>

          {consistencyGroups.map(g => (
            <Badge
              key={g.id}
              variant="outline"
              className="border-blue-500/40 bg-blue-500/10 text-blue-400 text-[9px] flex items-center gap-0.5"
            >
              🔗 Grup {g.label}
              {onRemoveFromGroup && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveFromGroup(g.id); }}
                  className="ml-0.5 rounded hover:bg-blue-500/20"
                >
                  <X className="h-2 w-2" />
                </button>
              )}
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-0.5">
          {status === 'generating' && (
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
          )}
          {(status === 'pending' || status === 'error') && (
            <button
              onClick={(e) => { e.stopPropagation(); onGenerate(); }}
              className="rounded p-0.5 text-primary hover:bg-primary/10"
            >
              <Zap className="h-3 w-3" />
            </button>
          )}
          {onSetNote && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowNote(p => !p); setNoteText(subScene.note || ''); }}
              className={`rounded p-0.5 hover:bg-secondary ${subScene.note ? 'text-yellow-400' : 'text-muted-foreground'}`}
            >
              <StickyNote className="h-3 w-3" />
            </button>
          )}
          {onAddToGroup && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowGroupPicker(p => !p); }}
              className="rounded p-0.5 text-blue-400 hover:bg-blue-500/10"
            >
              <Link2 className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {!isOpen && prompts.length > 0 && (
        <div className="px-3 py-1 border-t border-dashed">
          <span className="text-[10px] text-muted-foreground">
            {prompts.length} prompt
            {/* En son kopyalanan bu alt sahneye aitse küçük işaret */}
            {prompts.some(p => p.id === copiedId) && (
              <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Son kopyalanan bu alt sahnede" />
            )}
          </span>
        </div>
      )}

      {isOpen && (
        <>
          {/* Note editor */}
          {showNote && onSetNote && (
            <div className="border-t bg-yellow-500/5 px-3 py-2 space-y-1.5" onClick={e => e.stopPropagation()}>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Alt sahne için not girin..."
                className="w-full rounded-md border bg-background px-2 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                rows={2}
              />
              <div className="flex gap-1.5">
                <Button size="sm" className="h-6 text-[10px] px-2" onClick={handleNoteSave}>Kaydet</Button>
                <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => setShowNote(false)}>İptal</Button>
              </div>
            </div>
          )}

          {/* Saved note */}
          {subScene.note && !showNote && (
            <div className="border-t px-3 py-1 bg-yellow-500/5">
              <p className="text-[10px] text-yellow-400/90">📝 {subScene.note}</p>
            </div>
          )}

          {/* Group picker */}
          {showGroupPicker && onAddToGroup && (
            <div className="border-t flex flex-wrap items-center gap-1 bg-blue-500/5 px-3 py-1.5" onClick={e => e.stopPropagation()}>
              <span className="text-[9px] text-muted-foreground">Grup:</span>
              {availableGroups.map(g => (
                <button
                  key={g.id}
                  onClick={() => { onAddToGroup(g.id); setShowGroupPicker(false); }}
                  className="rounded border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-400 hover:bg-blue-500/20"
                >
                  Grup {g.label}
                </button>
              ))}
              <button
                onClick={() => { onAddToGroup(null); setShowGroupPicker(false); }}
                className="rounded border border-dashed border-blue-500/30 px-1.5 py-0.5 text-[10px] text-blue-400 hover:bg-blue-500/10"
              >
                + Yeni
              </button>
            </div>
          )}

          {/* Scene text */}
          <div className="border-t px-3 py-1.5">
            <p className="text-[10px] leading-relaxed text-muted-foreground line-clamp-2">
              📝 {subScene.segments?.map(s => s.text).join(' ') || ''}
            </p>
          </div>

          {/* Prompts */}
          <div className="px-3 py-2 space-y-2">
            {(status === 'pending' || status === 'error') && prompts.length === 0 && (
              <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); onGenerate(); }}
                className="w-full h-7 text-[11px] bg-primary text-primary-foreground hover:bg-primary/90"
              >
                ⚡ {status === 'error' ? 'Tekrar Dene' : 'Prompt Üret'}
              </Button>
            )}

            {status === 'generating' && (
              <div className="space-y-1.5">
                {[1, 2].map(i => (
                  <div key={i} className="shimmer h-12 rounded-md" />
                ))}
              </div>
            )}

            {prompts.map((prompt, pi) => (
              <div key={prompt.id} className="rounded-md border bg-card overflow-hidden">
                {/* Prompt header */}
                <div className="bg-primary/5 border-b px-2.5 py-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 font-medium text-[11px] text-foreground leading-snug">
                        {/* 🟢 Yeşil nokta — son kopyalanan prompt */}
                        {copiedId === prompt.id && (
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse shrink-0 shadow-[0_0_6px_rgba(34,197,94,0.6)]"
                            title="En son kopyalanan prompt"
                          />
                        )}
                        {prompt.summary || `Prompt ${pi + 1}`}
                        {copiedId === prompt.id && (
                          <span
                            className="ml-1 rounded bg-green-500/15 px-1 py-0.5 text-[9px] font-bold text-green-500 border border-green-500/30"
                          >
                            ✓ Kopyalandı
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">
                        {prompt.shotType}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopy(prompt.text, prompt.id); }}
                        title="Kopyala"
                        className={`rounded p-1 transition-colors ${
                          copiedId === prompt.id
                            ? 'text-green-500 bg-green-500/10'
                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                        }`}
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRevisingId(revisingId === prompt.id ? null : prompt.id);
                          setRevisionText('');
                        }}
                        title="Revize et"
                        className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      {onDeletePrompt && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirmDeletePromptId === prompt.id) {
                              onDeletePrompt(prompt.id);
                            } else {
                              setConfirmDeletePromptId(prompt.id);
                              setTimeout(() => setConfirmDeletePromptId(null), 3000);
                            }
                          }}
                          title={confirmDeletePromptId === prompt.id ? "Emin misiniz? (Silmek için tekrar tıklayın)" : "Promptu sil"}
                          className={`rounded p-1 transition-colors ${
                            confirmDeletePromptId === prompt.id
                              ? 'bg-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground'
                              : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                          }`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Prompt text */}
                <div className="px-2.5 py-1.5">
                  <p className="rounded bg-muted/30 px-2 py-1 text-[10px] leading-relaxed text-foreground/85 font-mono whitespace-pre-wrap">
                    {prompt.text}
                  </p>
                </div>

                {/* Image */}
                {prompt.imageUrl && (
                  <div className="mx-2.5 mb-1.5 rounded-md overflow-hidden border">
                    <img
                      src={prompt.imageUrl}
                      alt={`Alt sahne ${sceneIndex} - Prompt ${pi + 1}`}
                      className="w-full aspect-video object-cover"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Revision editor */}
                {revisingId === prompt.id && (
                  <div className="animate-fade-in border-t bg-muted/50 px-2.5 py-1.5 space-y-1.5" onClick={e => e.stopPropagation()}>
                    <textarea
                      value={revisionText}
                      onChange={e => setRevisionText(e.target.value)}
                      placeholder="Revizyon isteği yazın..."
                      className="w-full rounded-md border bg-background px-2 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      rows={2}
                    />
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        className="h-6 text-[10px] px-2 bg-primary text-primary-foreground"
                        onClick={(e) => { e.stopPropagation(); handleRevise(prompt.id); }}
                      >
                        ✓ Uygula
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] px-2"
                        onClick={(e) => { e.stopPropagation(); setRevisingId(null); }}
                      >
                        İptal
                      </Button>
                    </div>
                  </div>
                )}

                {/* Version history */}
                {prompt.versions.length > 1 && (
                  <div className="border-t px-2.5 py-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setHistoryId(historyId === prompt.id ? null : prompt.id); }}
                      className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground"
                    >
                      <ChevronLeft className="h-2 w-2" /> Geçmiş ({prompt.versions.length})
                    </button>
                  </div>
                )}

                {historyId === prompt.id && (
                  <div className="animate-fade-in border-t bg-muted/30 px-2.5 py-1.5 space-y-1 max-h-36 overflow-y-auto scrollbar-thin">
                    <p className="text-[9px] font-medium text-muted-foreground">Versiyon Geçmişi</p>
                    {prompt.versions.map((v, vi) => {
                      const isCurrent = v === prompt.text;
                      return (
                        <div
                          key={vi}
                          className={`group flex items-start gap-1.5 rounded px-1.5 py-1 transition-colors ${
                            isCurrent
                              ? 'bg-primary/10 border border-primary/30'
                              : 'bg-secondary/50 hover:bg-secondary cursor-pointer'
                          }`}
                          onClick={() => {
                            if (!isCurrent) onRevise(prompt.id, `__RESTORE__::${v}`);
                            setHistoryId(null);
                          }}
                        >
                          <span className={`mt-0.5 shrink-0 text-[9px] font-bold ${
                            isCurrent ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                          }`}>
                            {isCurrent ? '▶' : `v${vi + 1}`}
                          </span>
                          <p className="text-[10px] text-foreground/70 leading-relaxed">
                            {v.slice(0, 100)}{v.length > 100 ? '...' : ''}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {prompts.length > 0 && (
              <div className="flex gap-2 pt-0.5">
                <button
                  onClick={(e) => { e.stopPropagation(); onGenerate(); }}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary"
                >
                  <Plus className="h-2.5 w-2.5" /> Varyasyon
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onRefreshAll(); }}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary"
                >
                  <RefreshCw className="h-2.5 w-2.5" /> Yenile
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
