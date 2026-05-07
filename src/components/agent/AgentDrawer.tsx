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
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AGENT_MODEL, AGENT_REASONING_LABEL } from '@/lib/agentModel';
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
      return 'Dusundu';
    case 'answered_locally':
      return 'Yerelden yanitladi';
    case 'applied_local_edit':
      return 'Yerelde uyguladi';
    case 'worked_with_image_context':
      return 'Gorsel baglaminda calisti';
    case 'worked_with_scene_context':
      return 'Sahne baglaminda calisti';
    case 'resolved_intent':
      return 'Niyeti cozumledi';
    case 'failed':
      return 'Islem basarisiz oldu';
    default:
      return label;
  }
}

function getMessageBubbleClass(role: AgentMessage['role']) {
  if (role === 'user') {
    return 'ml-10 border border-primary/15 bg-primary/10 text-foreground';
  }

  if (role === 'status') {
    return 'mr-10 border border-emerald-500/20 bg-emerald-500/8 text-emerald-900 dark:text-emerald-100';
  }

  return 'mr-10 border border-border/70 bg-card text-foreground';
}

function formatRole(role: AgentMessage['role']) {
  if (role === 'user') return 'Sen';
  if (role === 'status') return 'Durum';
  return 'Agent';
}

function MetricCard(props: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-3 py-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{props.label}</div>
      <div className={cn('mt-1 text-sm font-medium text-foreground', props.accent)}>{props.value}</div>
    </div>
  );
}

