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
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

// ─── Types ───
interface QueueItem {
  id: string;
  file: File;
  thumbnailUrl: string;
  note: string;
  status: 'waiting' | 'processing' | 'analyzed' | 'done' | 'error';
  prompt?: string;
  error?: string;
  apiKeyUsed?: string;
  shortDraft?: string;
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

interface MotionQueueExportItem {
  id: string;
  filename: string;
  imagePath: string;
  mimeType?: string;
  note: string;
  status: QueueItem['status'];
  prompt?: string;
  error?: string;
  apiKeyUsed?: string;
  shortDraft?: string;
  cameraMotion?: string;
  cinematicStyle?: string;
  intensity?: QueueItem['intensity'];
  focalPoint?: string;
  targetModel?: TargetModel;
  basePrompt?: string;
  reasoning?: string;
}

interface MotionQueueExportFile {
  version: 1;
  settings: {
    model: string;
    targetModel: TargetModel;
    globalNote: string;
    delay: number;
  };
  queue: MotionQueueExportItem[];
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => { localStorage.setItem('motion_model', model); }, [model]);
  useEffect(() => { localStorage.setItem('motion_target_model', targetModel); }, [targetModel]);

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
      if (item.status === 'processing') return item;
      if (item.targetModel === targetModel) return item;
      const updated = { ...item, targetModel };
      if (updated.status === 'done') {
        return { ...updated, prompt: formatFinalPrompt({
          ...updated,
          basePrompt: updated.shortDraft || updated.basePrompt,
        }, targetModel) };
      }
      return updated;
    }));
  }, [targetModel]);

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

  const updateItemSettings = useCallback((
    id: string,
    updates: Partial<Pick<QueueItem, 'cameraMotion' | 'cinematicStyle' | 'intensity' | 'focalPoint' | 'basePrompt' | 'shortDraft'>>
  ) => {
    setQueue(prev => prev.map(i => {
      if (i.id !== id) return i;
      const updated = { ...i, ...updates, targetModel };
      return {
        ...updated,
        status: updated.status === 'processing' ? 'processing' : 'analyzed',
        prompt: undefined,
      };
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
            shortDraft: analysis.shortDraft,
            basePrompt,
            cameraMotion: analysis.cameraMotion,
            cinematicStyle: analysis.cinematicStyle,
            intensity: analysis.intensity,
            focalPoint: analysis.focalPoint,
            reasoning: analysis.reasoning,
            targetModel,
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

  // ─── Stats ───
  const total = queue.length;
  const analyzed = queue.filter(i => i.status === 'analyzed').length;
  const done = queue.filter(i => i.status === 'done').length;
  const errors = queue.filter(i => i.status === 'error').length;
  const processed = analyzed + done;
  const progress = total > 0 ? (processed / total) * 100 : 0;

  const generateFinalPromptForItem = useCallback((itemId: string) => {
    setQueue(prev => prev.map(item => {
      if (item.id !== itemId || item.status === 'processing') return item;
      const finalPrompt = formatFinalPrompt({
        ...item,
        basePrompt: item.shortDraft || item.basePrompt,
      }, item.targetModel || targetModel);
      return {
        ...item,
        targetModel: item.targetModel || targetModel,
        prompt: finalPrompt,
        status: 'done',
      };
    }));
  }, [targetModel]);

  const generateFinalPrompts = useCallback(() => {
    setQueue(prev => prev.map(item => {
      if (item.status !== 'analyzed') return item;
      const itemTargetModel = item.targetModel || targetModel;
      const finalPrompt = formatFinalPrompt({
        ...item,
        basePrompt: item.shortDraft || item.basePrompt,
      }, itemTargetModel);
      return {
        ...item,
        targetModel: itemTargetModel,
        prompt: finalPrompt,
        status: 'done',
      };
    }));
    toast.success('Final promptlar üretildi');
  }, [targetModel]);

  const exportZip = useCallback(async () => {
    if (queue.length === 0) return;
    try {
      const zipData: Record<string, Uint8Array> = {};
      const metadata: MotionQueueExportFile = {
        version: 1,
        settings: { model, targetModel, globalNote, delay },
        queue: [],
      };

      for (const item of queue) {
        const safeName = item.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const imagePath = `images/${item.id}_${safeName}`;
        const bytes = new Uint8Array(await item.file.arrayBuffer());
        zipData[imagePath] = bytes;
        metadata.queue.push({
          id: item.id,
          filename: item.file.name,
          imagePath,
          mimeType: item.file.type || undefined,
          note: item.note,
          status: item.status,
          prompt: item.prompt,
          error: item.error,
          apiKeyUsed: item.apiKeyUsed,
          shortDraft: item.shortDraft,
          cameraMotion: item.cameraMotion,
          cinematicStyle: item.cinematicStyle,
          intensity: item.intensity,
          focalPoint: item.focalPoint,
          targetModel: item.targetModel,
          basePrompt: item.basePrompt,
          reasoning: item.reasoning,
        });
      }

      zipData['data.json'] = strToU8(JSON.stringify(metadata, null, 2));
      const zipped = zipSync(zipData);
      const blob = new Blob([zipped], { type: 'application/zip' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'motion-prompt-export.zip';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error('ZIP dışa aktarma başarısız oldu');
    }
  }, [queue, model, targetModel, globalNote, delay]);

  const importZip = useCallback(async (zipFile: File) => {
    try {
      const bytes = new Uint8Array(await zipFile.arrayBuffer());
      const archive = unzipSync(bytes);
      const dataBytes = archive['data.json'];
      if (!dataBytes) {
        toast.error('Geçersiz arşiv: data.json bulunamadı');
        return;
      }

      const parsed = JSON.parse(strFromU8(dataBytes)) as MotionQueueExportFile;
      if (!parsed?.queue || !Array.isArray(parsed.queue)) {
        toast.error('Geçersiz arşiv formatı');
        return;
      }

      setModel(parsed.settings?.model || model);
      setTargetModel(parsed.settings?.targetModel || targetModel);
      setGlobalNote(parsed.settings?.globalNote || '');
      setDelay(parsed.settings?.delay || 1000);

      setQueue(prev => {
        prev.forEach(item => URL.revokeObjectURL(item.thumbnailUrl));
        return parsed.queue.flatMap((entry): QueueItem[] => {
          try {
            const imageBytes = archive[entry.imagePath];
            if (!imageBytes) return [];
            const file = new File([imageBytes], entry.filename, { type: entry.mimeType || inferImageType(entry.filename) });
            return [{
              id: entry.id || crypto.randomUUID(),
              file,
              thumbnailUrl: URL.createObjectURL(file),
              note: entry.note || '',
              status: entry.status || 'waiting',
              prompt: entry.prompt,
              error: entry.error,
              apiKeyUsed: entry.apiKeyUsed,
              shortDraft: entry.shortDraft,
              cameraMotion: entry.cameraMotion || 'Static',
              cinematicStyle: entry.cinematicStyle || 'Steadycam',
              intensity: entry.intensity || 'Medium',
              focalPoint: entry.focalPoint || '',
              targetModel: entry.targetModel || parsed.settings?.targetModel || targetModel,
              basePrompt: entry.shortDraft || entry.basePrompt || '',
              reasoning: entry.reasoning,
            }];
          } catch {
            toast.error(`${entry.filename} içe aktarılamadı`);
            return [];
          }
        });
      });
      toast.success('Motion arşivi içe aktarıldı');
    } catch {
      toast.error('ZIP içe aktarma başarısız oldu');
    }
  }, [model, targetModel]);

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
          shortDraft: analysis.shortDraft,
          basePrompt,
          cameraMotion: analysis.cameraMotion,
          cinematicStyle: analysis.cinematicStyle,
          intensity: analysis.intensity,
          focalPoint: analysis.focalPoint,
          reasoning: analysis.reasoning,
          targetModel,
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
    const analyzedItems = queue.filter(i => i.status === 'analyzed' || i.status === 'done');
    if (analyzedItems.length === 0) return;

    setIsProcessing(true);
    abortRef.current = false;
    let lastMotionContext = '';

    for (const item of analyzedItems) {
      if (abortRef.current) break;
      lastMotionContext = await regenerateItem(item.id, lastMotionContext);
      if (!abortRef.current && analyzedItems.indexOf(item) < analyzedItems.length - 1) {
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
                  Analiz: <strong className="text-sky-400">{analyzed}</strong> · 
                  Final: <strong className="text-emerald-400">{done}</strong> · 
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
            <Button
              size="sm"
              onClick={() => importInputRef.current?.click()}
              variant="outline"
              className="text-xs"
              disabled={isProcessing}
            >
              <Upload className="mr-1 h-3.5 w-3.5" /> İçe Aktar
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) void importZip(file);
                e.target.value = '';
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
            {queue.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => void exportZip()} className="text-xs ml-auto">
                <Download className="mr-1 h-3 w-3" /> Dışa Aktar
              </Button>
            )}
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
          {/* Bulk actions */}
          {queue.filter(i => i.status === 'analyzed' || i.status === 'done').length > 0 && (
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <p className="text-xs text-muted-foreground">
                Analiz: <strong className="text-foreground">{analyzed}</strong> · Final: <strong className="text-foreground">{done}</strong>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={generateFinalPrompts}
                  disabled={analyzed === 0 || isProcessing}
                >
                  <Check className="mr-1 h-3 w-3" /> Final Promptları Üret
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={regenerateAll}
                  disabled={isProcessing}
                >
                  <RefreshCw className="mr-1 h-3 w-3" /> Analizleri Yenile
                </Button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
            {queue.filter(i => i.status === 'analyzed' || i.status === 'done' || i.status === 'processing').length === 0 && (
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
                    Sol panelden görsel ekleyin ve <strong className="text-primary">Analiz Et</strong> ile kısa taslakları oluşturun. Sonra ayarları düzenleyip final prompt üretin.
                  </p>
                </div>
              </div>
            )}
            {queue.filter(i => i.status === 'analyzed' || i.status === 'done' || i.status === 'processing').map(item => (
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
                    {(item.status === 'analyzed' || item.status === 'done') && (
                      <div className="mt-2 grid grid-cols-1 gap-2 rounded-md border border-border bg-secondary/30 p-2">
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground">Short Draft</p>
                          <Textarea
                            value={item.shortDraft || ''}
                            onChange={e => updateItemSettings(item.id, { shortDraft: e.target.value })}
                            className="text-[11px] bg-background min-h-[56px]"
                            placeholder="Kısa sahne taslağı..."
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground">Camera Motion</p>
                            <Select
                              value={item.cameraMotion || 'Static'}
                              onValueChange={value => updateItemSettings(item.id, { cameraMotion: value })}
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
                              onValueChange={value => updateItemSettings(item.id, { cinematicStyle: value })}
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
                              onValueChange={value => updateItemSettings(item.id, { intensity: value as QueueItem['intensity'] })}
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
                              onChange={e => updateItemSettings(item.id, { focalPoint: e.target.value })}
                              className="h-7 text-[11px] bg-background"
                              placeholder="Main subject..."
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {item.status === 'done' && item.prompt && (
                      <div className="mt-2 space-y-1">
                        <p className="text-[10px] text-muted-foreground">Final Prompt</p>
                        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                          {item.prompt}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-1.5 mt-2">
                      <Button
                        size="sm"
                        className="h-6 text-[10px]"
                        onClick={() => generateFinalPromptForItem(item.id)}
                        disabled={item.status === 'processing' || !item.shortDraft}
                      >
                        <Check className="mr-1 h-3 w-3" /> Generate Final Prompt
                      </Button>
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
                        <RefreshCw className="mr-1 h-3 w-3" /> Analizi Yenile
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
  return analysis.shortDraft?.trim() || 'Documentary scene with stable cinematic framing.';
}

function getLastMotionContext(queue: QueueItem[]): string {
  const doneItems = queue.filter(item => item.status === 'analyzed' || item.status === 'done');
  const lastDone = doneItems[doneItems.length - 1];
  return lastDone ? buildMotionContext(lastDone) : '';
}

function StatusBadge({ status }: { status: QueueItem['status'] }) {
  const config = {
    waiting: { label: 'Bekliyor', className: 'bg-muted text-muted-foreground' },
    processing: { label: 'İşleniyor', className: 'bg-primary/20 text-primary animate-pulse' },
    analyzed: { label: 'Taslak Hazır', className: 'bg-sky-500/20 text-sky-400' },
    done: { label: 'Tamam', className: 'bg-emerald-500/20 text-emerald-400' },
    error: { label: 'Hata', className: 'bg-destructive/20 text-destructive' },
  }[status];

  return (
    <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium mt-0.5 ${config.className}`}>
      {config.label}
    </span>
  );
}

function inferImageType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.bmp')) return 'image/bmp';
  return 'image/jpeg';
}
