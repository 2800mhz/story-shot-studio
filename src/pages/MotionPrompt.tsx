import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Film, ArrowLeft, Plus, Trash2, Play, Square, Copy, Download, Upload, Check, Image as ImageIcon, Settings, ChevronDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { generateMotionPrompt } from '@/lib/motionPromptApi';
import { buildMotionContextFromFields, formatFinalPrompt, type TargetModel } from '@/lib/motionPromptFormatter';
import type { MotionPromptAnalysis } from '@/lib/motionPromptParser';
import { useAuth } from '@/contexts/AuthContext';
import { aiProvider } from '@/lib/aiProvider';

// ─── Types ───
interface QueueItem {
  id: string;
  file: File;
  thumbnailUrl: string;
  note: string;
  status: 'waiting' | 'processing' | 'analyzed' | 'done' | 'error';
  shortDescription?: string;
  prompt?: string;
  error?: string;
  apiKeyUsed?: string;
  cameraMotion?: string;
  cinematicStyle?: string;
  intensity?: 'Low' | 'Medium' | 'High';
  focalPoint?: string;
  targetModel?: TargetModel;
  basePrompt?: string;
  reasoning?: string;
}

const MODEL_PRESETS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite',
];

const DELAYS = [
  { label: '0.5s', value: 500 },
  { label: '1s', value: 1000 },
  { label: '2s', value: 2000 },
  { label: '3s', value: 3000 },
];

const CAMERA_MOTIONS = ['Pan Right', 'Pan Left', 'Dolly In', 'Dolly Out', 'Zoom In', 'Zoom Out', 'Tilt Up', 'Tilt Down', 'Static'];
const CINEMATIC_STYLES = ['Handheld', 'Steadycam', 'Drone', 'Static'];
const INTENSITIES: Array<'Low' | 'Medium' | 'High'> = ['Low', 'Medium', 'High'];
const TARGET_MODELS: TargetModel[] = ['Runway Gen-3', 'Kling AI', 'Luma Dream Machine'];
const PROJECT_EXPORT_VERSION = 1;

interface ExportedQueueItem {
  filename: string;
  mimeType: string;
  size: number;
  imageBase64: string;
  note: string;
  status: QueueItem['status'];
  shortDescription?: string;
  prompt?: string;
  error?: string;
  cameraMotion?: string;
  cinematicStyle?: string;
  intensity?: QueueItem['intensity'];
  focalPoint?: string;
  targetModel?: TargetModel;
  basePrompt?: string;
  reasoning?: string;
}

interface MotionProjectExport {
  version: number;
  createdAt: string;
  model: string;
  targetModel: TargetModel;
  globalNote: string;
  delay: number;
  queue: ExportedQueueItem[];
}

