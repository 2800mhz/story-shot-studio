import React, { useRef } from 'react';
import { Bot, ChevronDown, ChevronUp, ImagePlus, Loader2, Paperclip, Send, Sparkles, Trash2, Undo2, UserRound, MapPin, Link2, Unlink, FileText, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AgentAttachment, AgentMessage, AgentOperation, AgentOperationSet, AgentScope } from '@/lib/agentSchema';

interface AgentDrawerProps {
  open: boolean;
  heightPercent: number;
  onToggleOpen: () => void;
  onHeightChange: (next: number) => void;
  scope: AgentScope;
  onScopeChange: (scope: AgentScope) => void;
  messages: AgentMessage[];
  attachments: AgentAttachment[];
  isBusy: boolean;
  isStreaming: boolean;
  pendingOperationSet: AgentOperationSet | null;
  command: string;
  onCommandChange: (value: string) => void;
  onSubmit: () => void;
  onAddAttachment: (file: File) => void;
  onRemoveAttachment: (id: string) => void;
  onApply: () => void;
  onDismissChanges: () => void;
  canUndo?: boolean;
  onUndo?: () => void;
}

function scopeLabel(scope: AgentScope) {
  switch (scope) {
    case 'active-scene':
      return 'Aktif Sahne';
    case 'selected-entity':
      return 'Seçili Entity';
    default:
      return 'Tüm Episode';
  }
}

/** Returns a human-readable one-line description for an agent operation. */
function describeOperation(op: AgentOperation): { icon: React.ReactNode; text: string; color: string } {
  switch (op.type) {
    case 'update_scene_note':
      return { icon: <FileText className="h-3 w-3" />, text: 'Sahne notu güncellendi', color: 'text-blue-500' };
    case 'update_scene_visual_note':
      return { icon: <FileText className="h-3 w-3" />, text: 'Görsel açıklama güncellendi', color: 'text-blue-500' };
    case 'update_prompt_text':
      return { icon: <Zap className="h-3 w-3" />, text: 'Prompt metni değiştirildi', color: 'text-violet-500' };
    case 'mark_prompt_stale':
      return { icon: <Zap className="h-3 w-3" />, text: op.reason ? `Prompt stale: ${op.reason}` : 'Prompt yeniden üretim için işaretlendi', color: 'text-amber-500' };
    case 'update_character': {
      const keys = Object.keys(op.changes).join(', ');
      return { icon: <UserRound className="h-3 w-3" />, text: `Karakter güncellendi (${keys})`, color: 'text-amber-400' };
    }
    case 'add_character':
      return { icon: <UserRound className="h-3 w-3" />, text: `Yeni karakter eklendi: ${op.character.name}`, color: 'text-green-500' };
    case 'remove_character':
      return { icon: <UserRound className="h-3 w-3" />, text: 'Karakter silindi', color: 'text-red-500' };
    case 'update_location': {
      const keys = Object.keys(op.changes).join(', ');
      return { icon: <MapPin className="h-3 w-3" />, text: `Mekan güncellendi (${keys})`, color: 'text-teal-400' };
    }
    case 'attach_character_to_scene':
      return { icon: <Link2 className="h-3 w-3" />, text: 'Karakter sahneye eklendi', color: 'text-green-400' };
    case 'detach_character_from_scene':
      return { icon: <Unlink className="h-3 w-3" />, text: 'Karakter sahneden çıkarıldı', color: 'text-red-400' };
    case 'add_reference_to_scene':
      return { icon: <Link2 className="h-3 w-3" />, text: 'Referans sahneye bağlandı', color: 'text-blue-400' };
    case 'remove_reference_from_scene':
      return { icon: <Unlink className="h-3 w-3" />, text: 'Referans sahneden kaldırıldı', color: 'text-red-400' };
    case 'add_scene_reference':
      return { icon: <Link2 className="h-3 w-3" />, text: `Yeni referans oluşturuldu: ${op.reference.description || op.reference.referenceType}`, color: 'text-green-400' };
    default:
      return { icon: <Sparkles className="h-3 w-3" />, text: (op as AgentOperation).type, color: 'text-muted-foreground' };
  }
}

