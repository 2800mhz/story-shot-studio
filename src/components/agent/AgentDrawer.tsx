import React, { useRef } from 'react';
import { Bot, ImagePlus, Loader2, Paperclip, Send, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AgentAttachment, AgentMessage, AgentOperationSet } from '@/lib/agentSchema';
import { summarizeAgentOperation } from '@/lib/agentPreview';
import type { Character, SceneCard } from '@/types';

interface AgentDrawerProps {
  open: boolean;
  heightPercent: number;
  onToggleOpen: () => void;
  onHeightChange: (next: number) => void;
  messages: AgentMessage[];
  attachments: AgentAttachment[];
  isBusy: boolean;
  isStreaming: boolean;
  pendingOperationSet: AgentOperationSet | null;
  lastOperationSet: AgentOperationSet | null;
  command: string;
  onCommandChange: (next: string) => void;
  onSubmit: () => void;
  sceneCards?: SceneCard[];
  characters?: Character[];
  onAddAttachment: (file: File) => void;
  onRemoveAttachment: (id: string) => void;
  onApply: () => void;
  onDismissChanges: () => void;
}

export function AgentDrawer(props: AgentDrawerProps) {
  const {
    open,
    heightPercent,
    onToggleOpen,
    onHeightChange,
    messages,
    attachments,
    isBusy,
    isStreaming,
    pendingOperationSet,
    lastOperationSet,
    command,
    onCommandChange,
    onSubmit,
    sceneCards,
    characters,
    onAddAttachment,
    onRemoveAttachment,
    onApply,
    onDismissChanges,
  } = props;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canSend = command.trim().length > 0 && !isBusy;
  const scenesById = new Map((sceneCards ?? []).map((s) => [s.id, s]));
  const charactersById = new Map((characters ?? []).map((c) => [c.id, c]));
  const operationSetToShow = pendingOperationSet ?? lastOperationSet;

  return (
    <div className="flex h-full flex-col bg-card/95 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleOpen}
            className="flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-foreground hover:bg-accent"
          >
            <Bot className="h-4 w-4 text-primary" />
            AI Editör
          </button>
          {isBusy && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {isStreaming ? 'Streaming' : 'İşleniyor'}
            </span>
          )}
        </div>
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

      {open && (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-h-0 flex-col border-r">
              <ScrollArea className="flex-1 px-4 py-3">
                <div className="space-y-3">
                  {messages.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      Buradan workspace state&apos;ini doğrudan düzenleyebilirsin. Örn: &quot;Sahne 47&apos;nin pinned promptunu daha hareketli yap&quot; ya da &quot;3. sahnedeki karakterin kaftan rengini koyulaştır&quot;.
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
                    placeholder="Örn: Sahne 45'teki yakın planı daha doğal yap ve adamın el hareketini koru."
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
                  Son Agent İşlemi
                </div>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
                {!operationSetToShow ? (
                  <p className="text-sm text-muted-foreground">
                    Agent bir düzenleme yaptığında özet ve etkilenen sahneler burada görünecek.
                  </p>
                ) : (
                  <div className="space-y-4 text-sm">
                    <div>
                      <div className="font-medium text-foreground">{operationSetToShow.summary}</div>
                      {operationSetToShow.reasoning && (
                        <p className="mt-1 text-muted-foreground">{operationSetToShow.reasoning}</p>
                      )}
                    </div>

                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">İşlemler</div>
                      <div className="space-y-2">
                        {operationSetToShow.operations.map((operation, index) => {
                          const summary = summarizeAgentOperation({
                            operation,
                            scenesById,
                            charactersById,
                          });
                          return (
                            <div key={`${operation.type}-${index}`} className="rounded-lg border bg-background px-3 py-2 text-xs">
                              <div className="font-medium text-foreground">{summary.title}</div>
                              {summary.lines.length > 0 && (
                                <div className="mt-1 space-y-1 text-[11px] text-muted-foreground">
                                  {summary.lines.map((line, i) => (
                                    <div key={`${index}-line-${i}`}>{line}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {operationSetToShow.stalePromptSceneIds.length > 0 && (
                      <div>
                        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Yeniden Üretim Gerekenler</div>
                        <div className="flex flex-wrap gap-1">
                          {operationSetToShow.stalePromptSceneIds.map((sceneId) => (
                            <span
                              key={sceneId}
                              className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-600"
                            >
                              {scenesById.get(sceneId)?.sceneNumber ? `Sahne ${scenesById.get(sceneId)!.sceneNumber}` : sceneId}
                            </span>
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
                    Bekleyen Değişikliği Uygula
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={onDismissChanges} disabled={!pendingOperationSet || isBusy}>
                    Bekleyeni Temizle
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
