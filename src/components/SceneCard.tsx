import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Sparkles, Edit2, Trash2, Check, X, Copy, RefreshCw, Plus, ChevronDown, ChevronUp, AlertCircle, Clock, Pin, ImageIcon } from 'lucide-react';
import type { SceneCard as SceneCardType, Character, Location, TimeContext, PromptCard, SceneReference } from '@/types';
import { PromptHistoryModal, type HistoryEntry } from './PromptHistoryModal';
import { useClipboardState } from '@/hooks/useClipboardState';

interface SceneCardProps {
  scene: SceneCardType;
  characters: Character[];
  locations: Location[];
  availableCharacters?: Character[];
  availableLocations?: Location[];
  timeContexts?: TimeContext[];
  references?: SceneReference[];
  onUpdateNote: (sceneId: string, note: string) => void;
  onGeneratePrompts: (sceneId: string) => void;
  onDeleteScene: (sceneId: string) => void;
  onRemoveCharacter: (sceneId: string, characterId: string) => void;
  onRemoveLocation: (sceneId: string, locationId: string) => void;
  onAddCharacter?: (sceneId: string, characterId: string) => void;
  onAddLocation?: (sceneId: string, locationId: string) => void;
  onAddTimeContext?: (sceneId: string, timeContextId: string) => void;
  onRemoveTimeContext?: (sceneId: string, timeContextId: string) => void;
  onAddVariation?: (sceneId: string) => void;
  onRegenerateAll?: (sceneId: string) => void;
  onRevisePrompt?: (sceneId: string, promptId: string, instruction: string) => Promise<void>;
  onDeletePrompt?: (sceneId: string, promptId: string) => void;
  onRestorePreviousPrompt?: (sceneId: string, entry: HistoryEntry) => void;
  onSetPinnedPrompt?: (sceneId: string, promptId: string) => void;
  onGenerateSlotPrompt?: (sceneId: string, slotId: string) => void;
  isBulkGenerating?: boolean;
}

type EntityPickerOption = {
  id: string;
  name: string;
  meta?: string;
  description?: string;
};

