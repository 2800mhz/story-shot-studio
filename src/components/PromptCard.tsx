import React, { useState } from 'react';
import { Copy, Pencil, RefreshCw, ChevronLeft, Plus, Loader2, AlertTriangle, Trash2, Zap, ImageIcon, Link2, X, StickyNote, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import type { PromptVariant, ConsistencyGroup, SubScene } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SubSceneCard } from './SubSceneCard';

interface PromptCardProps {
  sceneIndex: number;
  episodeTitle: string;
  sceneText: string;
  referenceText?: string;
  prompts: PromptVariant[];
  status: 'pending' | 'generating' | 'done' | 'error';
  consistencyGroups?: ConsistencyGroup[];
  allConsistencyGroups?: ConsistencyGroup[];
  consistencyWarning?: boolean;
  note?: string;
  subScenes?: SubScene[];
  onGenerate: () => void;
  onCancel?: () => void;
  onRevise: (promptId: string, instruction: string) => void;
  onGenerateImage?: (promptId: string) => void;
  onRefreshAll: () => void;
  onDelete: () => void;
  onDeletePrompt?: (promptId: string) => void;
  onRegenerateGroup?: () => void;
  onAddToGroup?: (groupId: string | null) => void;
  onRemoveFromGroup?: (groupId: string) => void;
  onSetNote?: (note: string) => void;
  // Sub-scene callbacks
  onAddSubScene?: (label: string) => void;
  onRemoveSubScene?: (subSceneId: string) => void;
  onUpdateSubScene?: (subScene: SubScene) => void;
  onGenerateSubScene?: (subSceneId: string) => void;
  onReviseSubScene?: (subSceneId: string, promptId: string, instruction: string) => void;
  onRefreshSubScene?: (subSceneId: string) => void;
  onDeleteSubScenePrompt?: (subSceneId: string, promptId: string) => void;
  onSetSubSceneNote?: (subSceneId: string, note: string) => void;
  onGenerateSubSceneImage?: (subSceneId: string, promptId: string) => void;
  onAddSubSceneToGroup?: (subSceneId: string, groupId: string | null) => void;
  onRemoveSubSceneFromGroup?: (subSceneId: string, groupId: string) => void;
  isActive: boolean;
  onClick: () => void;
}