function SectionCard(props: React.PropsWithChildren<{ title: string; subtitle?: string; icon?: React.ReactNode }>) {
  const { title, subtitle, icon, children } = props;
  return (
    <div className="rounded-3xl border border-border/70 bg-card/95 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">{title}</div>
          {subtitle ? <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div> : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
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
  const modelName = AGENT_MODEL;
  const reasoningLabel = AGENT_REASONING_LABEL;
  const activityItems = activities.slice(0, 6);
  const operationSummaryPills = operationSetToShow ? summarizeAgentOperationSet(operationSetToShow) : [];

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
    <div className="flex h-full flex-col bg-background">
      <div className="border-b border-border/70 bg-card/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <button
              type="button"
              onClick={onToggleOpen}
              className="flex items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-accent/60"
            >
              <Bot className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">AI Editor</span>
            </button>
            <div className="mt-1 text-xs text-muted-foreground">
              Prompt, sahne, karakter ve stil revizyonlarini dogrudan buradan yonet.
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline" className="max-w-[180px] truncate text-[10px] font-medium">
              {modelName}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {reasoningLabel}
            </Badge>
            {isBusy ? (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <Loader2 className="h-3 w-3 animate-spin" />
                {isStreaming ? 'Yanit akiyor' : 'Calisiyor'}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                Hazir
              </Badge>
            )}
          </div>
        </div>

        {open ? (
          <div className="mt-3 text-[11px] text-muted-foreground">
            Enter gonderir, Shift+Enter yeni satir acar.
          </div>
        ) : null}
      </div>

      {open ? (
        <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_360px] bg-muted/15">
          <div className="flex min-h-0 flex-col border-r border-border/70 bg-background">
            <div className="border-b border-border/60 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">Konusma ve komut akisi</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Yonetmen notu gibi yaz. Hedefi sen tarif et, uygulamayi agent ciksin.
                  </div>
                </div>
                <div className="hidden items-center gap-2 md:flex">
                  <MetricCard label="Mesaj" value={String(messages.length)} />
                  <MetricCard label="Ek" value={String(attachments.length)} />
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 px-4 py-4">
              <div className="space-y-3">
                {messages.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-border/70 bg-card/60 p-5 text-sm text-muted-foreground">
                    <div className="font-medium text-foreground">Burasi chat degil, calisma yuzeyi.</div>
                    <div className="mt-2 leading-relaxed">
                      Ornekler:
                    </div>
                    <div className="mt-3 grid gap-2 text-xs md:grid-cols-2">
                      <div className="rounded-2xl border bg-background px-3 py-2">
                        Sahne 12'nin yakin planini daha dogal yap.
                      </div>
                      <div className="rounded-2xl border bg-background px-3 py-2">
                        Yasli Gocebe'nin kiyafetini 11. yuzyil gocebe Turkmen cizgisine cek.
                      </div>
                      <div className="rounded-2xl border bg-background px-3 py-2">
                        Kalabaliklarda modern kiyafet hissini kaldir.
                      </div>
                      <div className="rounded-2xl border bg-background px-3 py-2">
                        Pinned prompt'u biraz daha hareketli yap.
                      </div>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'rounded-3xl px-4 py-3 shadow-sm',
                        getMessageBubbleClass(message.role),
                      )}
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {formatRole(message.role)}
                        </div>
                        {message.tags && message.tags.length > 0 ? (
                          <div className="flex flex-wrap justify-end gap-1.5">
                            {message.tags.slice(0, 4).map((tag) => (
                              <Badge key={tag} variant="outline" className="px-2 py-0 text-[10px] font-normal">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="border-t border-border/60 bg-card/70 px-4 py-4 backdrop-blur-sm">
              {attachments.length > 0 ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex max-w-[360px] items-center gap-2 rounded-2xl border border-border/70 bg-background px-2.5 py-2 text-xs"
                    >
                      {attachment.base64 ? (
                        <img
                          src={`data:${attachment.mimeType};base64,${attachment.base64}`}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <Paperclip className="h-3 w-3 text-primary" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{attachment.name}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {attachment.analysis ? 'Hazir' : 'Analiz hazirlaniyor...'}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveAttachment(attachment.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`${attachment.name} kaldir`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="rounded-3xl border border-border/70 bg-background p-3 shadow-sm">
                <textarea
                  value={command}
                  onChange={(event) => onCommandChange(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder="Orn: Yasli adam hala fazla modern gorunuyor, kaftani ve kemerini daha donemsel yap."
                  className="min-h-[96px] w-full resize-none border-0 bg-transparent px-1 py-1 text-sm outline-none"
                  disabled={isBusy}
                />

                <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
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
                      Gorsel ekle
                    </Button>
                    <div className="hidden text-[11px] text-muted-foreground md:block">
                      Direkt komut ver, uzun aciklama yazmak zorunda degilsin.
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    className="h-9 min-w-[118px]"
                    onClick={onSubmit}
                    disabled={!canSend}
                  >
                    {isBusy ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-1.5 h-4 w-4" />
                    )}
                    Gonder
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col bg-muted/20">
            <ScrollArea className="flex-1 px-4 py-4">
              <div className="space-y-4">
                <SectionCard
                  title="Oturum durumu"
                  subtitle="Agent hangi modda calisiyor ve son komutta nasil davrandi."
                  icon={<Bot className="h-4 w-4" />}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <MetricCard label="Model" value={modelName} />
                    <MetricCard label="Mod" value={reasoningLabel} />
                    <MetricCard
                      label="Akis"
                      value={isBusy ? (isStreaming ? 'Streaming' : 'Calisiyor') : 'Bos'}
                      accent={isBusy ? 'text-primary' : undefined}
                    />
                    <MetricCard
                      label="Bekleyen"
                      value={pendingOperationSet ? 'Var' : 'Yok'}
                      accent={pendingOperationSet ? 'text-amber-600 dark:text-amber-400' : undefined}
                    />
                  </div>
                </SectionCard>

                <SectionCard
                  title="Islem zaman cizgisi"
                  subtitle="Son isteklerde agent'in ne yaptigini katman katman gorebilirsin."
                  icon={<Wand2 className="h-4 w-4" />}
                >
                  {activityItems.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Henuz bir islem izi yok.</div>
                  ) : (
                    <div className="space-y-2">
                      {activityItems.map((activity) => (
                        <details key={activity.id} className="group rounded-2xl border border-border/70 bg-background px-3 py-3">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-foreground">{getActivityLabel(activity.label)}</div>
                              <div className="mt-0.5 text-[11px] text-muted-foreground">{formatActivityDuration(activity)}</div>
                            </div>
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                          </summary>
                          {activity.details?.length ? (
                            <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                              {activity.details.map((detail) => (
                                <div key={detail} className="rounded-xl bg-muted/40 px-2.5 py-1.5">
                                  {detail}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </details>
                      ))}
                    </div>
                  )}
                </SectionCard>

                <SectionCard
                  title="Son agent islemi"
                  subtitle="Sonucun ozeti, uygulanan operasyonlar ve etkilenen sahneler."
                  icon={<Sparkles className="h-4 w-4" />}
                >
                  {!operationSetToShow ? (
                    <div className="text-sm text-muted-foreground">
                      Bir degisiklik uygulandiginda ozet, islem listesi ve etkilenen sahneler burada gorunecek.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm font-semibold text-foreground">{operationSetToShow.summary}</div>
                        {operationSetToShow.reasoning ? (
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            {operationSetToShow.reasoning}
                          </p>
                        ) : null}
                        {operationSummaryPills.length ? (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {operationSummaryPills.map((item) => (
                              <Badge key={item} variant="outline" className="text-[11px] font-normal">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div>
                        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Islemler
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
                                className="rounded-2xl border border-border/70 bg-background px-3 py-3"
                              >
                                <div className="text-sm font-medium text-foreground">{summary.title}</div>
                                {summary.lines.length ? (
                                  <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                                    {summary.lines.map((line, lineIndex) => (
                                      <div key={`${index}-line-${lineIndex}`}>{line}</div>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                          {operationSetToShow.operations.length > 8 ? (
                            <div className="rounded-2xl border border-dashed border-border/70 bg-background px-3 py-2 text-xs text-muted-foreground">
                              +{operationSetToShow.operations.length - 8} islem daha
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {operationSetToShow.stalePromptSceneIds.length > 0 ? (
                        <div>
                          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Yeniden uretim gerekenler
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
                      ) : null}

                      {operationSetToShow.affectedSceneIds.length > 0 ? (
                        <div>
                          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Etkilenen sahneler
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {operationSetToShow.affectedSceneIds.slice(0, 12).map((sceneId) => (
                              <Badge key={sceneId} variant="outline" className="text-[11px] font-normal">
                                {scenesById.get(sceneId)?.sceneNumber
                                  ? `Sahne ${scenesById.get(sceneId)!.sceneNumber}`
                                  : sceneId}
                              </Badge>
                            ))}
                            {operationSetToShow.affectedSceneIds.length > 12 ? (
                              <Badge variant="outline" className="text-[11px] font-normal">
                                +{operationSetToShow.affectedSceneIds.length - 12} daha
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </SectionCard>
              </div>
            </ScrollArea>

            {pendingOperationSet ? (
              <div className="border-t border-border/70 bg-card/95 px-4 py-4 backdrop-blur-sm">
                <div className="mb-2 text-xs font-medium text-muted-foreground">Bekleyen degisiklik var</div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={onApply} disabled={isBusy}>
                    Bekleyeni uygula
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={onDismissChanges} disabled={isBusy}>
                    Temizle
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
