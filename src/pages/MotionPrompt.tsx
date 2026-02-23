import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Film, ArrowLeft, Plus, Trash2, Play, Square, Copy, Download, Check, Image as ImageIcon, Settings, ChevronDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { generateMotionPrompt } from '@/lib/motionPromptApi';

// ─── Types ───
interface QueueItem {
  id: string;
  file: File;
  thumbnailUrl: string;
  note: string;
  status: 'waiting' | 'processing' | 'done' | 'error';
  prompt?: string;
  error?: string;
  apiKeyUsed?: string;
}

// ─── Key helpers ───
function loadKeys(): string[] {
  try { return JSON.parse(localStorage.getItem('gemini_api_keys') || '[]'); } catch { return []; }
}

const MODEL_PRESETS = [
  'gemini-2.0-flash',
  'gemini-2.5-flash-preview-05-20',
  'gemini-1.5-pro',
  'gemini-2.5-pro-preview-05-06',
  'gemini-2.0-flash-thinking-exp',
];

const DELAYS = [
  { label: '0.5s', value: 500 },
  { label: '1s', value: 1000 },
  { label: '2s', value: 2000 },
  { label: '3s', value: 3000 },
];

export default function MotionPrompt() {
  // ─── State ───
  const [apiKeys] = useState<string[]>(loadKeys);
  const [keyIndex, setKeyIndex] = useState(0);
  const [model, setModel] = useState(localStorage.getItem('motion_model') || 'gemini-2.0-flash');
  const [projectContext, setProjectContext] = useState('general');
  const [globalNote, setGlobalNote] = useState('');
  const [delay, setDelay] = useState(1000);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const abortRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => { localStorage.setItem('motion_model', model); }, [model]);

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
      }));
    setQueue(prev => [...prev, ...items]);
  }, []);

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

  // ─── Drop handler ───
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  // ─── Processing ───
  const rotateKey = useCallback(() => {
    if (apiKeys.length === 0) return -1;
    setKeyIndex(prev => (prev + 1) % apiKeys.length);
    return (keyIndex + 1) % apiKeys.length;
  }, [apiKeys, keyIndex]);

  const processQueue = useCallback(async () => {
    if (apiKeys.length === 0) {
      toast.error('API anahtarı bulunamadı. Ana sayfadaki Ayarlar\'dan ekleyin.');
      return;
    }
    setIsProcessing(true);
    abortRef.current = false;
    let currentKeyIdx = keyIndex;

    const waiting = queue.filter(i => i.status === 'waiting' || i.status === 'error');

    for (const item of waiting) {
      if (abortRef.current) break;

      setQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'processing' } : i));

      let attempts = 0;
      let success = false;

      while (attempts < apiKeys.length && !success) {
        const key = apiKeys[currentKeyIdx];
        try {
          const prompt = await generateMotionPrompt(
            item.file, key, model, projectContext, globalNote, item.note
          );
          setQueue(prev => prev.map(i => i.id === item.id ? {
            ...i, status: 'done', prompt, apiKeyUsed: key.slice(-6),
          } : i));
          success = true;
        } catch (err: any) {
          const msg = err?.message || '';
          if (msg.includes('API_429') || msg.includes('API_403')) {
            currentKeyIdx = (currentKeyIdx + 1) % apiKeys.length;
            setKeyIndex(currentKeyIdx);
            attempts++;
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
          ...i, status: 'error', error: 'Tüm API anahtarları rate-limit\'e ulaştı',
        } : i));
      }

      if (!abortRef.current && waiting.indexOf(item) < waiting.length - 1) {
        await new Promise(r => setTimeout(r, delay));
      }
    }

    setIsProcessing(false);
    toast.success('İşlem tamamlandı');
  }, [apiKeys, keyIndex, model, projectContext, globalNote, delay, queue]);

  const stopProcessing = useCallback(() => { abortRef.current = true; }, []);

  // ─── Stats ───
  const total = queue.length;
  const done = queue.filter(i => i.status === 'done').length;
  const errors = queue.filter(i => i.status === 'error').length;
  const progress = total > 0 ? (done / total) * 100 : 0;

  // ─── Export ───
  const exportResults = useCallback(() => {
    const results = queue.filter(i => i.status === 'done').map(i => ({
      filename: i.file.name,
      prompt: i.prompt,
      apiKey: i.apiKeyUsed,
    }));
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'motion-prompts.json';
    a.click();
  }, [queue]);

  const exportTxt = useCallback(() => {
    const text = queue.filter(i => i.status === 'done')
      .map(i => `=== ${i.file.name} ===\n${i.prompt}\n`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'motion-prompts.txt';
    a.click();
  }, [queue]);

  const copyPrompt = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Kopyalandı');
  }, []);

  // ─── Regenerate single item ───
  const regenerateItem = useCallback(async (itemId: string) => {
    if (apiKeys.length === 0) {
      toast.error('API anahtarı bulunamadı.');
      return;
    }
    const item = queue.find(i => i.id === itemId);
    if (!item) return;

    setQueue(prev => prev.map(i => i.id === itemId ? { ...i, status: 'processing', prompt: undefined, error: undefined } : i));

    let currentKeyIdx = keyIndex;
    let attempts = 0;
    let success = false;

    while (attempts < apiKeys.length && !success) {
      const key = apiKeys[currentKeyIdx];
      try {
        const prompt = await generateMotionPrompt(item.file, key, model, projectContext, globalNote, item.note);
        setQueue(prev => prev.map(i => i.id === itemId ? { ...i, status: 'done', prompt, apiKeyUsed: key.slice(-6) } : i));
        success = true;
      } catch (err: any) {
        const msg = err?.message || '';
        if (msg.includes('API_429') || msg.includes('API_403')) {
          currentKeyIdx = (currentKeyIdx + 1) % apiKeys.length;
          setKeyIndex(currentKeyIdx);
          attempts++;
        } else {
          setQueue(prev => prev.map(i => i.id === itemId ? { ...i, status: 'error', error: msg } : i));
          success = true;
        }
      }
    }
    if (!success) {
      setQueue(prev => prev.map(i => i.id === itemId ? { ...i, status: 'error', error: 'Tüm anahtarlar rate-limit' } : i));
    }
  }, [apiKeys, keyIndex, model, projectContext, globalNote, queue]);

  // ─── Regenerate all done items ───
  const regenerateAll = useCallback(async () => {
    const doneItems = queue.filter(i => i.status === 'done');
    if (doneItems.length === 0) return;

    setIsProcessing(true);
    abortRef.current = false;

    for (const item of doneItems) {
      if (abortRef.current) break;
      await regenerateItem(item.id);
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
              {apiKeys.length > 0 && (
                <span className="ml-2 text-primary">
                  Key: ...{apiKeys[keyIndex]?.slice(-6)}
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

              {/* Project Context */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Proje Bağlamı</label>
                <Select value={projectContext} onValueChange={setProjectContext}>
                  <SelectTrigger className="bg-secondary border-border text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Genel</SelectItem>
                    <SelectItem value="hive">Hive / Khwarezm — İpek Yolu</SelectItem>
                    <SelectItem value="atabeyit">Ata-Beyit — Kırgızistan</SelectItem>
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
              {apiKeys.length === 0 && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2">
                  <p className="text-[11px] text-destructive">
                    ⚠️ API anahtarı bulunamadı. Ana sayfadaki <strong>Ayarlar</strong>'dan Gemini API anahtarı ekleyin.
                  </p>
                </div>
              )}
              {apiKeys.length > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  {apiKeys.length} API anahtarı aktif — otomatik rotasyon
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
            {!isProcessing ? (
              <Button
                size="sm"
                onClick={processQueue}
                disabled={queue.filter(i => i.status === 'waiting' || i.status === 'error').length === 0}
                className="bg-primary text-primary-foreground text-xs"
              >
                <Play className="mr-1 h-3.5 w-3.5" /> Başlat
              </Button>
            ) : (
              <Button size="sm" variant="destructive" onClick={stopProcessing} className="text-xs">
                <Square className="mr-1 h-3.5 w-3.5" /> Durdur
              </Button>
            )}
            {done > 0 && (
              <>
                <Button size="sm" variant="outline" onClick={exportTxt} className="text-xs ml-auto">
                  <Download className="mr-1 h-3 w-3" /> TXT
                </Button>
                <Button size="sm" variant="outline" onClick={exportResults} className="text-xs">
                  <Download className="mr-1 h-3 w-3" /> JSON
                </Button>
              </>
            )}
          </div>

          {/* Image Queue */}
          <div
            className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2"
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
          >
            {queue.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <ImageIcon className="h-10 w-10 opacity-30" />
                <p className="text-xs">Görselleri buraya sürükleyin veya "Görsel Ekle" butonuna tıklayın</p>
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
          {queue.filter(i => i.status === 'done').length > 0 && (
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">{queue.filter(i => i.status === 'done').length}</strong> prompt üretildi
              </p>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={regenerateAll}
                disabled={isProcessing}
              >
                <RefreshCw className="mr-1 h-3 w-3" /> Tümünü Yeniden Üret
              </Button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
            {queue.filter(i => i.status === 'done' || i.status === 'processing').length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <Film className="h-12 w-12 opacity-20" />
                <p className="text-sm">Motion promptlar burada görünecek</p>
                <p className="text-xs max-w-md text-center">
                  Sol panelden görsel ekleyin, ayarları yapın ve "Başlat" butonuna tıklayın.
                </p>
              </div>
            )}
            {queue.filter(i => i.status === 'done' || i.status === 'processing').map(item => (
              <div key={item.id} className={`rounded-lg border bg-card p-3 space-y-2 ${item.status === 'processing' ? 'border-primary/50 ring-1 ring-primary/20 animate-pulse' : 'border-border'}`}>
                <div className="flex items-start gap-3">
                  <img
                    src={item.thumbnailUrl}
                    alt={item.file.name}
                    className="h-20 w-20 rounded object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-foreground truncate">{item.file.name}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.status === 'processing' && (
                          <Badge variant="outline" className="text-[9px] text-primary animate-pulse">Üretiliyor...</Badge>
                        )}
                        {item.apiKeyUsed && (
                          <Badge variant="outline" className="text-[9px]">
                            Key: ...{item.apiKeyUsed}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {item.prompt && (
                      <p className="text-sm text-foreground/90 leading-relaxed mt-1.5 whitespace-pre-wrap">
                        {item.prompt}
                      </p>
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
                        <RefreshCw className="mr-1 h-3 w-3" /> Yeniden Üret
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: QueueItem['status'] }) {
  const config = {
    waiting: { label: 'Bekliyor', className: 'bg-muted text-muted-foreground' },
    processing: { label: 'İşleniyor', className: 'bg-primary/20 text-primary animate-pulse' },
    done: { label: 'Tamam', className: 'bg-emerald-500/20 text-emerald-400' },
    error: { label: 'Hata', className: 'bg-destructive/20 text-destructive' },
  }[status];

  return (
    <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium mt-0.5 ${config.className}`}>
      {config.label}
    </span>
  );
}
