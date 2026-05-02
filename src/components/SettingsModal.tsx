import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ExternalLink, RotateCcw, Copy, Sparkles, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DEFAULT_SYSTEM_PROMPT_DISPLAY, loadSystemPrompt, saveSystemPrompt } from '@/lib/geminiApi';
import type { AppState } from '@/types';
import { ProviderModelSettings } from '@/components/settings/ProviderModelSettings';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  apiKeys: string[];
  imageApiKeys: string[];
  settings: AppState['settings'];
  onSaveKeys: (keys: string[]) => void;
  onSaveImageKeys: (keys: string[]) => void;
  onSaveSettings: (settings: AppState['settings']) => void;
  aspectRatio: '16:9' | '4:3' | '1:1' | '9:16';
  onAspectRatioChange: (value: '16:9' | '4:3' | '1:1' | '9:16') => void;
}

const ASPECT_RATIO_OPTIONS = [
  { value: '16:9', label: '16:9', description: 'Geniş sinematik kare' },
  { value: '4:3', label: '4:3', description: 'Daha klasik çerçeve' },
  { value: '1:1', label: '1:1', description: 'Kare sosyal format' },
  { value: '9:16', label: '9:16', description: 'Dikey kısa video' },
] as const;

export function SettingsModal({
  open,
  onClose,
  apiKeys,
  imageApiKeys,
  settings,
  onSaveKeys,
  onSaveImageKeys,
  onSaveSettings,
  aspectRatio,
  onAspectRatioChange,
}: SettingsModalProps) {
  const navigate = useNavigate();
  const [localKeys, setLocalKeys] = useState<string[]>(apiKeys);
  const [localImageKeys, setLocalImageKeys] = useState<string[]>(imageApiKeys);
  const [localSettings, setLocalSettings] = useState(settings);
  const [systemPrompt, setSystemPrompt] = useState('');

  useEffect(() => {
    if (!open) return;
    setLocalKeys(apiKeys);
    setLocalImageKeys(imageApiKeys);
    setLocalSettings(settings);
    setSystemPrompt(loadSystemPrompt());
  }, [open, apiKeys, imageApiKeys, settings]);

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
    toast.info('Sistem promptu varsayılana döndü');
  };

  const goToSettings = () => {
    onClose();
    navigate('/settings');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[88vh] overflow-y-auto border-border/70 bg-card p-0 sm:max-w-4xl">
        <DialogHeader className="border-b border-border/70 px-6 py-5">
          <DialogTitle className="flex items-center gap-3 text-lg">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <div>Workspace ayarları</div>
              <p className="mt-1 text-sm font-normal text-muted-foreground">
                Model yönlendirmesini, üretim davranışını ve prompt sistemini buradan toparla.
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5">
          <Tabs defaultValue="workspace" className="space-y-5">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="workspace">Çalışma</TabsTrigger>
              <TabsTrigger value="providers">Provider modelleri</TabsTrigger>
              <TabsTrigger value="prompt">Sistem promptu</TabsTrigger>
              <TabsTrigger value="keys">API ayarları</TabsTrigger>
            </TabsList>

            <TabsContent value="workspace" className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                <Card className="border-border/70 bg-background/70 p-4">
                  <div className="mb-4 flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Prompt üretim davranışı
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Sahne başına prompt sayısı</Label>
                        <span className="text-xs font-medium text-foreground">{localSettings.variantCount}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {([1, 2, 3] as const).map((count) => (
                          <Button
                            key={count}
                            type="button"
                            variant={localSettings.variantCount === count ? 'default' : 'outline'}
                            className="h-9"
                            onClick={() => setLocalSettings((prev) => ({ ...prev, variantCount: count }))}
                          >
                            {count}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Sıcaklık</Label>
                        <span className="text-xs font-medium text-foreground">{localSettings.temperature.toFixed(1)}</span>
                      </div>
                      <Slider
                        value={[localSettings.temperature * 10]}
                        min={7}
                        max={12}
                        step={1}
                        onValueChange={([value]) =>
                          setLocalSettings((prev) => ({ ...prev, temperature: value / 10 }))
                        }
                      />
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Daha kontrollü</span>
                        <span>Daha serbest</span>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="border-border/70 bg-background/70 p-4">
                  <div className="mb-4 text-sm font-medium">Çıktı çerçevesi</div>
                  <RadioGroup
                    value={aspectRatio}
                    onValueChange={(value) => onAspectRatioChange(value as typeof aspectRatio)}
                    className="space-y-2"
                  >
                    {ASPECT_RATIO_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-card px-3 py-3 transition-colors hover:border-primary/40"
                      >
                        <RadioGroupItem value={option.value} id={`aspect-${option.value}`} className="mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-foreground">{option.label}</div>
                          <div className="text-[11px] text-muted-foreground">{option.description}</div>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="providers" className="space-y-4">
              <Card className="border-border/70 bg-background/70 p-4">
                <div className="mb-1 text-sm font-medium">Provider bazlı model yönlendirmesi</div>
                <p className="text-xs leading-5 text-muted-foreground">
                  Her sağlayıcı için ayrı model seçebilirsin. Sistem provider değiştirirse aynı yerde boşluğa düşmez.
                </p>
              </Card>

              <ProviderModelSettings
                settings={localSettings}
                onChange={(patch) => setLocalSettings((prev) => ({ ...prev, ...patch }))}
              />
            </TabsContent>

            <TabsContent value="prompt" className="space-y-4">
              <Card className="border-border/70 bg-background/70 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">Sistem promptu</div>
                    <p className="text-xs text-muted-foreground">
                      Prompt üretiminin omurgası. Buradaki değişiklik yeni üretimlere uygulanır.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={handleResetPrompt}>
                      <RotateCcw className="mr-2 h-3.5 w-3.5" />
                      Sıfırla
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(systemPrompt);
                        toast.success('Prompt kopyalandı');
                      }}
                    >
                      <Copy className="mr-2 h-3.5 w-3.5" />
                      Kopyala
                    </Button>
                  </div>
                </div>

                <Textarea
                  value={systemPrompt}
                  onChange={(event) => setSystemPrompt(event.target.value)}
                  className="min-h-[280px] bg-card font-mono text-[12px] leading-6"
                  placeholder="Sistem promptunu burada düzenle"
                />
              </Card>
            </TabsContent>

            <TabsContent value="keys" className="space-y-4">
              <Card className="border-border/70 bg-background/70 p-5">
                <div className="mb-3 text-sm font-medium">API anahtarları ve bilanço</div>
                <p className="mb-4 text-xs leading-5 text-muted-foreground">
                  Anahtar yönetimi, kullanım kayıtları ve sağlayıcı bazlı durumlar için geniş ayar sayfasını kullan.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border/70 bg-card px-4 py-3">
                    <div className="text-[11px] text-muted-foreground">Metin anahtarı</div>
                    <div className="mt-1 text-lg font-semibold">{localKeys.length}</div>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-card px-4 py-3">
                    <div className="text-[11px] text-muted-foreground">Görsel anahtarı</div>
                    <div className="mt-1 text-lg font-semibold">{localImageKeys.length}</div>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-card px-4 py-3">
                    <div className="text-[11px] text-muted-foreground">Ana Gemini modeli</div>
                    <div className="mt-1 truncate text-sm font-semibold">{localSettings.geminiModel}</div>
                  </div>
                </div>

                <Button type="button" className="mt-4 w-full sm:w-auto" onClick={goToSettings}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Geniş ayar sayfasını aç
                </Button>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border/70 px-6 py-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Vazgeç
          </Button>
          <Button type="button" onClick={handleSave}>
            Kaydet
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
