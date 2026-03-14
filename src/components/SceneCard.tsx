import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Edit2, Trash2, Check, X, Copy, RefreshCw, Plus, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Clock, Pin } from 'lucide-react';
import type { SceneCard as SceneCardType, Character, Location, TimeContext, PromptCard } from '@/types';
import { PromptHistoryModal, type HistoryEntry } from './PromptHistoryModal';

interface SceneCardProps {
  scene: SceneCardType;
  characters: Character[];
  locations: Location[];
  timeContexts?: TimeContext[];
  onUpdateNote: (sceneId: string, note: string) => void;
  onGeneratePrompts: (sceneId: string) => void;
  onDeleteScene: (sceneId: string) => void;
  onRemoveCharacter: (sceneId: string, characterId: string) => void;
  onRemoveLocation: (sceneId: string, locationId: string) => void;
  onAddCharacter?: (sceneId: string, name: string) => void;
  onAddLocation?: (sceneId: string, name: string) => void;
  onAddTimeContext?: (sceneId: string, timeContextId: string) => void;
  onRemoveTimeContext?: (sceneId: string, timeContextId: string) => void;
  onAddVariation?: (sceneId: string) => void;
  onRegenerateAll?: (sceneId: string) => void;
  onRevisePrompt?: (sceneId: string, promptId: string, instruction: string) => Promise<void>;
  onDeletePrompt?: (sceneId: string, promptId: string) => void;
  onRestorePreviousPrompt?: (sceneId: string, entry: HistoryEntry) => void;
  onSetPinnedPrompt?: (sceneId: string, promptId: string) => void;
}