export function AgentDrawer(props: AgentDrawerProps) {
  const {
    open,
    heightPercent,
    onToggleOpen,
    onHeightChange,
    scope,
    onScopeChange,
    messages,
    attachments,
    isBusy,
    isStreaming,
    pendingOperationSet,
    command,
    onCommandChange,
    onSubmit,
    onAddAttachment,
    onRemoveAttachment,
    onApply,
    onDismissChanges,
    canUndo = false,
    onUndo,
  } = props;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canSend = command.trim().length > 0 && !isBusy;

  return (
    <div className="border-t bg-card/95 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleOpen}
            className="flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-foreground hover:bg-accent"
          >
            <Bot className="h-4 w-4 text-primary" />
            AI Editör
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            {scopeLabel(scope)}
          </span>
          {isBusy && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {isStreaming ? 'Streaming' : 'İşleniyor'}
            </span>
          )}
          {canUndo && !isBusy && !pendingOperationSet && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={onUndo}
            >
              <Undo2 className="h-3 w-3" />
              Geri Al
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={scope}
            onChange={(event) => onScopeChange(event.target.value as AgentScope)}
            className="h-8 rounded-md border bg-background px-2 text-xs"
            disabled={isBusy}
          >
            <option value="episode">Tüm Episode</option>
            <option value="active-scene">Aktif Sahne</option>
            <option value="selected-entity">Seçili Entity</option>
          </select>
          {open && (
            <input
              type="range"
              min={18}
              max={40}
              step={1}
              value={heightPercent}
              onChange={(event) => onHeightChange(Number(event.target.value))}
              className="w-24"
            />
          )}
        </div>
      </div>

      {open && (
        <div style={{ height: `${heightPercent}vh` }} className="flex min-h-[220px] flex-col">
          <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-h-0 flex-col border-r">
              <ScrollArea className="flex-1 px-4 py-3">
                <div className="space-y-3">
                  {messages.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      Buradan episode state'iyle konuşabilirsin. Karakter, sahne, referans ve prompt değişikliklerini doğal dille iste.
                    </div>
                  ) : messages.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-xl px-3 py-2 text-sm ${
                        message.role === 'user'
                          ? 'ml-10 bg-primary text-primary-foreground'
                          : message.role === 'status'
                            ? 'border bg-muted/50 text-muted-foreground'
                            : 'mr-10 border bg-background'
                      }`}
                    >
                      <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="border-t p-3">
                {attachments.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs">
                        <Paperclip className="h-3 w-3 text-primary" />
                        <span className="max-w-[160px] truncate">{attachment.name}</span>
                        <button
                          type="button"
                          onClick={() => onRemoveAttachment(attachment.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-xl border bg-background p-2">
                  <textarea
                    value={command}
                    onChange={(event) => onCommandChange(event.target.value)}
                    placeholder="Örn: Sahne 45'teki adamın başındaki fes yerine mavi fötr şapka kullan."
                    className="min-h-[68px] w-full resize-none border-0 bg-transparent px-2 py-1 text-sm outline-none"
                    disabled={isBusy}
                  />
                  <div className="flex items-center justify-between border-t pt-2">
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) onAddAttachment(file);
                          event.currentTarget.value = '';
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isBusy}
                      >
                        <ImagePlus className="mr-1 h-3.5 w-3.5" />
                        Görsel Ekle
                      </Button>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={onSubmit}
                      disabled={!canSend}
                    >
                      {isBusy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1 h-3.5 w-3.5" />}
                      Gönder
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-col bg-muted/10">
              <div className="border-b px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Uygulama Önizlemesi
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {!pendingOperationSet ? (
                  <p className="text-sm text-muted-foreground">
                    Agent bir değişiklik önerdiğinde özet ve etkilenen sahneler burada görünecek.
                  </p>
                ) : (
                  <div className="space-y-4 text-sm">
                    <div>
                      <div className="font-medium text-foreground">{pendingOperationSet.summary}</div>
                      {pendingOperationSet.reasoning && (
                        <p className="mt-1 text-muted-foreground">{pendingOperationSet.reasoning}</p>
                      )}
                    </div>

                    {pendingOperationSet.affectedSceneIds.length > 0 && (
                      <div>
                        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Etkilenen Sahneler</div>
                        <div className="flex flex-wrap gap-1">
                          {pendingOperationSet.affectedSceneIds.map((sceneId) => (
                            <span key={sceneId} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">{sceneId}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Yapılacak Değişiklikler ({pendingOperationSet.operations.length})
                      </div>
                      <div className="space-y-1.5">
                        {pendingOperationSet.operations.map((operation, index) => {
                          const { icon, text, color } = describeOperation(operation);
                          return (
                            <div
                              key={`${operation.type}-${index}`}
                              className="flex items-start gap-2 rounded-md border bg-background px-2.5 py-2 text-xs"
                            >
                              <span className={`mt-0.5 shrink-0 ${color}`}>{icon}</span>
                              <span className="leading-relaxed text-foreground/80">{text}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {pendingOperationSet.stalePromptSceneIds.length > 0 && (
                      <div>
                        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">⚡ Yeniden Üretim Önerilen</div>
                        <div className="flex flex-wrap gap-1">
                          {pendingOperationSet.stalePromptSceneIds.map((sceneId) => (
                            <span key={sceneId} className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-600">{sceneId}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="border-t p-3">
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={onApply} disabled={!pendingOperationSet || isBusy}>
                    Değişiklikleri Uygula
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={onDismissChanges} disabled={!pendingOperationSet || isBusy}>
                    Temizle
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
