import React, { useState } from 'react';
import { Copy, Pencil, RefreshCw, ChevronLeft, Loader2, Trash2, Zap, ImageIcon, X, StickyNote, Plus, Link2 } from 'lucide-react';
import type { SubScene, PromptVariant, ConsistencyGroup } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
  onSetNote: (note: string) => void;
  onGenerateImage?: (promptId: string) => void;
  onAddToGroup?: (groupId: string | null) => void;
  onRemoveFromGroup?: (groupId: string) => void;
}

export function SubSceneCard({
  subScene, sceneIndex, parentEpisodeTitle,
  consistencyGroups, allConsistencyGroups,
  onGenerate, onRevise, onRefreshAll, onDelete, onDeletePrompt, onSetNote,
  onGenerateImage, onAddToGroup, onRemoveFromGroup,
}: SubSceneCardProps) {
  const [revisingId, setRevisingId] = useState<string | null>(null);
  const [revisionText, setRevisionText] = useState('');
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState(subScene.note || '');
  const [showGroupPicker, setShowGroupPicker] = useState(false);

  const currentGroupIds = new Set(consistencyGroups.map(g => g.id));
  const availableGroups = allConsistencyGroups.filter(g => !currentGroupIds.has(g.id));

  const handleCopy = (text: string) => navigator.clipboard.writeText(text);

  const handleRevise = (promptId: string) => {
    if (!revisionText.trim()) return;
    onRevise(promptId, revisionText);
    setRevisionText('');
    setRevisingId(null);
  };

  const handleNoteSave = () => {
    onSetNote(noteText);
    setShowNote(false);
  };

  return (
    <div className="rounded-md border border-border/60 bg-background/40 ml-3 mt-1.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 px-3 py-1.5">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
            ↳ Alt {sceneIndex}
          </span>
          <span className="text-xs font-medium text-foreground/80 truncate max-w-[180px]" title={subScene.label}>
            "{subScene.label}"
          </span>
          {consistencyGroups.map(g => (
            <Badge key={g.id} variant="outline" className="border-purple-500/40 bg-purple-500/10 text-purple-400 text-[9px] flex items-center gap-0.5 px-1">
              🔗 {g.label}
              {onRemoveFromGroup && (
                <button onClick={(e) => { e.stopPropagation(); onRemoveFromGroup(g.id); }}>
                  <X className="h-2 w-2" />
                </button>
              )}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {subScene.status === 'generating' && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
          {subScene.status === 'pending' && (
            <button onClick={onGenerate} className="rounded p-1 text-primary hover:bg-primary/10">
              <Zap className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={() => { setShowNote(p => !p); setNoteText(subScene.note || ''); }}
            title="Not ekle"
            className={`rounded p-1 hover:bg-secondary ${subScene.note ? 'text-yellow-400' : 'text-muted-foreground/50'}`}
          >
            <StickyNote className="h-3 w-3" />
          </button>
          {onAddToGroup && (
            <button
              onClick={() => setShowGroupPicker(p => !p)}
              title="Tutarlılık grubu"
              className="rounded p-1 text-purple-400 hover:bg-purple-500/10"
            >
              <Link2 className="h-3 w-3" />
            </button>
          )}
          <button onClick={onDelete} className="rounded p-1 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Note editor */}
      {showNote && (
        <div className="border-b border-border/40 bg-yellow-500/5 px-3 py-2 space-y-1.5">
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Bu alt sahne için not..."
            className="w-full rounded border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            rows={2}
          />
          <div className="flex gap-1.5">
            <Button size="sm" className="h-6 text-[11px]" onClick={handleNoteSave}>Kaydet</Button>
            <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => setShowNote(false)}>İptal</Button>
          </div>
        </div>
      )}

      {/* Saved note */}
      {subScene.note && !showNote && (
        <div className="border-b border-border/40 px-3 py-1 bg-yellow-500/5">
          <p className="text-[10px] text-yellow-400/90">📝 {subScene.note}</p>
        </div>
      )}

      {/* Group Picker */}
      {showGroupPicker && onAddToGroup && (
        <div className="flex flex-wrap items-center gap-1 border-b border-border/40 bg-purple-500/5 px-3 py-1.5">
          <span className="text-[10px] text-muted-foreground">Grup:</span>
          {availableGroups.map(g => (
            <button
              key={g.id}
              onClick={() => { onAddToGroup(g.id); setShowGroupPicker(false); }}
              className="rounded border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-400 hover:bg-purple-500/20"
            >
              {g.label}
            </button>
          ))}
          <button
            onClick={() => { onAddToGroup(null); setShowGroupPicker(false); }}
            className="rounded border border-dashed border-purple-500/30 px-1.5 py-0.5 text-[10px] font-medium text-purple-400 hover:bg-purple-500/10"
          >
            + Yeni
          </button>
        </div>
      )}

      {/* Sub-scene text */}
      <div className="border-b border-border/40 px-3 py-1.5">
        <p className="text-[11px] leading-relaxed text-muted-foreground">🔍 {subScene.segments.map(s => s.text).join(' ')}</p>
      </div>

      {/* Prompts */}
      <div className="px-3 py-2 space-y-2">
        {subScene.status === 'pending' && subScene.prompts.length === 0 && (
          <Button size="sm" onClick={onGenerate} className="w-full h-7 text-xs bg-primary/80 text-primary-foreground hover:bg-primary">
            ⚡ Alt Sahne Promptu Üret
          </Button>
        )}

        {subScene.status === 'generating' && (
          <div className="space-y-1.5">
            {[1, 2, 3].map(i => (
              <div key={i} className="shimmer h-12 rounded" />
            ))}
          </div>
        )}

        {subScene.prompts.map((prompt, pi) => (
          <div key={prompt.id} className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium text-primary">🎬 {pi + 1}</span>
              <Badge variant="secondary" className="text-[9px] h-4">{prompt.shotType}</Badge>
              {onDeletePrompt && (
                <button
                  onClick={() => onDeletePrompt(prompt.id)}
                  className="ml-auto rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
            <p className="rounded bg-secondary/40 px-2 py-1.5 text-[11px] leading-relaxed text-foreground/80 font-mono">
              {prompt.text}
            </p>
            <div className="flex items-center gap-0.5 flex-wrap">
              <button
                onClick={() => setRevisingId(revisingId === prompt.id ? null : prompt.id)}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <Pencil className="h-2.5 w-2.5" /> Revize
              </button>
              <button
                onClick={() => handleCopy(prompt.text)}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <Copy className="h-2.5 w-2.5" /> Kopyala
              </button>
              {onGenerateImage && (
                <button
                  onClick={() => onGenerateImage(prompt.id)}
                  disabled={prompt.imageStatus === 'generating'}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
                >
                  {prompt.imageStatus === 'generating' ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <ImageIcon className="h-2.5 w-2.5" />}
                  Görüntü
                </button>
              )}
              {prompt.versions.length > 1 && (
                <button
                  onClick={() => setHistoryId(historyId === prompt.id ? null : prompt.id)}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <ChevronLeft className="h-2.5 w-2.5" /> Geçmiş ({prompt.versions.length})
                </button>
              )}
            </div>

            {prompt.imageUrl && (
              <div className="mt-1.5 rounded overflow-hidden border border-border/50">
                <img src={prompt.imageUrl} alt={`Alt sahne ${pi + 1}`} className="w-full aspect-video object-cover" loading="lazy" />
              </div>
            )}

            {revisingId === prompt.id && (
              <div className="rounded border bg-muted/50 p-2 space-y-1.5">
                <textarea
                  value={revisionText}
                  onChange={e => setRevisionText(e.target.value)}
                  placeholder="Revizyon isteği..."
                  className="w-full rounded border bg-background px-2 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  rows={2}
                />
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-6 text-[11px] bg-primary text-primary-foreground" onClick={() => handleRevise(prompt.id)}>✓ Uygula</Button>
                  <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => setRevisingId(null)}>İptal</Button>
                </div>
              </div>
            )}

            {historyId === prompt.id && (
              <div className="rounded border bg-muted/30 p-2 space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
                {prompt.versions.map((v, vi) => (
                  <p key={vi} className="rounded bg-secondary/50 px-2 py-1 text-[10px] text-foreground/70">
                    <span className="font-medium text-muted-foreground">v{vi + 1}: </span>{v.slice(0, 80)}...
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}

        {subScene.prompts.length > 0 && (
          <div className="flex gap-2 pt-0.5">
            <button onClick={onGenerate} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary">
              <Plus className="h-2.5 w-2.5" /> Varyasyon
            </button>
            <button onClick={onRefreshAll} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary">
              <RefreshCw className="h-2.5 w-2.5" /> Yenile
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