function InlinePromptCard({
  prompt,
  sceneId,
  onRevise,
  onDelete,
  onPin,
}: {
  prompt: PromptCard;
  sceneId: string;
  onRevise?: (sceneId: string, promptId: string, instruction: string) => Promise<void>;
  onDelete?: (sceneId: string, promptId: string) => void;
  onPin?: (sceneId: string, promptId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isRevising, setIsRevising] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [instruction, setInstruction] = useState('');

  const submitRevision = async () => {
    if (!instruction.trim() || !onRevise) return;
    setIsSubmitting(true);
    try {
      await onRevise(sceneId, prompt.id, instruction);
    } finally {
      setIsSubmitting(false);
      setIsRevising(false);
      setInstruction('');
    }
  };

  return (
    <div className={`relative border rounded-md p-2.5 my-2 transition-all ${prompt.isPinned ? 'border-primary ring-1 ring-primary/40 bg-primary/5' : 'bg-muted/10'} ${isSubmitting ? 'opacity-60 pointer-events-none' : ''}`}>
      {isSubmitting && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[1px] rounded-md">
          <div className="flex flex-col items-center text-primary">
            <RefreshCw className="h-5 w-5 animate-spin mb-1" />
            <span className="text-[10px] font-medium">Revize Ediliyor...</span>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-1">
        <div>
          <span className="text-xs font-bold text-primary">
            {prompt.label || prompt.shotType}
          </span>
          {prompt.label && prompt.shotType && (
            <span className="text-[10px] text-muted-foreground ml-1.5">({prompt.shotType})</span>
          )}
          {prompt.aspectRatio && (
            <Badge variant="secondary" className="text-xs ml-1.5">
              {prompt.aspectRatio}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {prompt.isPinned && prompt.isPinnedByAI && (
            <span className="text-[9px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded-full font-medium" title="AI tarafından seçildi">
              🤖 AI
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onRevise && !isRevising && (
            <button
              onClick={() => setIsRevising(true)}
              className="text-[10px] px-1.5 py-0.5 rounded border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
              title="Revize et"
            >
              revize
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(sceneId, prompt.id)}
              className="rounded p-0.5 text-muted-foreground hover:text-destructive"
              title="Sil"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={() => navigator.clipboard.writeText(prompt.promptText)}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            title="Kopyala"
          >
            <Copy className="h-3 w-3" />
          </button>
          {onPin && (
            <button
              onClick={() => onPin(sceneId, prompt.id)}
              className={`rounded p-0.5 transition-colors ${
                prompt.isPinned
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-primary'
              }`}
              title={prompt.isPinned ? 'Raptiye kaldır' : 'Raptiye bas (bu promptu seç)'}
            >
              <Pin className={`h-3.5 w-3.5 ${prompt.isPinned ? 'fill-primary' : ''}`} />
            </button>
          )}
        </div>
      </div>
      {prompt.summary && (
        <p className="text-[11px] text-muted-foreground mb-1 italic">{prompt.summary}</p>
      )}
      {prompt.explanation && (
        <div className="text-[11px] text-muted-foreground italic border-l-2 border-primary/30 pl-2 mb-1">
          "{prompt.explanation}"
        </div>
      )}
      <div
        className={`text-[11px] font-mono leading-relaxed text-foreground/80 bg-muted/20 rounded p-2 ${
          expanded ? 'whitespace-pre-wrap' : 'line-clamp-2'
        }`}
      >
        {prompt.promptText}
      </div>
      <button
        onClick={() => setExpanded(p => !p)}
        className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground hover:text-foreground"
      >
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {expanded ? 'daralt' : 'genişlet'}
      </button>

      {/* Revision UI */}
      {isRevising && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <textarea
            className="w-full text-[11px] p-2 bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary min-h-[50px] resize-none mb-1"
            placeholder="Ne değişsin? Örn: Hava karlı olsun ve adamın elinde kılıç olsun."
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitRevision();
              }
            }}
          />
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsRevising(false)}
              className="h-6 text-[10px] px-2"
            >
              İptal
            </Button>
            <Button
              size="sm"
              onClick={submitRevision}
              disabled={!instruction.trim() || isSubmitting}
              className="h-6 text-[10px] px-2"
            >
              Uygula
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SceneCard({
  scene,
  characters,
  locations,
  timeContexts = [],
  onUpdateNote,
  onGeneratePrompts,
  onDeleteScene,
  onRemoveCharacter,
  onRemoveLocation,
  onAddCharacter,
  onAddLocation,
  onAddTimeContext,
  onRemoveTimeContext,
  onAddVariation,
  onRegenerateAll,
  onRevisePrompt,
  onDeletePrompt,
  onRestorePreviousPrompt,
  onSetPinnedPrompt,
}: SceneCardProps) {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editedNote, setEditedNote] = useState(scene.visualNote);
  const [addingCharacter, setAddingCharacter] = useState(false);
  const [addingLocation, setAddingLocation] = useState(false);
  const [showTimeContextPicker, setShowTimeContextPicker] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const handleSaveNote = () => {
    onUpdateNote(scene.id, editedNote);
    setIsEditingNote(false);
  };

  const hasPrompts = scene.prompts.length > 0;

  return (
    <div className="mb-4 rounded-lg border bg-card shadow-sm">
      {/* Header */}
      <div className="border-b bg-muted/30 p-4 rounded-t-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-muted-foreground">
                Sahne {scene.sceneNumber}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                scene.status === 'ready' ? 'bg-green-500/20 text-green-600' :
                scene.status === 'generating' ? 'bg-yellow-500/20 text-yellow-600' :
                'bg-secondary text-secondary-foreground'
              }`}>
                {scene.status === 'analyzed' && '📋 Analiz Tamamlandı'}
                {scene.status === 'generating' && '⏳ Prompt Üretiliyor...'}
                {scene.status === 'ready' && '✅ Hazır'}
              </span>
            </div>

            {isEditingNote ? (
              <div className="space-y-2">
                <textarea
                  value={editedNote}
                  onChange={e => setEditedNote(e.target.value)}
                  placeholder="Türkçe görsel açıklama..."
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  rows={2}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs" onClick={handleSaveNote}>
                    <Check className="h-3 w-3 mr-1" /> Kaydet
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setIsEditingNote(false); setEditedNote(scene.visualNote); }}>
                    <X className="h-3 w-3 mr-1" /> İptal
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <p className="text-base font-medium flex-1">"{scene.visualNote}"</p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={() => setIsEditingNote(true)}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setShowHistoryModal(true)}
              title="Önceki versiyonlar"
            >
              <Clock className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive"
              onClick={() => onDeleteScene(scene.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <details className="mt-3">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none">
            Sahne metni (tıkla göster)
          </summary>
          <p className="text-xs text-muted-foreground mt-2 p-2 bg-background rounded leading-relaxed">
            {scene.text}
          </p>
        </details>
      </div>

      {/* Entities */}
      <div className="border-b p-3 space-y-2 bg-muted/10">
        <div>
          <div className="text-xs font-semibold mb-1 text-muted-foreground">👤 Karakterler:</div>
          <div className="flex flex-wrap gap-1">
            {characters.length === 0 && !addingCharacter ? (
              <span className="text-xs text-muted-foreground italic">Henüz karakter yok</span>
            ) : (
              characters.map(char => (
                <span key={char.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
                  {char.name}
                  <button
                    onClick={() => onRemoveCharacter(scene.id, char.id)}
                    className="hover:text-destructive ml-0.5"
                    title="Kaldır"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))
            )}
            {addingCharacter ? (
              <input
                autoFocus
                placeholder="Karakter adı..."
                className="h-6 w-32 rounded border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                onBlur={() => setAddingCharacter(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    onAddCharacter?.(scene.id, e.currentTarget.value.trim());
                    setAddingCharacter(false);
                  } else if (e.key === 'Escape') {
                    setAddingCharacter(false);
                  }
                }}
              />
            ) : (
              onAddCharacter && (
                <button
                  onClick={() => setAddingCharacter(true)}
                  className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-primary/40 px-2 py-0.5 text-xs text-primary/70 hover:border-primary hover:text-primary transition-colors"
                >
                  <Plus className="h-2.5 w-2.5" /> Ekle
                </button>
              )
            )}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold mb-1 text-muted-foreground">📍 Mekanlar:</div>
          <div className="flex flex-wrap gap-1">
            {locations.length === 0 && !addingLocation ? (
              <span className="text-xs text-muted-foreground italic">Henüz mekan yok</span>
            ) : (
              locations.map(loc => (
                <span key={loc.id} className="inline-flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground px-2 py-0.5 text-xs font-medium">
                  {loc.name}
                  <button
                    onClick={() => onRemoveLocation(scene.id, loc.id)}
                    className="hover:text-destructive ml-0.5"
                    title="Kaldır"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))
            )}
            {addingLocation ? (
              <input
                autoFocus
                placeholder="Mekan adı..."
                className="h-6 w-32 rounded border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                onBlur={() => setAddingLocation(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    onAddLocation?.(scene.id, e.currentTarget.value.trim());
                    setAddingLocation(false);
                  } else if (e.key === 'Escape') {
                    setAddingLocation(false);
                  }
                }}
              />
            ) : (
              onAddLocation && (
                <button
                  onClick={() => setAddingLocation(true)}
                  className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-secondary-foreground/30 px-2 py-0.5 text-xs text-muted-foreground hover:border-foreground/50 hover:text-foreground transition-colors"
                >
                  <Plus className="h-2.5 w-2.5" /> Ekle
                </button>
              )
            )}
          </div>
        </div>

        {/* Time Contexts */}
        {scene.timeContextIds && scene.timeContextIds.length > 0 && (
          <div>
            <div className="text-xs font-semibold mb-1 text-muted-foreground">⏰ Zaman Bağlamı:</div>
            <div className="flex flex-wrap gap-1">
              {scene.timeContextIds.map(tcId => {
                const tc = timeContexts.find(t => t.id === tcId);
                if (!tc) return null;
                return (
                  <span key={tc.id} className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 text-purple-400 px-2 py-0.5 text-xs font-medium">
                    {tc.label}
                    {onRemoveTimeContext && (
                      <button
                        onClick={() => onRemoveTimeContext(scene.id, tc.id)}
                        className="hover:text-destructive ml-0.5"
                        title="Kaldır"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}
        {onAddTimeContext && timeContexts.length > 0 && (
          <div className="relative">
            {showTimeContextPicker ? (
              <div className="absolute z-10 left-0 top-6 bg-popover border rounded shadow-lg p-1 min-w-[160px]">
                {timeContexts
                  .filter(tc => !scene.timeContextIds?.includes(tc.id))
                  .map(tc => (
                    <button
                      key={tc.id}
                      className="block w-full text-left px-2 py-1 text-xs hover:bg-accent rounded"
                      onClick={() => { onAddTimeContext(scene.id, tc.id); setShowTimeContextPicker(false); }}
                    >
                      ⏰ {tc.label}
                      {tc.era && <span className="text-muted-foreground ml-1">({tc.era})</span>}
                    </button>
                  ))}
                {timeContexts.filter(tc => !scene.timeContextIds?.includes(tc.id)).length === 0 && (
                  <span className="block px-2 py-1 text-xs text-muted-foreground">Tümü eklenmiş</span>
                )}
                <button
                  className="block w-full text-left px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowTimeContextPicker(false)}
                >
                  ✕ Kapat
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowTimeContextPicker(true)}
                className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-purple-500/30 px-2 py-0.5 text-xs text-purple-400/70 hover:border-purple-400 hover:text-purple-400 transition-colors"
              >
                <Plus className="h-2.5 w-2.5" /> Ekle
              </button>
            )}
          </div>
        )}
      </div>

      {/* Prompts */}
      {/* Analysis Section */}
      {scene.analysis && (
        <div className="p-3 bg-muted/50 rounded-lg space-y-2 border mb-4 mx-3 mt-3">
          {/* Complexity Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              variant={
                scene.analysis.complexity === 'extreme' ? 'destructive' :
                scene.analysis.complexity === 'high' ? 'destructive' :
                scene.analysis.complexity === 'medium' ? 'secondary' :
                'default'
              }
              className="text-xs font-medium"
            >
              {scene.analysis.complexity.toUpperCase()}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Zorluk: <span className="font-medium">{scene.analysis.difficultyScore}/10</span>
            </span>
            <Badge variant="outline" className="text-xs">
              {scene.analysis.recommendedStyle}
            </Badge>
          </div>

          {/* Production Notes */}
          {scene.analysis.productionNotes.length > 0 && (
            <Alert className="py-2 bg-amber-50 border-amber-200">
              <AlertCircle className="h-3 w-3 text-amber-600" />
              <AlertDescription className="text-xs text-amber-900">
                <ul className="space-y-1 mt-1 ml-2">
                  {scene.analysis.productionNotes.map((note) => (
                    <li key={note} className="list-disc">
                      {note}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Optimizations Applied */}
          {scene.optimizations && scene.optimizations.length > 0 && (
            <Alert className="py-2 bg-green-50 border-green-200">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              <AlertDescription className="text-xs text-green-800">
                <strong>Uygulanan Optimizasyonlar:</strong> {scene.optimizations.join(' • ')}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {hasPrompts ? (
        <div className="p-3 relative">
          {scene.status === 'generating' && (
            <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-[1px] rounded-b-lg border-t flex flex-col items-center justify-center p-4">
               <div className="flex items-center gap-2 text-primary bg-background/80 px-4 py-2 rounded-full shadow-sm border border-primary/20">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  <span className="text-xs font-medium animate-pulse">⚡ Yapay Zeka Yazıyor...</span>
               </div>
            </div>
          )}
          <div className="text-xs font-semibold text-muted-foreground mb-1">Üretilen Promptlar:</div>
          {scene.prompts.map(prompt => (
            <InlinePromptCard
              key={prompt.id}
              prompt={prompt}
              sceneId={scene.id}
              onRevise={onRevisePrompt}
              onDelete={onDeletePrompt}
              onPin={onSetPinnedPrompt}
            />
          ))}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px] font-medium text-muted-foreground hover:text-primary hover:bg-primary/5"
              onClick={() => onAddVariation?.(scene.id)}
              disabled={scene.status === 'generating'}
            >
              <Plus className="h-3 w-3 mr-1" />
              Yeni Varyasyon
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px] font-medium text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
              onClick={() => onRegenerateAll?.(scene.id)}
              disabled={scene.status === 'generating'}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Tümünü Yenile
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-3">Prompt'lar henüz üretilmedi</p>
          <Button
            size="sm"
            onClick={() => onGeneratePrompts(scene.id)}
            disabled={scene.status === 'generating'}
            className="h-8 text-xs relative overflow-hidden"
          >
            {scene.status === 'generating' ? (
              <div className="flex items-center">
                 <Sparkles className="mr-1.5 h-3.5 w-3.5 animate-pulse" />
                 <span className="animate-pulse">⚡ Yazılıyor...</span>
                 <div className="absolute inset-0 bg-primary/10 animate-[shimmer_1.5s_infinite] -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              </div>
            ) : (
              <>
                 <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                 Promptları Üret
              </>
            )}
          </Button>
        </div>
      )}

      {showHistoryModal && (
        <PromptHistoryModal
          sceneId={scene.id}
          onClose={() => setShowHistoryModal(false)}
          onRestore={(entry) => {
            onRestorePreviousPrompt?.(scene.id, entry);
          }}
        />
      )}
    </div>
  );
}

