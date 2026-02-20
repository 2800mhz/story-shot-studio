import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, Check, Copy, RotateCcw } from 'lucide-react';
import { DEFAULT_SYSTEM_PROMPT_DISPLAY, loadSystemPrompt, saveSystemPrompt } from '@/lib/geminiApi';
import { toast } from 'sonner';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  apiKeys: string[];
  imageApiKeys: string[];
  settings: {
    model: string;
    thinkingMode: boolean;
    variantCount: 1 | 2 | 3;
    temperature: number;
    imageModel: string;
  };
  onSaveKeys: (keys: string[]) => void;
  onSaveImageKeys: (keys: string[]) => void;
  onSaveSettings: (settings: { model: string; thinkingMode: boolean; variantCount: 1 | 2 | 3; temperature: number; imageModel: string }) => void;
}

export function SettingsModal({ open, onClose, apiKeys, imageApiKeys, settings, onSaveKeys, onSaveImageKeys, onSaveSettings }: SettingsModalProps) {
  const [localKeys, setLocalKeys] = useState<string[]>(apiKeys);
  const [localImageKeys, setLocalImageKeys] = useState<string[]>(imageApiKeys);
  const [newKey, setNewKey] = useState('');
  const [newImageKey, setNewImageKey] = useState('');
  const [localSettings, setLocalSettings] = useState(settings);
  const [systemPrompt, setSystemPrompt] = useState('');

  useEffect(() => {
    if (open) {
      setLocalKeys(apiKeys);
      setLocalImageKeys(imageApiKeys);
      setLocalSettings(settings);
      setSystemPrompt(loadSystemPrompt());
    }
  }, [open, apiKeys, imageApiKeys, settings]);

  const addKey = () => {
    if (!newKey.trim()) return;
    setLocalKeys(prev => [...prev, newKey.trim()]);
    setNewKey('');
  };

  const removeKey = (index: number) => {
    setLocalKeys(prev => prev.filter((_, i) => i !== index));
  };

  const addImageKey = () => {
    if (!newImageKey.trim()) return;
    setLocalImageKeys(prev => [...prev, newImageKey.trim()]);
    setNewImageKey('');
  };

  const removeImageKey = (index: number) => {
    setLocalImageKeys(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSaveKeys(localKeys);
    onSaveImageKeys(localImageKeys);
    onSaveSettings(localSettings);
    saveSystemPrompt(systemPrompt);
    onClose();
    toast.success('Ayarlar kaydedildi');
  };

  const handleResetPrompt = () => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT_DISPLAY);
    toast.info('Sistem prompt varsayılana sıfırlandı');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Ayarlar</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="keys" className="pt-2">
          <TabsList className="grid w-full grid-cols-4 bg-secondary">
            <TabsTrigger value="keys" className="text-xs">Prompt API</TabsTrigger>
            <TabsTrigger value="imagekeys" className="text-xs">Görüntü API</TabsTrigger>
            <TabsTrigger value="model" className="text-xs">Model</TabsTrigger>
            <TabsTrigger value="prompt" className="text-xs">Sistem Prompt</TabsTrigger>
          </TabsList>

          <TabsContent value="keys" className="space-y-3 pt-3">
            <div className="flex gap-2">
              <Input
                type="password"
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                placeholder="AIza... (Google AI Studio key)"
                className="bg-secondary border-border text-foreground text-xs"
                onKeyDown={e => e.key === 'Enter' && addKey()}
              />
              <Button size="sm" onClick={addKey} className="shrink-0 bg-primary text-primary-foreground">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            {localKeys.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">Henüz API anahtarı eklenmedi</p>
            )}

            <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
              {localKeys.map((key, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md border bg-secondary px-3 py-2">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span className="flex-1 text-xs text-foreground font-mono truncate">
                    Key {i + 1}: {key.slice(0, 8)}...{key.slice(-4)}
                  </span>
                  <button onClick={() => removeKey(i)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {localKeys.length > 1 && (
              <p className="text-[11px] text-muted-foreground">
                {localKeys.length} anahtar aktif — otomatik rotasyon ile kullanılacak
              </p>
            )}

            <div className="rounded-md border border-border bg-secondary/50 p-3 mt-2">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                💡 <strong>API Anahtarları kalıcıdır</strong> — Tarayıcıyı kapatsanız bile silinmez.
                Birden fazla anahtar eklerseniz rate-limit durumunda otomatik olarak sonrakine geçilir.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="imagekeys" className="space-y-3 pt-3">
            <div className="flex gap-2">
              <Input
                type="password"
                value={newImageKey}
                onChange={e => setNewImageKey(e.target.value)}
                placeholder="AIza... (Görüntü üretimi için API key)"
                className="bg-secondary border-border text-foreground text-xs"
                onKeyDown={e => e.key === 'Enter' && addImageKey()}
              />
              <Button size="sm" onClick={addImageKey} className="shrink-0 bg-primary text-primary-foreground">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            {localImageKeys.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">Henüz görüntü API anahtarı eklenmedi</p>
            )}

            <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
              {localImageKeys.map((key, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md border bg-secondary px-3 py-2">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span className="flex-1 text-xs text-foreground font-mono truncate">
                    Key {i + 1}: {key.slice(0, 8)}...{key.slice(-4)}
                  </span>
                  <button onClick={() => removeImageKey(i)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Görüntü Modeli</Label>
              <Input
                value={localSettings.imageModel}
                onChange={e => setLocalSettings(s => ({ ...s, imageModel: e.target.value }))}
                placeholder="Örn: gemini-2.0-flash-exp, imagen-3.0-generate-002..."
                className="bg-secondary border-border text-foreground text-sm font-mono"
              />
            </div>

            <div className="rounded-md border border-border bg-secondary/50 p-3">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                💡 <strong>Görüntü API anahtarları ayrı tutulur</strong> — Prompt üretimi ve görüntü üretimi için farklı Gemini modelleri/projeleri kullanabilirsiniz.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="model" className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Model Adı</Label>
              <Input
                value={localSettings.model}
                onChange={e => setLocalSettings(s => ({ ...s, model: e.target.value }))}
                placeholder="Örn: gemini-2.5-flash, gemini-3, gpt-4o..."
                className="bg-secondary border-border text-foreground text-sm font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Yeni model çıktığında buraya adını yazmanız yeterli. Kod değişikliği gerekmez.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Sahne Başına Prompt Sayısı</Label>
              <div className="flex gap-2">
                {([1, 2, 3] as const).map(n => (
                  <button
                    key={n}
                    onClick={() => setLocalSettings(s => ({ ...s, variantCount: n }))}
                    className={`flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors ${
                      localSettings.variantCount === n
                        ? 'border-primary bg-primary/15 text-primary'
                        : 'border-border bg-secondary text-secondary-foreground hover:border-primary/50'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Sıcaklık (Temperature): {localSettings.temperature.toFixed(1)}</Label>
              <Slider
                value={[localSettings.temperature * 10]}
                min={7}
                max={12}
                step={1}
                onValueChange={([v]) => setLocalSettings(s => ({ ...s, temperature: v / 10 }))}
                className="py-2"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0.7</span>
                <span>1.2</span>
              </div>
            </div>

            <div className="rounded-md border border-border bg-secondary/50 p-3">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                💡 <strong>Model ayarları kalıcıdır</strong> — Tarayıcıyı kapatsanız bile korunur.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="prompt" className="pt-3 space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Sistem Prompt (düzenlenebilir)</Label>
                <div className="flex gap-1.5">
                  <button
                    onClick={handleResetPrompt}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    title="Varsayılana sıfırla"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Sıfırla
                  </button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(systemPrompt); toast.success('Kopyalandı'); }}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    <Copy className="h-3 w-3" />
                    Kopyala
                  </button>
                </div>
              </div>
              <Textarea
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                className="bg-secondary border-border text-foreground text-[11px] leading-relaxed font-mono min-h-[250px] scrollbar-thin"
                placeholder="Sistem prompt'u buraya yazın..."
              />
            </div>
            <div className="rounded-md border border-border bg-secondary/50 p-3">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                💡 <strong>Sistem prompt kalıcıdır</strong> — Siz değiştirmedikçe aynı kalır. 
                "Sıfırla" butonu ile varsayılana dönebilirsiniz.
                Prompt içinde <code className="text-primary">{'{N}'}</code> yazarsanız, sahne başına prompt sayısı ile otomatik değiştirilir.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <Button onClick={handleSave} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-2">
          Kaydet
        </Button>
      </DialogContent>
    </Dialog>
  );
}