export function PromptCard({
  sceneIndex, episodeTitle, sceneText, referenceText, prompts, status,
  consistencyGroups = [], allConsistencyGroups = [],
  consistencyWarning, note, subScenes = [],
  onGenerate, onCancel, onRevise, onRefreshAll, onDelete, onDeletePrompt, onRegenerateGroup, onGenerateImage,
  onAddToGroup, onRemoveFromGroup, onSetNote,
  onAddSubScene, onRemoveSubScene, onGenerateSubScene, onReviseSubScene,
  onRefreshSubScene, onDeleteSubScenePrompt, onSetSubSceneNote,
  onGenerateSubSceneImage, onAddSubSceneToGroup, onRemoveSubSceneFromGroup,
  isActive, onClick,
}: PromptCardProps) {
  const [revisingId, setRevisingId] = useState<string | null>(null);
  const [revisionText, setRevisionText] = useState('');
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState(note || '');
  const [subScenesOpen, setSubScenesOpen] = useState(false);
  const [newSubSceneLabel, setNewSubSceneLabel] = useState('');
  const [showSubSceneInput, setShowSubSceneInput] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
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

  const handleAddSubScene = () => {
    const label = newSubSceneLabel.trim();
    if (!label || !onAddSubScene) return;
    onAddSubScene(label);
    setNewSubSceneLabel('');
    setShowSubSceneInput(false);
    setSubScenesOpen(true);
  };

  const currentGroupIds = new Set(consistencyGroups.map(g => g.id));
  const availableGroups = allConsistencyGroups.filter(g => !currentGroupIds.has(g.id));

  return (
    <div
      className={`rounded-lg border transition-colors ${
        isActive ? 'border-primary/50 bg-card' : 'border-border bg-card hover:border-border/80'
      }`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-xs font-semibold">
            SAHNE {sceneIndex}
          </Badge>
          <span className="text-xs text-muted-foreground truncate max-w-[150px]">{episodeTitle}</span>
          {consistencyGroups.map(g => (
            <Badge key={g.id} variant="outline" className="border-blue-500/40 bg-blue-500/10 text-blue-400 text-[10px] flex items-center gap-1">
              🔗 Grup {g.label}
              {onRemoveFromGroup && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveFromGroup(g.id); }}
                  className="ml-0.5 rounded hover:bg-blue-500/20"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {status === 'generating' && (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              {onCancel && (
                <button
                  onClick={(e) => { e.stopPropagation(); onCancel(); }}
                  className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors"
                  title="İptal et"
                >
                  <X className="h-3 w-3" /> İptal
                </button>
              )}
            </>
          )}
          {status === 'pending' && (
            <button onClick={(e) => { e.stopPropagation(); onGenerate(); }} className="rounded p-1 text-primary hover:bg-primary/10">
              <Zap className="h-3.5 w-3.5" />
            </button>
          )}
          {onSetNote && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowNote(p => !p); setNoteText(note || ''); }}
              title="Not ekle"
              className={`rounded p-1 hover:bg-secondary ${note ? 'text-yellow-400' : 'text-muted-foreground'}`}
            >
              <StickyNote className="h-3.5 w-3.5" />
            </button>
          )}
          {onAddToGroup && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowGroupPicker(p => !p); }}
              title="Tutarlılık grubuna ekle"
              className="rounded p-1 text-blue-400 hover:bg-blue-500/10"
            >
              <Link2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Note editor */}
      {showNote && onSetNote && (
        <div className="animate-fade-in border-b bg-yellow-500/5 px-4 py-2.5 space-y-2" onClick={e => e.stopPropagation()}>
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Bu sahne için not girin..."
            className="w-full rounded-md border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            rows={2}
          />
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={handleNoteSave}>Kaydet</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setShowNote(false); }}>İptal</Button>
          </div>
        </div>
      )}

      {/* Saved note display */}
      {note && !showNote && (
        <div className="border-b px-4 py-1.5 bg-yellow-500/5">
          <p className="text-[11px] text-yellow-400/90">📝 {note}</p>
        </div>
      )}

      {/* Group Picker */}
      {showGroupPicker && onAddToGroup && (
        <div className="animate-fade-in flex flex-wrap items-center gap-1.5 border-b bg-blue-500/5 px-4 py-2" onClick={e => e.stopPropagation()}>
          <span className="text-[10px] text-muted-foreground">Tutarlılık grubu:</span>
          {availableGroups.map(g => (
            <button
              key={g.id}
              onClick={() => { onAddToGroup(g.id); setShowGroupPicker(false); }}
              className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-400 hover:bg-blue-500/20"
            >
              Grup {g.label}
            </button>
          ))}
          <button
            onClick={() => { onAddToGroup(null); setShowGroupPicker(false); }}
            className="rounded-md border border-dashed border-blue-500/30 px-2 py-0.5 text-[11px] font-medium text-blue-400 hover:bg-blue-500/10"
          >
            + Yeni Grup
          </button>
          {availableGroups.length === 0 && allConsistencyGroups.length === 0 && (
            <span className="text-[10px] text-muted-foreground italic">Henüz grup yok — yeni oluştur</span>
          )}
          {availableGroups.length === 0 && allConsistencyGroups.length > 0 && (
            <span className="text-[10px] text-muted-foreground italic">Tüm gruplara eklendi</span>
          )}
        </div>
      )}

      {/* Scene text + refs */}
      <div className="border-b px-4 py-2 space-y-1">
        <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">📝 {sceneText}</p>
        {referenceText && (
          <p className="text-xs text-accent/80 line-clamp-1">👤 REF: {referenceText}</p>
        )}
      </div>

      {/* Consistency Warning */}
      {consistencyWarning && (
        <div className="mx-4 mt-2 flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <div className="flex-1 text-[11px] text-primary/90">
            Gruptaki başka sahne güncellendi. Tutarlılık için yeniden üretilsin mi?
            <div className="mt-1 flex gap-2">
              <button onClick={(e) => { e.stopPropagation(); onRegenerateGroup?.(); }} className="font-medium underline">Evet</button>
              <button className="text-muted-foreground">Hayır</button>
            </div>
          </div>
        </div>
      )}

      {/* Prompts */}
      <div className="px-4 py-3 space-y-3">
        {status === 'pending' && prompts.length === 0 && (
          <Button size="sm" onClick={(e) => { e.stopPropagation(); onGenerate(); }} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            ⚡ Prompt Üret
          </Button>
        )}

        {status === 'generating' && (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="shimmer h-16 rounded-md" />
            ))}
          </div>
        )}

        {prompts.map((prompt, pi) => (
          <div key={prompt.id} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-primary">🎬 PROMPT {pi + 1}</span>
              <Badge variant="secondary" className="text-[10px]">{prompt.shotType}</Badge>
              {onDeletePrompt && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeletePrompt(prompt.id); }}
                  title="Promptu sil"
                  className="ml-auto rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <p className="rounded-md bg-secondary/50 px-3 py-2 text-xs leading-relaxed text-foreground/85 font-mono">
              {prompt.text}
            </p>
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={(e) => { e.stopPropagation(); setRevisingId(revisingId === prompt.id ? null : prompt.id); setRevisionText(''); }}
                className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Pencil className="h-3 w-3" /> Revize
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleCopy(prompt.text); }}
                className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Copy className="h-3 w-3" /> Kopyala
              </button>
              {onGenerateImage && (
                <button
                  onClick={(e) => { e.stopPropagation(); onGenerateImage(prompt.id); }}
                  disabled={prompt.imageStatus === 'generating'}
                  className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
                >
                  {prompt.imageStatus === 'generating' ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />}
                  {prompt.imageStatus === 'generating' ? 'Üretiliyor...' : 'Görüntü Üret'}
                </button>
              )}
              {prompt.versions.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setHistoryId(historyId === prompt.id ? null : prompt.id); }}
                  className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <ChevronLeft className="h-3 w-3" /> Geçmiş ({prompt.versions.length})
                </button>
              )}
            </div>

            {/* Generated Image */}
            {prompt.imageUrl && (
              <div className="mt-2 rounded-md overflow-hidden border border-border">
                <img
                  src={prompt.imageUrl}
                  alt={`Sahne ${sceneIndex} - Prompt ${pi + 1}`}
                  className="w-full aspect-video object-cover"
                  loading="lazy"
                />
              </div>
            )}

            {revisingId === prompt.id && (
              <div className="animate-fade-in rounded-md border bg-muted/50 p-2.5 space-y-2">
                <textarea
                  value={revisionText}
                  onChange={e => setRevisionText(e.target.value)}
                  placeholder="Revizyon isteği yazın..."
                  className="w-full rounded-md border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  rows={2}
                  onClick={e => e.stopPropagation()}
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs bg-primary text-primary-foreground" onClick={(e) => { e.stopPropagation(); handleRevise(prompt.id); }}>
                    ✓ Uygula
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setRevisingId(null); }}>
                    İptal
                  </Button>
                </div>
              </div>
            )}

            {historyId === prompt.id && (
              <div className="animate-fade-in rounded-md border bg-muted/30 p-2.5 space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
                <p className="text-[10px] font-medium text-muted-foreground">Versiyon Geçmişi — tıkla geri dön</p>
                {prompt.versions.map((v, vi) => {
                  const isCurrent = v === prompt.text;
                  return (
                    <div
                      key={vi}
                      className={`group flex items-start gap-2 rounded px-2 py-1.5 transition-colors ${isCurrent ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/50 hover:bg-secondary cursor-pointer'}`}
                      onClick={() => {
                        if (!isCurrent) onRevise(prompt.id, `__RESTORE__::${v}`);
                        setHistoryId(null);
                      }}
                    >
                      <span className={`mt-0.5 shrink-0 text-[10px] font-bold ${isCurrent ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                        {isCurrent ? '▶ şimdi' : `v${vi + 1}`}
                      </span>
                      <p className="text-[11px] text-foreground/70 leading-relaxed">
                        {v.slice(0, 120)}{v.length > 120 ? '...' : ''}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {prompts.length > 0 && (
          <div className="flex gap-2 pt-1">
            <button onClick={(e) => { e.stopPropagation(); onGenerate(); }} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary">
              <Plus className="h-3 w-3" /> Varyasyon Ekle
            </button>
            <button onClick={(e) => { e.stopPropagation(); onRefreshAll(); }} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary">
              <RefreshCw className="h-3 w-3" /> Tümünü Yenile
            </button>
          </div>
        )}
      </div>

      {/* Sub-Scenes Section */}
      {onAddSubScene && (
        <div className="border-t px-4 py-2">
          <div className="flex items-center justify-between">
            <button
              onClick={(e) => { e.stopPropagation(); setSubScenesOpen(p => !p); }}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
            >
              {subScenesOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <Layers className="h-3 w-3" />
              Alt Sahneler
              {subScenes.length > 0 && (
                <Badge variant="secondary" className="text-[9px] h-3.5 px-1">{subScenes.length}</Badge>
              )}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowSubSceneInput(p => !p); if (!subScenesOpen) setSubScenesOpen(true); }}
              className="flex items-center gap-1 text-[10px] text-primary hover:bg-primary/10 rounded px-1.5 py-0.5"
            >
              <Plus className="h-2.5 w-2.5" /> Alt Sahne Ekle
            </button>
          </div>

          {showSubSceneInput && (
            <div className="mt-2 flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <input
                type="text"
                value={newSubSceneLabel}
                onChange={e => setNewSubSceneLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddSubScene(); if (e.key === 'Escape') setShowSubSceneInput(false); }}
                placeholder="Kelime veya ifade (ör: kuyuyu, çadırlar, saraylar)"
                className="flex-1 rounded border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
              <Button size="sm" className="h-7 text-xs" onClick={handleAddSubScene}>Ekle</Button>
            </div>
          )}

          {subScenesOpen && subScenes.length > 0 && (
            <div className="mt-1.5 space-y-0">
              {subScenes.map((ss, i) => {
                const ssGroups = ss.consistencyGroupIds?.map(gId => allConsistencyGroups.find(g => g.id === gId)).filter(Boolean) as ConsistencyGroup[] || [];
                return (
                  <SubSceneCard
                    key={ss.id}
                    subScene={ss}
                    sceneIndex={i + 1}
                    parentEpisodeTitle={episodeTitle}
                    consistencyGroups={ssGroups}
                    allConsistencyGroups={allConsistencyGroups}
                    onGenerate={() => onGenerateSubScene?.(ss.id)}
                    onRevise={(promptId, instruction) => onReviseSubScene?.(ss.id, promptId, instruction)}
                    onRefreshAll={() => onRefreshSubScene?.(ss.id)}
                    onDelete={() => onRemoveSubScene?.(ss.id)}
                    onDeletePrompt={onDeleteSubScenePrompt ? (promptId) => onDeleteSubScenePrompt(ss.id, promptId) : undefined}
                    onSetNote={(note) => onSetSubSceneNote?.(ss.id, note)}
                    onGenerateImage={onGenerateSubSceneImage ? (promptId) => onGenerateSubSceneImage(ss.id, promptId) : undefined}
                    onAddToGroup={onAddSubSceneToGroup ? (groupId) => onAddSubSceneToGroup(ss.id, groupId) : undefined}
                    onRemoveFromGroup={onRemoveSubSceneFromGroup ? (groupId) => onRemoveSubSceneFromGroup(ss.id, groupId) : undefined}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

