import React from 'react';
import { Cpu, Globe, Layers3, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AppState } from '@/types';
import {
  AI_PROVIDER_LABELS,
  ANTHROPIC_MODELS,
  DEEPINFRA_MODELS,
  GEMINI_MODELS,
  GROQ_MODELS,
  OPENAI_MODELS,
} from '@/lib/aiProvider';

type SettingsShape = AppState['settings'];

interface ProviderModelSettingsProps {
  settings: SettingsShape;
  onChange: (patch: Partial<SettingsShape>) => void;
  dense?: boolean;
}

const PROVIDER_CONFIG = [
  {
    key: 'geminiModel',
    provider: 'gemini',
    title: 'Gemini',
    hint: 'Sahne analizi ve prompt üretiminde ana metin modeli.',
    options: GEMINI_MODELS,
    icon: Sparkles,
  },
  {
    key: 'groqModel',
    provider: 'groq',
    title: 'Groq',
    hint: 'Hızlı fallback ve kısa üretimler için iyi seçim.',
    options: GROQ_MODELS,
    icon: Cpu,
  },
  {
    key: 'deepinfraModel',
    provider: 'deepinfra',
    title: 'DeepInfra',
    hint: 'Agent ve ağır üretimlerde kullanılan ana dış sağlayıcı.',
    options: DEEPINFRA_MODELS,
    icon: Layers3,
  },
  {
    key: 'openaiModel',
    provider: 'openai',
    title: 'OpenAI',
    hint: 'Structured output ve daha kararlı metin işleri için.',
    options: OPENAI_MODELS,
    icon: Globe,
  },
  {
    key: 'anthropicModel',
    provider: 'anthropic',
    title: 'Anthropic',
    hint: 'Uzun bağlam ve rafine metin revizyonları için.',
    options: ANTHROPIC_MODELS,
    icon: Globe,
  },
] as const;

export function ProviderModelSettings({
  settings,
  onChange,
  dense = false,
}: ProviderModelSettingsProps) {
  return (
    <div className={`grid gap-3 ${dense ? 'md:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
      {PROVIDER_CONFIG.map(({ key, provider, title, hint, options, icon: Icon }) => {
        const value = settings[key];
        const selectValue = options.includes(value) ? value : '__custom__';

        return (
          <Card key={key} className="border-border/70 bg-background/80 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{title}</div>
                    <div className="text-[11px] text-muted-foreground">{AI_PROVIDER_LABELS[provider]}</div>
                  </div>
                </div>
                <p className="max-w-sm text-[11px] leading-5 text-muted-foreground">{hint}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground">Hazır model listesi</Label>
                <Select
                  value={selectValue}
                  onValueChange={(next) => {
                    if (next !== '__custom__') {
                      onChange({
                        [key]: next,
                        ...(key === 'geminiModel' ? { model: next } : {}),
                      } as Partial<SettingsShape>);
                    }
                  }}
                >
                  <SelectTrigger className="h-9 bg-card">
                    <SelectValue placeholder="Model seç" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__">Özel model</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground">Aktif model adı</Label>
                <Input
                  value={value}
                  onChange={(event) =>
                    onChange({
                      [key]: event.target.value,
                      ...(key === 'geminiModel' ? { model: event.target.value } : {}),
                    } as Partial<SettingsShape>)
                  }
                  className="h-9 bg-card font-mono text-xs"
                  placeholder="Model adını yaz"
                />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