export default function MotionPrompt() {
  const { user } = useAuth();
  // ─── State ───
  const [hasKeys, setHasKeys] = useState(false);
  const [keysLoaded, setKeysLoaded] = useState(false);
  const [model, setModel] = useState(localStorage.getItem('motion_model') || 'gemini-2.0-flash');
  const [targetModel, setTargetModel] = useState<TargetModel>(
    (localStorage.getItem('motion_target_model') as TargetModel) || 'Runway Gen-3'
  );
  const [globalNote, setGlobalNote] = useState('');
  const [delay, setDelay] = useState(1000);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const abortRef = useRef(false);
  const queueRef = useRef<QueueItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => { localStorage.setItem('motion_model', model); }, [model]);
  useEffect(() => { localStorage.setItem('motion_target_model', targetModel); }, [targetModel]);
  useEffect(() => { queueRef.current = queue; }, [queue]);

  useEffect(() => {
    if (user?.id) {
      aiProvider.initialize(user.id).then(() => {
        setHasKeys(aiProvider.hasKeys());
        setKeysLoaded(true);
      }).catch(err => {
        console.error('Failed to init aiProvider:', err);
        setKeysLoaded(true);
      });
    } else {
      setKeysLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    setQueue(prev => prev.map(item => {
      if (item.status !== 'done') return item;
      if (item.targetModel === targetModel) return item;
      const updated = { ...item, targetModel };
      return { ...updated, prompt: formatFinalPrompt(updated, targetModel) };
    }));
  }, [targetModel]);

  useEffect(() => {
    return () => {
      queueRef.current.forEach(item => URL.revokeObjectURL(item.thumbnailUrl));
    };
  }, []);

  // ─── File handling ───
  const addFiles = useCallback((files: FileList | File[]) => {
    const items: QueueItem[] = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .map(f => ({
        id: crypto.randomUUID(),
        file: f,
        thumbnailUrl: URL.createObjectURL(f),
        note: '',
        status: 'waiting' as const,
        cameraMotion: 'Static',
        cinematicStyle: 'Steadycam',
        intensity: 'Medium',
        focalPoint: '',
        basePrompt: '',
        targetModel,
      }));
    setQueue(prev => [...prev, ...items]);
  }, [targetModel]);

  const removeItem = useCallback((id: string) => {
    setQueue(prev => {
      const item = prev.find(i => i.id === id);
      if (item) URL.revokeObjectURL(item.thumbnailUrl);
      return prev.filter(i => i.id !== id);
    });
  }, []);

  const updateNote = useCallback((id: string, note: string) => {
    setQueue(prev => prev.map(i => i.id === id ? { ...i, note } : i));
  }, []);

  const updateDoneItemSettings = useCallback((
    id: string,
    updates: Partial<Pick<QueueItem, 'cameraMotion' | 'cinematicStyle' | 'intensity' | 'focalPoint' | 'basePrompt'>>
  ) => {
    setQueue(prev => prev.map(i => {
      if (i.id !== id) return i;
      const updated = { ...i, ...updates, targetModel };
      if (updated.status === 'done') {
        return { ...updated, prompt: formatFinalPrompt(updated, targetModel) };
      }
      return { ...updated, prompt: undefined };
    }));
  }, [targetModel]);

  // ─── Drop handler ───
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  // ─── Processing ───

  const processQueue = useCallback(async () => {
    // We now rely on aiProvider keys
    setIsProcessing(true);
    abortRef.current = false;

    const waiting = queue.filter(i => i.status === 'waiting' || i.status === 'error');
    let lastMotionContext = getLastMotionContext(queue);

    for (const item of waiting) {
      if (abortRef.current) break;

      setQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'processing' } : i));

      let success = false;
      let attempts = 0;

      while (attempts < 3 && !success) { // Retry up to 3 times via aiProvider
        try {
          const analysis = await generateMotionPrompt(
            item.file, model, globalNote, item.note, lastMotionContext
          );
          const basePrompt = buildDefaultBasePrompt(item.note, analysis);
          const updatedItem: QueueItem = {
            ...item,
            status: 'analyzed',
            apiKeyUsed: 'auto',
            shortDescription: analysis.shortDescription,
            basePrompt,
            cameraMotion: analysis.cameraMotion,
            cinematicStyle: analysis.cinematicStyle,
            intensity: analysis.intensity,
            focalPoint: analysis.focalPoint,
            reasoning: analysis.reasoning,
            targetModel,
            prompt: undefined,
          };
          setQueue(prev => prev.map(i => i.id === item.id ? updatedItem : i));
          lastMotionContext = buildMotionContext(updatedItem);
          success = true;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : '';
          if (msg.includes('API_429') || msg.includes('API_403')) {
            attempts++;
            await new Promise(r => setTimeout(r, 1000));
          } else {
            setQueue(prev => prev.map(i => i.id === item.id ? {
              ...i, status: 'error', error: msg,
            } : i));
            success = true; // don't retry non-rate-limit errors
          }
        }
      }

      if (!success) {
        setQueue(prev => prev.map(i => i.id === item.id ? {
          ...i, status: 'error', error: 'API hatası veya Rate Limit aşıldı',
        } : i));
      }

      if (!abortRef.current && waiting.indexOf(item) < waiting.length - 1) {
        await new Promise(r => setTimeout(r, delay));
      }
    }

    setIsProcessing(false);
    toast.success('İşlem tamamlandı');
  }, [model, globalNote, delay, queue, targetModel]);

  const stopProcessing = useCallback(() => { abortRef.current = true; }, []);
  const approveAndGenerateFinalPrompts = useCallback(() => {
    setQueue(prev => prev.map(item => {
      if (item.status !== 'analyzed') return item;
      const prompt = formatFinalPrompt(item, item.targetModel || targetModel);
      return { ...item, status: 'done', prompt, targetModel: item.targetModel || targetModel };
    }));
    toast.success('Final promptlar üretildi');
  }, [targetModel]);

  // ─── Stats ───
  const total = queue.length;
  const done = queue.filter(i => i.status === 'done').length;
  const analyzed = queue.filter(i => i.status === 'analyzed').length;
  const errors = queue.filter(i => i.status === 'error').length;
  const progress = total > 0 ? ((done + analyzed) / total) * 100 : 0;

  // ─── Export ───
  const exportProject = useCallback(async () => {
    if (queue.length === 0) {
      toast.error('Dışa aktarım için kuyrukta veri yok');
      return;
    }

    const exportedQueue: ExportedQueueItem[] = await Promise.all(queue.map(async item => ({
      filename: item.file.name,
      mimeType: item.file.type || 'image/jpeg',
      size: item.file.size,
      imageBase64: await fileToBase64(item.file),
      note: item.note,
      status: item.status,
      shortDescription: item.shortDescription,
      prompt: item.prompt,
      error: item.error,
      cameraMotion: item.cameraMotion,
      cinematicStyle: item.cinematicStyle,
      intensity: item.intensity,
      focalPoint: item.focalPoint,
      targetModel: item.targetModel || targetModel,
      basePrompt: item.basePrompt,
      reasoning: item.reasoning,
    })));

    const payload: MotionProjectExport = {
      version: PROJECT_EXPORT_VERSION,
      createdAt: new Date().toISOString(),
      model,
      targetModel,
      globalNote,
      delay,
      queue: exportedQueue,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `motion-project-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [delay, globalNote, model, queue, targetModel]);

  const importProject = useCallback(async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text) as MotionProjectExport;

    if (!Array.isArray(parsed.queue)) {
      throw new Error('Geçersiz proje dosyası');
    }

    const restoredQueue = await Promise.all(parsed.queue.map(async item => {
      const restoredFile = base64ToFile(item.imageBase64, item.filename, item.mimeType);
      return {
        id: crypto.randomUUID(),
        file: restoredFile,
        thumbnailUrl: URL.createObjectURL(restoredFile),
        note: item.note || '',
        status: normalizeImportedStatus(item.status),
        shortDescription: item.shortDescription,
        prompt: item.prompt,
        error: item.error,
        cameraMotion: item.cameraMotion || 'Static',
        cinematicStyle: item.cinematicStyle || 'Steadycam',
        intensity: item.intensity || 'Medium',
        focalPoint: item.focalPoint || '',
        targetModel: item.targetModel || targetModel,
        basePrompt: item.basePrompt || '',
        reasoning: item.reasoning,
      } satisfies QueueItem;
    }));

    queue.forEach(item => URL.revokeObjectURL(item.thumbnailUrl));
    setModel(parsed.model || model);
    setTargetModel(parsed.targetModel || targetModel);
    setGlobalNote(parsed.globalNote || '');
    setDelay(parsed.delay || 1000);
    setQueue(restoredQueue);
    toast.success('Proje içe aktarıldı');
  }, [model, queue, targetModel]);

  const copyPrompt = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Kopyalandı');
  }, []);

  // ─── Regenerate single item ───
  /**
   * Regenerates one item and returns a storyboard context string for the next shot.
   */
  const regenerateItem = useCallback(async (itemId: string, previousMotionContext?: string) => {
    const item = queue.find(i => i.id === itemId);
    if (!item) return '';

    setQueue(prev => prev.map(i => i.id === itemId ? { ...i, status: 'processing', prompt: undefined, error: undefined } : i));

    let attempts = 0;
    let success = false;

    while (attempts < 3 && !success) {
      try {
        const analysis = await generateMotionPrompt(item.file, model, globalNote, item.note, previousMotionContext);
        const basePrompt = buildDefaultBasePrompt(item.note, analysis);
        const updatedItem: QueueItem = {
          ...item,
          status: 'analyzed',
          apiKeyUsed: 'auto',
          shortDescription: analysis.shortDescription,
          basePrompt,
          cameraMotion: analysis.cameraMotion,
          cinematicStyle: analysis.cinematicStyle,
          intensity: analysis.intensity,
          focalPoint: analysis.focalPoint,
          reasoning: analysis.reasoning,
          targetModel,
          prompt: undefined,
        };
        setQueue(prev => prev.map(i => i.id === itemId ? updatedItem : i));
        success = true;
        return buildMotionContext(updatedItem);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('API_429') || msg.includes('API_403')) {
          attempts++;
          await new Promise(r => setTimeout(r, 1000));
        } else {
          setQueue(prev => prev.map(i => i.id === itemId ? { ...i, status: 'error', error: msg } : i));
          success = true;
        }
      }
    }
    if (!success) {
      setQueue(prev => prev.map(i => i.id === itemId ? { ...i, status: 'error', error: 'API hatası veya Rate Limit aşıldı' } : i));
    }
    return '';
  }, [model, globalNote, queue, targetModel]);

  // ─── Regenerate all done items ───
  const regenerateAll = useCallback(async () => {
    const doneItems = queue.filter(i => i.status === 'done' || i.status === 'analyzed');
    if (doneItems.length === 0) return;

    setIsProcessing(true);
    abortRef.current = false;
    let lastMotionContext = '';

    for (const item of doneItems) {
      if (abortRef.current) break;
      lastMotionContext = await regenerateItem(item.id, lastMotionContext);
      if (!abortRef.current && doneItems.indexOf(item) < doneItems.length - 1) {
        await new Promise(r => setTimeout(r, delay));
      }
    }
    setIsProcessing(false);
    toast.success('Yeniden üretim tamamlandı');
  }, [queue, regenerateItem, delay]);

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="film-grain flex items-center justify-between border-b bg-card px-5 py-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Film className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-serif text-lg font-semibold tracking-wide text-foreground">
              MotionPrompt Generator
            </h1>
            <p className="text-xs text-muted-foreground">
              Görüntü → AI Video Motion Prompt
              {hasKeys && (
                <span className="ml-2 text-primary">
                  API Aktif
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(s => !s)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Settings + Queue */}
        <div className="w-[420px] shrink-0 border-r border-border flex flex-col overflow-hidden">
          {/* Settings Panel */}
          <div className={`border-b border-border overflow-hidden transition-all ${showSettings ? 'max-h-[600px] p-4' : 'max-h-0 p-0'}`}>
            <div className="space-y-3">
              {/* Model */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Model</label>
                <Input
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  className="bg-secondary border-border text-foreground text-xs font-mono"
                  placeholder="Model adı..."
                />
                <div className="flex flex-wrap gap-1">
                  {MODEL_PRESETS.map(p => (
                    <button
                      key={p}
                      onClick={() => setModel(p)}
                      className={`rounded-full border px-2 py-0.5 text-[10px] transition-colors ${
                        model === p
                          ? 'border-primary bg-primary/15 text-primary'
                          : 'border-border bg-secondary text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Model */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Target AI Video Model</label>
                <Select value={targetModel} onValueChange={value => setTargetModel(value as TargetModel)}>
                  <SelectTrigger className="bg-secondary border-border text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_MODELS.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Delay */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">İstekler Arası Bekleme</label>
                <div className="flex gap-1.5">
                  {DELAYS.map(d => (
                    <button
                      key={d.value}
                      onClick={() => setDelay(d.value)}
                      className={`flex-1 rounded-md border py-1 text-xs font-medium transition-colors ${
                        delay === d.value
                          ? 'border-primary bg-primary/15 text-primary'
                          : 'border-border bg-secondary text-secondary-foreground hover:border-primary/50'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Global Note */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Genel Yönetmen Notu</label>
                <Textarea
                  value={globalNote}
                  onChange={e => setGlobalNote(e.target.value)}
                  className="bg-secondary border-border text-foreground text-xs min-h-[60px]"
                  placeholder="Tüm görsellere uygulanacak not..."
                />
              </div>

              {/* API Key Info */}
              {!keysLoaded ? (
                <p className="text-[10px] text-muted-foreground">API durumu kontrol ediliyor...</p>
              ) : !hasKeys ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2">
                  <p className="text-[11px] text-destructive">
                    ⚠️ API anahtarı bulunamadı. Ana sayfadaki <strong>Ayarlar</strong>'dan Gemini API anahtarı ekleyin.
                  </p>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  API bağlantısı aktif — otomatik rotasyon
                </p>
              )}
            </div>
          </div>

          {/* Toggle settings */}
          <button
            onClick={() => setShowSettings(s => !s)}
            className="flex items-center justify-center gap-1 border-b border-border py-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
            {showSettings ? 'Ayarları Gizle' : 'Ayarları Göster'}
          </button>

          {/* Progress */}
          {total > 0 && (
            <div className="border-b border-border px-4 py-2 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">
                  Toplam: <strong className="text-foreground">{total}</strong> ·
                  Analiz: <strong className="text-blue-400">{analyzed}</strong> ·
                  Tamam: <strong className="text-emerald-400">{done}</strong> ·
                  Hata: <strong className="text-destructive">{errors}</strong>
                </span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-2">
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="text-xs"
              disabled={isProcessing}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Görsel Ekle
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
            />
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async e => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                try {
                  await importProject(file);
                } catch (error) {
                  const message = error instanceof Error ? error.message : 'İçe aktarma başarısız';
                  toast.error(message);
                }
              }}
            />
            {!isProcessing ? (
              <Button
                size="sm"
                onClick={processQueue}
                disabled={queue.filter(i => i.status === 'waiting' || i.status === 'error').length === 0}
                className="bg-primary text-primary-foreground text-xs"
              >
                <Play className="mr-1 h-3.5 w-3.5" /> Analiz Et
              </Button>
            ) : (
              <Button size="sm" variant="destructive" onClick={stopProcessing} className="text-xs">
                <Square className="mr-1 h-3.5 w-3.5" /> Durdur
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => importInputRef.current?.click()}
              className="text-xs ml-auto"
              disabled={isProcessing}
            >
              <Upload className="mr-1 h-3 w-3" /> Projeyi İçe Aktar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={exportProject}
              className="text-xs"
              disabled={queue.length === 0 || isProcessing}
            >
              <Download className="mr-1 h-3 w-3" /> Projeyi Dışa Aktar
            </Button>
          </div>

          {/* Image Queue */}
          <div
            className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2"
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
          >
            {queue.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 animate-in fade-in duration-500 hover:text-foreground transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="p-4 bg-secondary/30 rounded-2xl border-2 border-dashed border-border mb-1 hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary">
                  <ImageIcon className="h-10 w-10 opacity-60" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-foreground">Görselleri sürükle bırak</p>
                  <p className="text-[10px] opacity-70 mt-1">veya yüklemek için tıkla</p>
                </div>
              </div>
            )}
            {queue.map(item => (
              <div
                key={item.id}
                className={`rounded-lg border bg-secondary/50 p-2 space-y-1.5 transition-colors ${
                  item.status === 'processing' ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border'
                }`}
              >
                <div className="flex items-start gap-2">
                  <img
                    src={item.thumbnailUrl}
                    alt={item.file.name}
                    className="h-14 w-14 rounded object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground font-medium truncate">{item.file.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {(item.file.size / 1024).toFixed(0)} KB
                    </p>
                    <StatusBadge status={item.status} />
                    {item.error && (
                      <p className="text-[10px] text-destructive mt-0.5 truncate">{item.error}</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    disabled={item.status === 'processing'}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Input
                  value={item.note}
                  onChange={e => updateNote(item.id, e.target.value)}
                  placeholder="Bu görsel için özel not..."
                  className="bg-secondary border-border text-[11px] h-7"
                  disabled={item.status === 'processing'}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Results */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Bulk regenerate header */}
          {(queue.filter(i => i.status === 'done' || i.status === 'analyzed').length > 0) && (
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">{queue.filter(i => i.status === 'analyzed').length}</strong> analiz bekliyor ·
                <strong className="ml-1 text-foreground">{queue.filter(i => i.status === 'done').length}</strong> final prompt hazır
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={approveAndGenerateFinalPrompts}
                  disabled={isProcessing || analyzed === 0}
                >
                  <Check className="mr-1 h-3 w-3" /> Onayla ve Final Promptları Üret
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={regenerateAll}
                  disabled={isProcessing}
                >
                  <RefreshCw className="mr-1 h-3 w-3" /> Tümünü Yeniden Analiz Et
                </Button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
            {queue.filter(i => i.status === 'done' || i.status === 'processing' || i.status === 'analyzed').length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 animate-in fade-in zoom-in-95 duration-500">
                <div className="relative">
                  <div className="absolute -inset-3 rounded-full bg-primary/10 blur animate-pulse duration-1000"></div>
                  <div className="relative bg-card rounded-2xl p-5 border border-border shadow-sm">
                    <Film className="h-10 w-10 text-primary" />
                  </div>
                </div>
                <div className="space-y-1.5 text-center">
                  <p className="text-sm font-medium text-foreground">Motion promptlar için hazırız</p>
                  <p className="text-xs max-w-[280px] leading-relaxed opacity-80">
                      Sol panelden görsel ekleyin ve <strong className="text-primary">Analiz Et</strong> butonuna tıklayın. Taslağı kontrol ettikten sonra final promptları üretin.
                    </p>
                  </div>
                </div>
            )}
            {queue.filter(i => i.status === 'done' || i.status === 'processing' || i.status === 'analyzed').map(item => (
              <Card
                key={item.id}
                className={`p-3 space-y-2 ${item.status === 'processing' ? 'border-primary/50 ring-1 ring-primary/20 animate-pulse' : 'border-border'}`}
              >
                <div className="flex items-start gap-3">
                  <img
                    src={item.thumbnailUrl}
                    alt={item.file.name}
                    className="h-20 w-20 rounded object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-foreground truncate">{item.file.name}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.status === 'processing' && (
                          <Badge variant="outline" className="text-[9px] text-primary animate-pulse">Üretiliyor...</Badge>
                        )}
                        {item.status === 'analyzed' && (
                          <Badge variant="outline" className="text-[9px] text-blue-400">Taslak Hazır</Badge>
                        )}
                        {item.status === 'done' && (
                          <Badge variant="outline" className="text-[9px] text-emerald-400">Final Hazır</Badge>
                        )}
                        <Badge variant="outline" className="text-[9px]">
                          {item.targetModel || targetModel}
                        </Badge>
                        {item.apiKeyUsed && (
                          <Badge variant="outline" className="text-[9px]">
                            Key: ...{item.apiKeyUsed}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {item.shortDescription && (
                      <p className="text-xs text-foreground/90 leading-relaxed mt-1 whitespace-pre-wrap">
                        <strong className="text-muted-foreground mr-1">Draft:</strong>
                        {item.shortDescription}
                      </p>
                    )}
                    {item.prompt && item.status === 'done' && (
                      <p className="text-sm text-foreground/90 leading-relaxed mt-1.5 whitespace-pre-wrap">
                        {item.prompt}
                      </p>
                    )}

                    {(item.status === 'done' || item.status === 'analyzed') && (
                      <div className="mt-2 grid grid-cols-1 gap-2 rounded-md border border-border bg-secondary/30 p-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground">Camera Motion</p>
                            <Select
                              value={item.cameraMotion || 'Static'}
                              onValueChange={value => updateDoneItemSettings(item.id, { cameraMotion: value })}
                            >
                              <SelectTrigger className="h-7 text-[11px] bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CAMERA_MOTIONS.map(motion => (
                                  <SelectItem key={motion} value={motion}>{motion}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground">Cinematic Style</p>
                            <Select
                              value={item.cinematicStyle || 'Steadycam'}
                              onValueChange={value => updateDoneItemSettings(item.id, { cinematicStyle: value })}
                            >
                              <SelectTrigger className="h-7 text-[11px] bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CINEMATIC_STYLES.map(style => (
                                  <SelectItem key={style} value={style}>{style}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground">Intensity</p>
                            <Select
                              value={item.intensity || 'Medium'}
                              onValueChange={value => updateDoneItemSettings(item.id, { intensity: value as QueueItem['intensity'] })}
                            >
                              <SelectTrigger className="h-7 text-[11px] bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {INTENSITIES.map(level => (
                                  <SelectItem key={level} value={level}>{level}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground">Focal Point</p>
                            <Input
                              value={item.focalPoint || ''}
                              onChange={e => updateDoneItemSettings(item.id, { focalPoint: e.target.value })}
                              className="h-7 text-[11px] bg-background"
                              placeholder="Main subject..."
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-1.5 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px]"
                        onClick={() => copyPrompt(item.prompt || '')}
                        disabled={!item.prompt}
                      >
                        <Copy className="mr-1 h-3 w-3" /> Kopyala
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px]"
                        onClick={() => regenerateItem(item.id)}
                        disabled={item.status === 'processing'}
                      >
                        <RefreshCw className="mr-1 h-3 w-3" /> Yeniden Analiz
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function buildMotionContext(item: QueueItem): string {
  return buildMotionContextFromFields(item);
}

function buildDefaultBasePrompt(note: string, analysis: MotionPromptAnalysis): string {
  const trimmedNote = note.trim();
  if (trimmedNote) return trimmedNote;
  return `Documentary scene focusing on ${analysis.focalPoint?.trim() || 'the scene'}.`;
}

function getLastMotionContext(queue: QueueItem[]): string {
  const doneItems = queue.filter(item => item.status === 'done' || item.status === 'analyzed');
  const lastDone = doneItems[doneItems.length - 1];
  return lastDone ? buildMotionContext(lastDone) : '';
}

function StatusBadge({ status }: { status: QueueItem['status'] }) {
  const config = {
    waiting: { label: 'Bekliyor', className: 'bg-muted text-muted-foreground' },
    processing: { label: 'İşleniyor', className: 'bg-primary/20 text-primary animate-pulse' },
    analyzed: { label: 'Taslak', className: 'bg-blue-500/20 text-blue-400' },
    done: { label: 'Tamam', className: 'bg-emerald-500/20 text-emerald-400' },
    error: { label: 'Hata', className: 'bg-destructive/20 text-destructive' },
  }[status];

  return (
    <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium mt-0.5 ${config.className}`}>
      {config.label}
    </span>
  );
}

function normalizeImportedStatus(status: string | undefined): QueueItem['status'] {
  if (status === 'processing') return 'waiting';
  if (status === 'waiting' || status === 'analyzed' || status === 'done' || status === 'error') {
    return status;
  }
  return 'waiting';
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      if (!base64) {
        reject(new Error('Unable to encode image for project export.'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function base64ToFile(base64: string, filename: string, mimeType: string): File {
  try {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    return new File([bytes], filename, { type: mimeType || 'image/jpeg' });
  } catch {
    throw new Error(`Invalid image data for "${filename}". The project file may be corrupted.`);
  }
}
