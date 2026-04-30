import React, { useMemo, useRef } from 'react';
import {
  Bot,
  ChevronDown,
  ImagePlus,
  Loader2,
  Paperclip,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { aiProvider } from '@/lib/aiProvider';
import type {
  AgentActivityItem,
  AgentAttachment,
  AgentMessage,
  AgentOperationSet,
} from '@/lib/agentSchema';
import { summarizeAgentOperation, summarizeAgentOperationSet } from '@/lib/agentPreview';
import { cn } from '@/lib/utils';
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
  activities: AgentActivityItem[];
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

function getActivityLabel(label: string) {
  switch (label) {
    case 'thinking':
      return 'Düşündü';
    case 'answered_locally':
      return 'Yerelden yanıtladı';
    case 'applied_local_edit':
      return 'Yerelde düzenledi';
    case 'worked_with_image_context':
      return 'Görsel bağlamında çalıştı';
    case 'worked_with_scene_context':
      return 'Sahne bağlamında çalıştı';
    case 'failed':
      return 'İşlem başarısız oldu';
    default:
      return label;
  }
}

function getMessageBubbleClass(role: AgentMessage['role']) {
  if (role === 'user') {
    return 'ml-12 bg-primary text-primary-foreground';
  }

  if (role === 'status') {
    return 'mr-12 border border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300';
  }

  return 'mr-12 border bg-background text-foreground';
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
    activities,
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
  const scenesById = useMemo(
    () => new Map((sceneCards ?? []).map((scene) => [scene.id, scene])),
    [sceneCards],
  );
  const charactersById = useMemo(
    () => new Map((characters ?? []).map((character) => [character.id, character])),
    [characters],
  );
  const operationSetToShow = pendingOperationSet ?? lastOperationSet;
  const modelName = aiProvider.getActiveModelName();
  const reasoningLabel = aiProvider.getReasoningStatusLabel();
  const activityItems = activities.slice(0, 6);
  const operationSummaryPills = operationSetToShow
    ? summarizeAgentOperationSet(operationSetToShow)
    : [];

  const formatActivityDuration = (activity: AgentActivityItem) => {
    const start = new Date(activity.startedAt).getTime();
    const end = activity.finishedAt ? new Date(activity.finishedAt).getTime() : Date.now();
    const seconds = Math.max(1, Math.round((end - start) / 1000));
    return `${seconds} sn`;
  };

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter') return;
    if (event.shiftKey || event.nativeEvent.isComposing) return;

    event.preventDefault();
    if (canSend) onSubmit();
  };

  return (
    <div className="flex h-full flex-col bg-card/95 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onToggleOpen}
            className="flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-foreground hover:bg-accent"
          >
            <Bot className="h-4 w-4 text-primary" />
            AI Editör
          </button>

          <div className="hidden min-w-0 items-center gap-2 md:flex">
            <Badge variant="outline" className="gap-1.5 text-[10px] font-medium">
              <span className="truncate">{modelName}</span>
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {reasoningLabel}
            </Badge>
            {isBusy && (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <Loader2 className="h-3 w-3 animate-spin" />
                {isStreaming ? 'Yanıt akıyor' : 'İşleniyor'}
              </Badge>
            )}
          </div>
        </div>

        {open && (
          <div className="flex items-center gap-3">
            <div className="hidden text-[11px] text-muted-foreground md:block">Panel yüksekliği</div>
            <input
              type="range"
              min={18}
              max={40}
              step={1}
              value={heightPercent}
              onChange={(event) => onHeightChange(Number(event.target.value))}
              className="w-24"
            />
          </div>
        )}
      </div>

      {open && (
        <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-h-0 flex-col border-r bg-background/40">
            <div className="border-b px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-foreground">Düzenleme Konuşması</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Direkt komut ver. <span className="font-medium">Enter</span> gönderir,
                    <span className="font-medium"> Shift+Enter</span> yeni satır açar.
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-1 md:hidden">
                  <Badge variant="outline" className="max-w-[160px] truncate text-[10px]">
                    {modelName}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {reasoningLabel}
                  </Badge>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 px-4 py-4">
              <div className="space-y-3">
                {messages.length === 0 ? (
                  <div className="rounded-2xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                    Buradan workspace state&apos;ini doğrudan düzenleyebilirsin.
                    <div className="mt-3 space-y-1 text-xs">
                      <div>&quot;Sahne 47&apos;nin pinned prompt&apos;unu daha hareketli yap&quot;</div>
                      <div>&quot;3. sahnedeki karakterin kaftan rengini koyulaştır&quot;</div>
                      <div>&quot;Kalabalık sahnelerde modern kıyafet hissini kaldır&quot;</div>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'rounded-2xl px-4 py-3 text-sm shadow-sm',
                        getMessageBubbleClass(message.role),
                      )}
                    >
                      <div className="mb-1 text-[11px] font-medium uppercase tracking-wide opacity-70">
                        {message.role === 'user'
                          ? 'Sen'
                          : message.role === 'status'
                            ? 'Durum'
                            : 'Agent'}
                      </div>
                      {message.tags && message.tags.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {message.tags.slice(0, 4).map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className={cn(
                                'border-current/15 bg-transparent px-2 py-0 text-[10px] font-normal opacity-90',
                                message.role === 'user'
                                  ? 'text-primary-foreground'
                                  : message.role === 'status'
                                    ? 'text-emerald-700 dark:text-emerald-300'
                                    : 'text-muted-foreground',
                              )}
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="border-t bg-background px-4 py-4">
              {attachments.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-2 rounded-full border bg-muted/30 px-3 py-1 text-xs"
                    >
                      <Paperclip className="h-3 w-3 text-primary" />
                      <span className="max-w-[180px] truncate">{attachment.name}</span>
                      <button
                        type="button"
                        onClick={() => onRemoveAttachment(attachment.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`${attachment.name} kaldır`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-2xl border bg-card p-3 shadow-sm">
                <textarea
                  value={command}
                  onChange={(event) => onCommandChange(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder="Örn: Sahne 45'teki yakın planı daha doğal yap ve adamın el hareketini koru."
                  className="min-h-[88px] w-full resize-none border-0 bg-transparent px-1 py-1 text-sm outline-none"
                  disabled={isBusy}
                />
                <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
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
                      className="h-9"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isBusy}
                    >
                      <ImagePlus className="mr-1.5 h-4 w-4" />
                      Görsel Ekle
                    </Button>
                    <div className="hidden text-[11px] text-muted-foreground md:block">
                      Shift+Enter ile alt satıra geç
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    className="h-9 min-w-[110px]"
                    onClick={onSubmit}
                    disabled={!canSend}
                  >
                    {isBusy ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-1.5 h-4 w-4" />
                    )}
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
              <div className="mt-1 text-xs text-muted-foreground">
                Sonuç özeti, işlem izi ve gerekiyorsa bekleyen değişiklikler.
              </div>
            </div>

            <ScrollArea className="flex-1 px-4 py-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border bg-background p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Model</div>
                    <div className="mt-1 text-sm font-medium text-foreground">{modelName}</div>
                  </div>
                  <div className="rounded-2xl border bg-background p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Mod</div>
                    <div className="mt-1 text-sm font-medium text-foreground">{reasoningLabel}</div>
                  </div>
                </div>

                <div className="rounded-2xl border bg-background p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    İşlem Zaman Çizgisi
                  </div>
                  {activityItems.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      Henüz bir işlem izi yok.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activityItems.map((activity) => (
                        <details key={activity.id} className="group rounded-xl border bg-muted/20 px-3 py-2">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs">
                            <div className="min-w-0">
                              <div className="font-medium text-foreground">
                                {getActivityLabel(activity.label)}
                              </div>
                              <div className="text-muted-foreground">
                                {formatActivityDuration(activity)}
                              </div>
                            </div>
                            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                          </summary>
                          {activity.details && activity.details.length > 0 && (
                            <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                              {activity.details.map((detail) => (
                                <div key={detail}>{detail}</div>
                              ))}
                            </div>
                          )}
                        </details>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border bg-background p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Sonuç
                  </div>

                  {!operationSetToShow ? (
                    <div className="text-sm text-muted-foreground">
                      Agent bir düzenleme yaptığında özet ve etkilenen sahneler burada görünecek.
                    </div>
                  ) : (
                    <div className="space-y-4 text-sm">
                      <div>
                        <div className="font-medium text-foreground">{operationSetToShow.summary}</div>
                        {operationSetToShow.reasoning && (
                          <p className="mt-1 text-muted-foreground">{operationSetToShow.reasoning}</p>
                        )}
                        {operationSummaryPills.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {operationSummaryPills.map((item) => (
                              <Badge key={item} variant="outline" className="text-[11px] font-normal">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          İşlemler
                        </div>
                        <div className="space-y-2">
                          {operationSetToShow.operations.slice(0, 8).map((operation, index) => {
                            const summary = summarizeAgentOperation({
                              operation,
                              scenesById,
                              charactersById,
                            });
                            return (
                              <div
                                key={`${operation.type}-${index}`}
                                className="rounded-xl border bg-muted/20 px-3 py-2 text-xs"
                              >
                                <div className="font-medium text-foreground">{summary.title}</div>
                                {summary.lines.length > 0 && (
                                  <div className="mt-1 space-y-1 text-[11px] text-muted-foreground">
                                    {summary.lines.map((line, lineIndex) => (
                                      <div key={`${index}-line-${lineIndex}`}>{line}</div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {operationSetToShow.operations.length > 8 && (
                            <div className="rounded-xl border border-dashed bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                              +{operationSetToShow.operations.length - 8} işlem daha
                            </div>
                          )}
                        </div>
                      </div>

                      {operationSetToShow.stalePromptSceneIds.length > 0 && (
                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Yeniden Üretim Gerekenler
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {operationSetToShow.stalePromptSceneIds.map((sceneId) => (
                              <Badge
                                key={sceneId}
                                variant="outline"
                                className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                              >
                                {scenesById.get(sceneId)?.sceneNumber
                                  ? `Sahne ${scenesById.get(sceneId)!.sceneNumber}`
                                  : sceneId}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {operationSetToShow.affectedSceneIds.length > 0 && (
                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Etkilenen Sahneler
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {operationSetToShow.affectedSceneIds.slice(0, 12).map((sceneId) => (
                              <Badge key={sceneId} variant="outline" className="text-[11px] font-normal">
                                {scenesById.get(sceneId)?.sceneNumber
                                  ? `Sahne ${scenesById.get(sceneId)!.sceneNumber}`
                                  : sceneId}
                              </Badge>
                            ))}
                            {operationSetToShow.affectedSceneIds.length > 12 && (
                              <Badge variant="outline" className="text-[11px] font-normal">
                                +{operationSetToShow.affectedSceneIds.length - 12} daha
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>

            {pendingOperationSet && (
              <div className="border-t bg-background px-4 py-4">
                <div className="mb-2 text-xs font-medium text-muted-foreground">
                  Bekleyen değişiklik var
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={onApply} disabled={isBusy}>
                    Bekleyeni Uygula
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={onDismissChanges} disabled={isBusy}>
                    Temizle
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
