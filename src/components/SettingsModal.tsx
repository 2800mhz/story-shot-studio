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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Copy, RotateCcw, ExternalLink } from 'lucide-react';
import { DEFAULT_SYSTEM_PROMPT_DISPLAY, loadSystemPrompt, saveSystemPrompt } from '@/lib/geminiApi';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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
  aspectRatio: '16:9' | '4:3' | '1:1' | '9:16';
  onAspectRatioChange: (value: '16:9' | '4:3' | '1:1' | '9:16') => void;
}

export function SettingsModal({ open, onClose, apiKeys, imageApiKeys, settings, onSaveKeys, onSaveImageKeys, onSaveSettings, aspectRatio, onAspectRatioChange }: SettingsModalProps) {
  const navigate = useNavigate();
  const [localKeys, setLocalKeys] = useState<string[]>(apiKeys);
  const [localImageKeys, setLocalImageKeys] = useState<string[]>(imageApiKeys);
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

  const goToSettings = () => {
    onClose();
    navigate('/settings');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Ayarlar</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="model" className="pt-2">
          <TabsList className="grid w-full grid-cols-3 bg-secondary">
            <TabsTrigger value="apikeys" className="text-xs">API Anahtarları</TabsTrigger>
            <TabsTrigger value="model" className="text-xs">Model</TabsTrigger>
            <TabsTrigger value="prompt" className="text-xs">Sistem Prompt</TabsTrigger>
          </TabsList>

          {/* API Keys — redirect to /settings page */}
          <TabsContent value="apikeys" className="space-y-4 pt-4">
            <div className="rounded-md border border-border bg-secondary/50 p-4 text-center space-y-3">
              <p className="text-sm font-medium">API Anahtarı Yönetimi</p>
              <p className="text-xs text-muted-foreground">
                Gemini, OpenAI ve Anthropic API anahtarlarınızı güvenli biçimde yönetmek için
                Ayarlar sayfasını kullanın.
              </p>
              <Button
                onClick={goToSettings}
                className="w-full bg-primary text-primary-foreground"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Ayarlar Sayfasına Git
              </Button>
            </div>
            <div className="rounded-md border border-border bg-secondary/50 p-3">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                💡 Ayarlar sayfasında toplu anahtar ekleme (30 anahtar bir seferde), aktif/pasif yönetimi,
                rate-limit durumu ve kullanım istatistiklerini görebilirsiniz.
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

            <div className="space-y-3">
              <Label className="text-sm font-medium">Aspect Ratio</Label>
              <RadioGroup value={aspectRatio} onValueChange={(v) => onAspectRatioChange(v as '16:9' | '4:3' | '1:1' | '9:16')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="16:9" id="ar-16-9" />
                  <Label htmlFor="ar-16-9" className="cursor-pointer text-sm font-normal">
                    16:9 - Widescreen (Sinematik, YouTube)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="4:3" id="ar-4-3" />
                  <Label htmlFor="ar-4-3" className="cursor-pointer text-sm font-normal">
                    4:3 - Klasik Film
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1:1" id="ar-1-1" />
                  <Label htmlFor="ar-1-1" className="cursor-pointer text-sm font-normal">
                    1:1 - Kare (Instagram)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="9:16" id="ar-9-16" />
                  <Label htmlFor="ar-9-16" className="cursor-pointer text-sm font-normal">
                    9:16 - Dikey (TikTok, Hikayeler)
                  </Label>
                </div>
              </RadioGroup>
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