function SceneEntityPicker({
  label,
  emptyText,
  allAddedText,
  options,
  selectedIds,
  onSelect,
  variant = 'primary',
}: {
  label: string;
  emptyText: string;
  allAddedText: string;
  options: EntityPickerOption[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  variant?: 'primary' | 'secondary';
}) {
  const [open, setOpen] = useState(false);
  const selectedIdSet = new Set(selectedIds);
  const selectableOptions = options.filter(option => !selectedIdSet.has(option.id));
  const buttonClass =
    variant === 'primary'
      ? 'border-primary/40 text-primary/70 hover:border-primary hover:text-primary'
      : 'border-secondary-foreground/30 text-muted-foreground hover:border-foreground/50 hover:text-foreground';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(event) => event.stopPropagation()}
          className={`inline-flex items-center gap-0.5 rounded-full border border-dashed px-2 py-0.5 text-xs transition-colors ${buttonClass}`}
        >
          <Plus className="h-2.5 w-2.5" /> Ekle
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0" onClick={(event) => event.stopPropagation()}>
        <Command className="[&_[cmdk-item][data-selected=true]]:bg-orange-500/10 [&_[cmdk-item][data-selected=true]]:text-orange-100">
          <CommandInput placeholder={`${label} ara...`} />
          <CommandList className="scrollbar-thin">
            {selectableOptions.length > 0 && <CommandEmpty>Sonuc bulunamadi.</CommandEmpty>}
            {options.length === 0 ? (
              <div className="px-3 py-4 text-xs text-muted-foreground">{emptyText}</div>
            ) : selectableOptions.length === 0 ? (
              <div className="px-3 py-4 text-xs text-muted-foreground">{allAddedText}</div>
            ) : (
              <CommandGroup heading={`Projedeki ${label.toLocaleLowerCase('tr-TR')}`}>
                {selectableOptions.map(option => (
                  <CommandItem
                    key={option.id}
                    value={`${option.name} ${option.meta ?? ''} ${option.description ?? ''}`}
                    onSelect={() => {
                      onSelect(option.id);
                      setOpen(false);
                    }}
                    className="items-start gap-2 transition-colors data-[selected=true]:bg-orange-500/10 data-[selected=true]:text-orange-100"
                  >
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-orange-400/80" />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium">{option.name}</span>
                      {option.meta && (
                        <span className="block truncate text-[10px] text-muted-foreground">{option.meta}</span>
                      )}
                      {option.description && (
                        <span className="mt-0.5 line-clamp-2 block text-[10px] leading-snug text-muted-foreground/80">
                          {option.description}
                        </span>
                      )}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { copiedId, setCopiedId } = useClipboardState();

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt.promptText).catch(() => {});
    setCopiedId(prompt.id);
  };

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
      <div className="flex items-start justify-between mb-1 gap-2 border-b border-border/40 pb-1.5">
        <div className="flex items-center flex-wrap gap-1.5">
          {copiedId === prompt.id && (
            <span
              className="inline-block h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse shrink-0 shadow-[0_0_6px_rgba(34,197,94,0.6)]"
              title="En son kopyalanan prompt"
            />
          )}
          <span className="text-xs font-bold text-primary">
            {prompt.label || prompt.shotType}
          </span>
          {copiedId === prompt.id && (
            <span className="ml-1 flex items-center gap-1 rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] font-bold text-green-500 border border-green-500/50" style={{ color: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.3)' }}>
              ✓ Kopyalandı
            </span>
          )}
          {prompt.label && prompt.shotType && (
            <span className="text-[10px] text-muted-foreground">({prompt.shotType})</span>
          )}
          {prompt.aspectRatio && (
            <Badge variant="secondary" className="text-xs ml-0.5">
              {prompt.aspectRatio}
            </Badge>
          )}
          {prompt.hasSubjectReference && (
            <span className="inline-flex items-center ml-2 border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[10px] px-1.5 py-0.5 rounded gap-1" title="Referans Görsel Uygulandı">
              <ImageIcon className="h-3 w-3" /> ref
            </span>
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
              onClick={() => {
                if (confirmDelete) {
                  onDelete(sceneId, prompt.id);
                } else {
                  setConfirmDelete(true);
                  setTimeout(() => setConfirmDelete(false), 3000);
                }
              }}
              className={`rounded p-1 transition-colors ${
                confirmDelete
                  ? 'bg-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground'
                  : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
              }`}
              title={confirmDelete ? "Emin misiniz? (Silmek için tekrar tıklayın)" : "Sil"}
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={handleCopy}
            className={`rounded p-1 transition-colors ${
              copiedId === prompt.id
                ? 'text-green-500 bg-green-500/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
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
      {prompt.isPinned && prompt.isPinnedByAI && prompt.pinReason && (
        <div className="mb-1 rounded-md border border-blue-500/20 bg-blue-500/5 px-2 py-1.5 text-[10px] leading-relaxed text-blue-200/90">
          <span className="font-semibold text-blue-300">AI neden bunu seçti:</span> {prompt.pinReason}
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
  availableCharacters = [],
  availableLocations = [],
  timeContexts = [],
  references = [],
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
  onGenerateSlotPrompt,
  isBulkGenerating,
}: SceneCardProps) {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editedNote, setEditedNote] = useState(scene.visualNote);

  // Sync local state when the scene prop is updated externally (e.g., after save)
  useEffect(() => {
    if (!isEditingNote) {
      setEditedNote(scene.visualNote);
    }
  }, [scene.visualNote, isEditingNote]);
  const [showTimeContextPicker, setShowTimeContextPicker] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [confirmDeleteScene, setConfirmDeleteScene] = useState(false);
  const [activeTab, setActiveTab] = useState<'generated' | 'slots'>('generated');
  const { copiedId: copiedSlotPromptId, setCopiedId: setCopiedSlotPromptId } = useClipboardState();

  const handleSaveNote = () => {
    onUpdateNote(scene.id, editedNote);
    setIsEditingNote(false);
  };

  const hasPrompts = scene.prompts.length > 0;
  const hasCameraAngleSlots = (scene.cameraAngleSlots?.length ?? 0) > 0;
  const hasPromptWorkspace = hasPrompts || hasCameraAngleSlots;
  const cameraAngleSlots = scene.cameraAngleSlots ?? [];
  const alternativeCameraAngleSlots = cameraAngleSlots.slice(3);
  const slotIndexBySlotId = new Map(cameraAngleSlots.map((slot, index) => [slot.id, index]));
  const slotIndexByPromptId = new Map(
    cameraAngleSlots
      .filter(slot => !!slot.promptId)
      .map(slot => [slot.promptId as string, slotIndexBySlotId.get(slot.id) ?? -1])
  );
  const promptsById = new Map(scene.prompts.map(prompt => [prompt.id, prompt]));
  const promptsBySlotId = new Map(
    scene.prompts
      .filter(prompt => !!prompt.slotId)
      .map(prompt => [prompt.slotId as string, prompt])
  );
  const getPromptSlotIndex = (prompt: PromptCard) => {
    if (prompt.slotId && slotIndexBySlotId.has(prompt.slotId)) {
      return slotIndexBySlotId.get(prompt.slotId);
    }
    return slotIndexByPromptId.get(prompt.id);
  };
  const generatedPrompts = scene.prompts.filter(prompt => {
    const slotIndex = getPromptSlotIndex(prompt);
    return slotIndex === undefined || slotIndex < 3;
  });
  const hasGeneratedPrompts = generatedPrompts.length > 0;
  const hasAlternativeSlots = alternativeCameraAngleSlots.length > 0;
  const getSlotPrompt = (slot: NonNullable<SceneCardType['cameraAngleSlots']>[number]) =>
    (slot.promptId ? promptsById.get(slot.promptId) : undefined) ?? promptsBySlotId.get(slot.id);
  const handleCopySlotPrompt = (prompt: PromptCard) => {
    navigator.clipboard.writeText(prompt.promptText).catch(() => {});
    setCopiedSlotPromptId(prompt.id);
  };

  useEffect(() => {
    if (!hasGeneratedPrompts && hasAlternativeSlots && activeTab === 'generated') {
      setActiveTab('slots');
    }
  }, [activeTab, hasAlternativeSlots, hasGeneratedPrompts]);

  const characterOptions = availableCharacters.map(character => ({
    id: character.id,
    name: character.name,
    meta: [character.role, character.isCrowd ? 'Kalabalik/grup' : undefined].filter(Boolean).join(' - '),
    description: character.visualDescription,
  }));
  const locationOptions = availableLocations.map(location => ({
    id: location.id,
    name: location.name,
    meta: [location.period, location.geography, location.architecture].filter(Boolean).join(' - '),
    description: location.visualDescription || location.atmosphere,
  }));

  const getReferenceTone = (referenceType: SceneReference['referenceType']) => {
    if (referenceType === 'subject') return 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300';
    if (referenceType === 'style') return 'bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-500/20 dark:text-fuchsia-300';
    return 'bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-300';
  };

  const getReferenceLabel = (reference: SceneReference) => {
    const base =
      reference.description?.trim() ||
      reference.filePath?.split('/').pop()?.split('\\').pop() ||
      'Referans';
    return base.length > 28 ? `${base.slice(0, 28)}...` : base;
  };

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
              variant={confirmDeleteScene ? "destructive" : "ghost"}
              className={confirmDeleteScene ? "h-7 w-7" : "h-7 w-7 text-destructive"}
              onClick={() => {
                if (confirmDeleteScene) {
                  onDeleteScene(scene.id);
                } else {
                  setConfirmDeleteScene(true);
                  setTimeout(() => setConfirmDeleteScene(false), 3000);
                }
              }}
              title={confirmDeleteScene ? "Emin misiniz? (Silmek için tekrar tıklayın)" : "Sahneyi sil"}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <details className="mt-3">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none">
            Sahne metni (tıkla göster)
          </summary>
          <p 
            className="text-xs text-muted-foreground mt-2 p-2 bg-background rounded leading-relaxed"
            dangerouslySetInnerHTML={{ __html: scene.text }}
          />
        </details>
      </div>

      {/* Entities */}
      <div className="border-b p-3 space-y-2 bg-muted/10">
        <div>
          <div className="text-xs font-semibold mb-1 text-muted-foreground">👤 Karakterler:</div>
          <div className="flex flex-wrap gap-1">
            {characters.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">Henüz karakter yok</span>
            ) : (
              characters.map(char => (
                <span key={char.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
                  {char.name}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveCharacter(scene.id, char.id);
                    }}
                    className="hover:text-destructive ml-0.5"
                    title="Kaldır"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))
            )}
            {onAddCharacter && (
              <SceneEntityPicker
                label="Karakter"
                emptyText="Bu projede henuz karakter yok."
                allAddedText="Bu sahneye tum proje karakterleri eklenmis."
                options={characterOptions}
                selectedIds={scene.characterIds ?? []}
                onSelect={(characterId) => onAddCharacter(scene.id, characterId)}
              />
            )}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold mb-1 text-muted-foreground">📍 Mekanlar:</div>
          <div className="flex flex-wrap gap-1">
            {locations.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">Henüz mekan yok</span>
            ) : (
              locations.map(loc => (
                <span key={loc.id} className="inline-flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground px-2 py-0.5 text-xs font-medium">
                  {loc.name}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveLocation(scene.id, loc.id);
                    }}
                    className="hover:text-destructive ml-0.5"
                    title="Kaldır"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))
            )}
            {onAddLocation && (
              <SceneEntityPicker
                label="Mekan"
                emptyText="Bu projede henuz mekan yok."
                allAddedText="Bu sahneye tum proje mekanlari eklenmis."
                options={locationOptions}
                selectedIds={scene.locationIds ?? []}
                onSelect={(locationId) => onAddLocation(scene.id, locationId)}
                variant="secondary"
              />
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

        <div>
          <div className="text-xs font-semibold mb-1 text-muted-foreground">Referanslar:</div>
          <div className="flex flex-wrap gap-1">
            {references.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">Bu sahneye atanmis referans yok</span>
            ) : (
              references.map((reference) => (
                <span
                  key={reference.id}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${getReferenceTone(reference.referenceType)}`}
                  title={reference.description || reference.filePath}
                >
                  <ImageIcon className="h-2.5 w-2.5" />
                  <span>{getReferenceLabel(reference)}</span>
                  <span className="opacity-70">· {reference.referenceType}</span>
                </span>
              ))
            )}
          </div>
        </div>
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
        </div>
      )}

      {hasPromptWorkspace ? (
        <div className="p-3 relative">
          {scene.status === 'generating' && (
            <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-[1px] rounded-b-lg border-t flex flex-col items-center justify-center p-4">
               <div className="flex items-center gap-2 text-primary bg-background/80 px-4 py-2 rounded-full shadow-sm border border-primary/20">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  <span className="text-xs font-medium animate-pulse">⚡ Yapay Zeka Yazıyor...</span>
               </div>
            </div>
          )}
          <div className="mb-3">
            <div className="flex border-b">
              <button
                className={`flex-1 py-1.5 text-xs font-medium border-b-2 transition-colors ${activeTab === 'generated' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                onClick={() => setActiveTab('generated')}
              >
                Üretilenler
              </button>
              <button
                className={`flex-1 py-1.5 text-xs font-medium border-b-2 transition-colors ${activeTab === 'slots' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                onClick={() => setActiveTab('slots')}
              >
                Alternatifler
              </button>
            </div>
          </div>

          {activeTab === 'generated' ? (
            <>
              {hasGeneratedPrompts ? (
                generatedPrompts.map(prompt => (
                  <InlinePromptCard
                    key={prompt.id}
                    prompt={prompt}
                    sceneId={scene.id}
                    onRevise={onRevisePrompt}
                    onDelete={onDeletePrompt}
                    onPin={onSetPinnedPrompt}
                  />
                ))
              ) : (
                <div className="rounded-md border border-dashed border-border bg-muted/10 p-4 text-center text-xs text-muted-foreground">
                  Bu sahnede ana prompt yok.
                </div>
              )}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[10px] font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => onAddVariation?.(scene.id)}
                  disabled={scene.status === 'generating' || isBulkGenerating}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Yeni Varyasyon
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[10px] font-medium text-muted-foreground hover:text-blue-600 hover:bg-blue-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => onRegenerateAll?.(scene.id)}
                  disabled={scene.status === 'generating' || isBulkGenerating}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Tümünü Yenile
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {alternativeCameraAngleSlots.map((slot) => {
                const slotPrompt = getSlotPrompt(slot);
                const hasOrphanedPromptLink = !!slot.promptId && !slotPrompt;
                const originalSlotIndex = slotIndexBySlotId.get(slot.id) ?? 0;

                return (
                  <div key={slot.id} className="border rounded-md p-3 bg-muted/20 relative">
                    {slot.isGenerating && (
                      <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-[1px] flex items-center justify-center rounded-md">
                        <span className="text-xs font-medium animate-pulse text-primary">Üretiliyor...</span>
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="text-xs font-medium text-foreground">
                        Slot {originalSlotIndex + 1}: {slot.label}
                      </div>
                      {slotPrompt && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-300">
                          <Check className="h-2.5 w-2.5" />
                          Prompt hazır
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {slot.focalLength} • {slot.angleDeg} • {slot.technique}
                    </div>
                    <div className="text-xs italic text-muted-foreground mb-3">
                      {slot.rationale}
                    </div>

                    {slotPrompt ? (
                      <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <div className="truncate text-[11px] font-medium text-foreground">
                            {slotPrompt.label || slotPrompt.shotType}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopySlotPrompt(slotPrompt)}
                            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border/70 px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <Copy className="h-2.5 w-2.5" />
                            {copiedSlotPromptId === slotPrompt.id ? 'Kopyalandı' : 'Kopyala'}
                          </button>
                        </div>
                        {slotPrompt.explanation && (
                          <div className="mb-1 border-l-2 border-emerald-500/30 pl-2 text-[10px] italic text-muted-foreground">
                            {slotPrompt.explanation}
                          </div>
                        )}
                        <div className="line-clamp-4 rounded bg-background/40 p-2 font-mono text-[11px] leading-relaxed text-foreground/80">
                          {slotPrompt.promptText}
                        </div>
                      </div>
                    ) : (
                      <>
                        {hasOrphanedPromptLink && (
                          <div className="mb-2 flex items-start gap-2 rounded-md border border-amber-500/25 bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-200">
                            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                            <span>Prompt kaydı bulunamadı. Bu açı yeniden üretilebilir.</span>
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs h-7"
                          onClick={() => {
                            if (onGenerateSlotPrompt) {
                              onGenerateSlotPrompt(scene.id, slot.id);
                            }
                          }}
                          disabled={slot.isGenerating || scene.status === 'generating'}
                        >
                          {hasOrphanedPromptLink ? 'Bu Açı İçin Promptu Yeniden Üret' : 'Bu Açı İçin Prompt Üret'}
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
              {!hasCameraAngleSlots && (
                <div className="rounded-md border border-dashed border-border bg-muted/10 p-4 text-center">
                  <p className="mb-3 text-xs text-muted-foreground">
                    Bu sahnede alternatif açı verisi yok. Yenileyince 6 açı yeniden oluşturulur.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => onRegenerateAll?.(scene.id)}
                    disabled={scene.status === 'generating' || isBulkGenerating}
                  >
                    Alternatifleri Oluştur
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-3">Prompt'lar henüz üretilmedi</p>
          <Button
            size="sm"
            onClick={() => onGeneratePrompts(scene.id)}
            disabled={scene.status === 'generating' || isBulkGenerating}
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


