import { supabase } from './supabase';
import { decryptKey } from './encryption';

export type AIProvider = 'gemini' | 'openai' | 'anthropic';

interface APIKey {
  id: string;
  provider: AIProvider;
  api_key: string;
  is_active: boolean;
  rate_limited_until: string | null;
  usage_count: number;
}

// Gemini model fallback zinciri — stabil modeller önce
const GEMINI_FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
];

class AIProviderManager {
  private currentProvider: AIProvider = 'gemini';
  private currentKeyIndex = 0;
  private keys: Map<AIProvider, APIKey[]> = new Map();
  private initialized = false;
  private model = 'gemini-2.0-flash';

  // 503 backoff + model fallback tracking
  private consecutiveServerErrors = 0;
  private lastServerErrorAt = 0;
  private readonly MAX_BACKOFF_MS = 30_000;
  private activeFallbackModelIndex = -1; // -1 = user model, 0+ = fallback zinciri
  private _tempModel: string | null = null; // 503 sırasında geçici model

  /** Aktif olarak kullanılan modeli döndürür (temp varsa onu, yoksa user model) */
  private getActiveModel(): string {
    return this._tempModel ?? this.model;
  }

  async initialize(userId: string) {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('usage_count', { ascending: true });

    if (error) throw error;

    // Build a map of existing key states to preserve rate-limit and active status
    // across re-initializations (e.g. caused by React re-renders during a retry loop)
    const existingStates = new Map<string, { rate_limited_until: string | null; is_active: boolean }>();
    this.keys.forEach(providerKeys => {
      providerKeys.forEach(k => {
        existingStates.set(k.id, { rate_limited_until: k.rate_limited_until, is_active: k.is_active });
      });
    });

    this.keys.clear();
    data?.forEach(key => {
      if (!this.keys.has(key.provider)) {
        this.keys.set(key.provider, []);
      }
      // Restore in-memory rate limit / inactive state from previous run
      const prev = existingStates.get(key.id);
      if (prev) {
        key.rate_limited_until = prev.rate_limited_until;
        key.is_active = prev.is_active;
      }
      this.keys.get(key.provider)?.push(key);
    });

    // Only reset rotation index on first-time initialization, not on re-init
    if (!this.initialized) {
      this.currentProvider = 'gemini';
      this.currentKeyIndex = 0;
    }
    this.initialized = true;

    console.log('🔑 Loaded API keys:', {
      gemini: this.keys.get('gemini')?.length || 0,
      openai: this.keys.get('openai')?.length || 0,
      anthropic: this.keys.get('anthropic')?.length || 0
    });
  }

  setModel(model: string) {
    if (model && model.trim()) {
      this.model = model.trim();
    }
  }

  getModel(): string {
    return this.model;
  }

  async generateContent(prompt: string, systemInstruction?: string, options?: { operationType?: string, images?: Array<{ inlineData: { data: string, mimeType: string } }> }): Promise<string> {
    return this._generateWithRetry(prompt, systemInstruction, 0, options?.operationType, options?.images);
  }

  async generateContentStream(
    prompt: string,
    systemInstruction?: string,
    options?: {
      operationType?: string;
      onChunk?: (text: string) => void;
    }
  ): Promise<string> {
    return this._generateWithRetryStream(prompt, systemInstruction, 0, options?.operationType, options?.onChunk);
  }

  /**
   * Exponential backoff hesaplar (jitter ile).
   * consecutiveServerErrors sayısına göre 1s → 2s → 4s → … → 30s artar.
   */
  private getBackoffMs(errorCount: number): number {
    const base = Math.min(1000 * Math.pow(2, errorCount - 1), this.MAX_BACKOFF_MS);
    // %20 jitter — aynı anda birden fazla istek varsa çakışmayı önler
    const jitter = base * 0.2 * Math.random();
    return Math.round(base + jitter);
  }

  private async _generateWithRetry(
    prompt: string,
    systemInstruction: string | undefined,
    retryCount: number,
    operationType: string = 'api_request',
    images?: Array<{ inlineData: { data: string, mimeType: string } }>
  ): Promise<string> {
    // maxRetries: tüm key sayısı * birkaç bulk-wait turu
    const maxRetries = 60;

    if (retryCount >= maxRetries) {
      throw new Error('All AI providers exhausted after many retries. Please try again later.');
    }

    let key = this.getCurrentKey();
    if (!key) {
      // Tüm keyler rate-limited veya inactive — başa dön ve bekle
      console.warn(`⏳ All keys exhausted, waiting 15s before retry (attempt ${retryCount + 1}/${maxRetries})...`);
      this.currentKeyIndex = 0;
      await new Promise(resolve => setTimeout(resolve, 15_000));
      return this._generateWithRetry(prompt, systemInstruction, retryCount + 1, operationType, images);
    }

    try {
      const providerKeys = this.keys.get(this.currentProvider) || [];
      console.log(` Trying ${key.provider} (key ${this.currentKeyIndex + 1}/${providerKeys.length})`);
      const result = await this.callProvider(key, prompt, systemInstruction, images);
      // Başarılı istek — 503 sayacını ve fallback'i sıfırla
      this.consecutiveServerErrors = 0;
      this._tempModel = null;
      this.activeFallbackModelIndex = -1;
      await this.updateKeyUsage(key.id, result.promptTokens, result.completionTokens, operationType, result.modelUsed);
      return result.text;
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; retryAfterMs?: number };
      console.error(`❌ Error with ${this.currentProvider}:`, error);

      if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
        console.warn(`⚠️ Rate limit hit for ${this.currentProvider}, rotating...`);
        await this.markRateLimited(key);
        this.rotateKey();
        await new Promise(resolve => setTimeout(resolve, 1500));
      } else if (err.status === 403 || err.status === 400 || err.message?.includes('API key not valid')) {
        console.warn(`🚫 Invalid API key for ${this.currentProvider}, marking inactive...`);
        await this.markInvalid(key, `Invalid or unauthorized API key (${err.status || 400})`);
        this.rotateKey();
        await new Promise(resolve => setTimeout(resolve, 500));
      } else if (err.status === 503 || err.status === 500) {
        this.consecutiveServerErrors++;
        this.lastServerErrorAt = Date.now();
        this.rotateKey();

        const retryAfterMs = err.retryAfterMs ?? 0;
        const providerKeys = this.keys.get(this.currentProvider) || [];
        const totalKeys = providerKeys.length;

        if (this.consecutiveServerErrors >= totalKeys) {
          // Tüm keyler denendi, hepsi 503 — fallback modele geç
          const nextFallbackIdx = this.activeFallbackModelIndex + 1;
          const userModel = this.model;
          // Fallback zincirinde user'ın modeli hariç sıradakini bul
          const fallbackChain = GEMINI_FALLBACK_MODELS.filter(m => m !== userModel);

          if (nextFallbackIdx < fallbackChain.length) {
            this.activeFallbackModelIndex = nextFallbackIdx;
            const fallbackModel = fallbackChain[nextFallbackIdx];
            console.warn(
              `🔀 Tüm ${totalKeys} key ${userModel} için 503 verdi. ` +
              `Fallback modele geçiliyor: ${fallbackModel}`
            );
            // Geçici olarak fallback modeli kullan
            this._tempModel = fallbackModel;
            this.currentKeyIndex = 0;
            this.consecutiveServerErrors = 0;
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            // Tüm fallback modeller de denendi — uzun bekleme
            console.warn(
              `🌐 Tüm modeller ve keyler 503 verdi. ` +
              `Gemini tamamen yoğun, 30s bekleniyor...`
            );
            // Fallback'i sıfırla ve yeniden başla
            this._tempModel = null;
            this.activeFallbackModelIndex = -1;
            this.currentKeyIndex = 0;
            this.consecutiveServerErrors = 0;
            const bulkWait = retryAfterMs > 0 ? retryAfterMs : 30_000;
            await new Promise(resolve => setTimeout(resolve, bulkWait));
          }
        } else {
          // Henüz tüm keyler denenmedi — kısa backoff ile sonraki key'e geç
          const backoffMs = retryAfterMs > 0
            ? retryAfterMs
            : this.getBackoffMs(Math.min(this.consecutiveServerErrors, 4));
          console.warn(
            `⚠️ Server error ${err.status} — key ${this.consecutiveServerErrors}/${totalKeys} denendi, ` +
            `${(backoffMs / 1000).toFixed(1)}s bekleniyor...`
          );
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      } else {
        // Bilinmeyen hata — kısa bekleme
        this.rotateKey();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return this._generateWithRetry(prompt, systemInstruction, retryCount + 1, operationType, images);
    }
  }

  private getCurrentKey(): APIKey | null {
    const providerKeys = this.keys.get(this.currentProvider) || [];
    if (providerKeys.length === 0) return null;

    let startIndex = this.currentKeyIndex;
    for (let i = 0; i < providerKeys.length; i++) {
      const index = (startIndex + i) % providerKeys.length;
      const key = providerKeys[index];
      
      const isRateLimited = key.rate_limited_until ? new Date(key.rate_limited_until) > new Date() : false;
      const isActive = key.is_active !== false;
      
      if (isActive && !isRateLimited) {
        this.currentKeyIndex = index;
        return key;
      }
    }
    
    return null;
  }

  private rotateKey() {
    const providerKeys = this.keys.get(this.currentProvider) || [];
    this.currentKeyIndex++;

    if (this.currentKeyIndex >= providerKeys.length) {
      console.log(`🔄 Switching provider from ${this.currentProvider}`);
      this.currentKeyIndex = 0;

      const providers: AIProvider[] = ['gemini', 'openai', 'anthropic'];
      const currentIndex = providers.indexOf(this.currentProvider);
      const nextIndex = (currentIndex + 1) % providers.length;
      this.currentProvider = providers[nextIndex];
    }
  }

  private async _generateWithRetryStream(
    prompt: string,
    systemInstruction: string | undefined,
    retryCount: number,
    operationType: string = 'api_request',
    onChunk?: (text: string) => void
  ): Promise<string> {
    const maxRetries = 60;

    if (retryCount >= maxRetries) {
      throw new Error('All AI providers exhausted after many retries. Please try again later.');
    }

    let key = this.getCurrentKey();
    if (!key) {
      console.warn(`⏳ All keys exhausted [STREAM], waiting 15s before retry (attempt ${retryCount + 1}/${maxRetries})...`);
      this.currentKeyIndex = 0;
      await new Promise(resolve => setTimeout(resolve, 15_000));
      return this._generateWithRetryStream(prompt, systemInstruction, retryCount + 1, operationType, onChunk);
    }

    try {
      const providerKeys = this.keys.get(this.currentProvider) || [];
      console.log(` Trying ${key.provider} (key ${this.currentKeyIndex + 1}/${providerKeys.length}) [STREAMING]`);
      const result = await this.callProviderStream(key, prompt, systemInstruction, onChunk);
      this.consecutiveServerErrors = 0;
      this._tempModel = null;
      this.activeFallbackModelIndex = -1;
      await this.updateKeyUsage(key.id, result.promptTokens, result.completionTokens, operationType, result.modelUsed);
      return result.text;
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; retryAfterMs?: number };
      console.error(`❌ Error with ${this.currentProvider} [STREAMING]:`, error);

      if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
        console.warn(`⚠️ Rate limit hit for ${this.currentProvider}, rotating...`);
        await this.markRateLimited(key);
        this.rotateKey();
        await new Promise(resolve => setTimeout(resolve, 1500));
      } else if (err.status === 403 || err.status === 400 || err.message?.includes('API key not valid')) {
        console.warn(`🚫 Invalid API key for ${this.currentProvider}, marking inactive...`);
        await this.markInvalid(key, `Invalid or unauthorized API key (${err.status || 400})`);
        this.rotateKey();
        await new Promise(resolve => setTimeout(resolve, 500));
      } else if (err.status === 503 || err.status === 500) {
        this.consecutiveServerErrors++;
        this.lastServerErrorAt = Date.now();
        this.rotateKey();

        const retryAfterMs = err.retryAfterMs ?? 0;
        const providerKeys = this.keys.get(this.currentProvider) || [];
        const totalKeys = providerKeys.length;

        if (this.consecutiveServerErrors >= totalKeys) {
          // Tüm keyler denendi, hepsi 503 — fallback modele geç
          const nextFallbackIdx = this.activeFallbackModelIndex + 1;
          const userModel = this.model;
          const fallbackChain = GEMINI_FALLBACK_MODELS.filter(m => m !== userModel);

          if (nextFallbackIdx < fallbackChain.length) {
            this.activeFallbackModelIndex = nextFallbackIdx;
            const fallbackModel = fallbackChain[nextFallbackIdx];
            console.warn(
              `🔀 [STREAM] Tüm ${totalKeys} key ${userModel} için 503 verdi. ` +
              `Fallback modele geçiliyor: ${fallbackModel}`
            );
            this._tempModel = fallbackModel;
            this.currentKeyIndex = 0;
            this.consecutiveServerErrors = 0;
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            console.warn(
              `🌐 [STREAM] Tüm modeller ve keyler 503 verdi. 30s bekleniyor...`
            );
            this._tempModel = null;
            this.activeFallbackModelIndex = -1;
            this.currentKeyIndex = 0;
            this.consecutiveServerErrors = 0;
            const bulkWait = retryAfterMs > 0 ? retryAfterMs : 30_000;
            await new Promise(resolve => setTimeout(resolve, bulkWait));
          }
        } else {
          const backoffMs = retryAfterMs > 0
            ? retryAfterMs
            : this.getBackoffMs(Math.min(this.consecutiveServerErrors, 4));
          console.warn(
            `⚠️ [STREAM] Server error ${err.status} — key ${this.consecutiveServerErrors}/${totalKeys} denendi, ` +
            `${(backoffMs / 1000).toFixed(1)}s bekleniyor...`
          );
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      } else {
        this.rotateKey();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return this._generateWithRetryStream(prompt, systemInstruction, retryCount + 1, operationType, onChunk);
    }
  }

  private async callProviderStream(
    key: APIKey,
    prompt: string,
    systemInstruction?: string,
    onChunk?: (text: string) => void
  ): Promise<{ text: string; promptTokens: number; completionTokens: number; modelUsed: string }> {
    const decryptedKey = decryptKey(key.api_key);

    switch (key.provider) {
      case 'gemini': {
        const body: Record<string, unknown> = {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 65536,
          },
        };
        if (systemInstruction) {
          body.system_instruction = { parts: [{ text: systemInstruction }] };
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.getActiveModel()}:streamGenerateContent?alt=sse&key=${decryptedKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const err = new Error(`Gemini API error: ${response.status}`) as Error & { status: number; retryAfterMs?: number };
          err.status = response.status;
          const retryAfterSec = response.headers.get('Retry-After');
          if (retryAfterSec) {
            err.retryAfterMs = parseInt(retryAfterSec, 10) * 1000;
          }
          throw err;
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Response body is not readable');

        const decoder = new TextDecoder();
        let fullText = '';
        let inputTokens = 0;
        let outputTokens = 0;
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n');
          buffer = parts.pop() || ''; // keep the last incomplete line in the buffer

          for (const line of parts) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;

            try {
              const jsonStr = trimmed.replace('data: ', '').trim();
              if (!jsonStr) continue;

              const json = JSON.parse(jsonStr);

              const candidate = json.candidates?.[0];
              if (candidate?.finishReason === 'SAFETY') {
                console.warn('⚠️ Gemini blocked response due to safety filters.');
                return { text: '[İçerik güvenlik filtresine takıldı. Lütfen sahne metnini gözden geçirin.]', promptTokens: 0, completionTokens: 0, modelUsed: this.getActiveModel() };
              }

              const textChunk = candidate?.content?.parts?.[0]?.text || '';
              if (textChunk) {
                fullText += textChunk;
                onChunk?.(fullText);
              }

              if (json.usageMetadata) {
                inputTokens = json.usageMetadata.promptTokenCount || inputTokens;
                outputTokens = json.usageMetadata.candidatesTokenCount || outputTokens;
              }
            } catch (e) {
              console.warn('Failed to parse SSE line:', e);
            }
          }
        }

        return { text: fullText, promptTokens: inputTokens, completionTokens: outputTokens, modelUsed: this.getActiveModel() };
      }

      // For OpenAI and Anthropic, fallback to non-streaming for now but simulate onChunk 
      // when it completes to maintain API compatibility
      case 'openai':
      case 'anthropic': {
        const result = await this.callProvider(key, prompt, systemInstruction);
        onChunk?.(result.text);
        return result;
      }

      default:
        throw new Error(`Unknown provider: ${key.provider}`);
    }
  }

  private async callProvider(key: APIKey, prompt: string, systemInstruction?: string, images?: Array<{ inlineData: { data: string, mimeType: string } }>): Promise<{ text: string; promptTokens: number; completionTokens: number; modelUsed: string }> {
    const decryptedKey = decryptKey(key.api_key);

    switch (key.provider) {
      case 'gemini': {
        const parts: any[] = [{ text: prompt }];
        if (images && images.length > 0) {
          parts.push(...images);
        }

        const body: Record<string, unknown> = {
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 65536,
          },
        };
        if (systemInstruction) {
          body.system_instruction = { parts: [{ text: systemInstruction }] };
        }
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.getActiveModel()}:generateContent?key=${decryptedKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          const err = new Error(`Gemini API error: ${response.status}`) as Error & { status: number; retryAfterMs?: number };
          err.status = response.status;
          // Gemini bazen Retry-After header'ı gönderir (saniye cinsinden)
          const retryAfterSec = response.headers.get('Retry-After');
          if (retryAfterSec) {
            err.retryAfterMs = parseInt(retryAfterSec, 10) * 1000;
          }
          throw err;
        }
        const data = await response.json();
        // Handle SAFETY blocks gracefully
        const candidate = data.candidates?.[0];
        if (candidate?.finishReason === 'SAFETY') {
          console.warn('⚠️ Gemini blocked response due to safety filters.');
          return { text: '[İçerik güvenlik filtresine takıldı. Lütfen sahne metnini gözden geçirin.]', promptTokens: 0, completionTokens: 0, modelUsed: this.getActiveModel() };
        }

        const text = candidate?.content?.parts?.[0]?.text || '';
        const promptTokens = data.usageMetadata?.promptTokenCount || 0;
        const completionTokens = data.usageMetadata?.candidatesTokenCount || 0;

        return { text, promptTokens, completionTokens, modelUsed: this.getActiveModel() };
      }

      case 'openai': {
        const messages: Array<{ role: string; content: string }> = [];
        if (systemInstruction) {
          messages.push({ role: 'system', content: systemInstruction });
        }
        messages.push({ role: 'user', content: prompt });

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${decryptedKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages,
            temperature: 0.7
          })
        });
        if (!response.ok) {
          const err = new Error(`OpenAI API error: ${response.status}`) as Error & { status: number };
          err.status = response.status;
          throw err;
        }
        const data = await response.json();
        const text = data.choices[0].message.content;
        const promptTokens = data.usage?.prompt_tokens || 0;
        const completionTokens = data.usage?.completion_tokens || 0;
        return { text, promptTokens, completionTokens, modelUsed: 'gpt-4o' };
      }

      case 'anthropic': {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': decryptedKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 4096,
            system: systemInstruction,
            messages: [{ role: 'user', content: prompt }]
          })
        });
        if (!response.ok) {
          const err = new Error(`Anthropic API error: ${response.status}`) as Error & { status: number };
          err.status = response.status;
          throw err;
        }
        const data = await response.json();
        const text = data.content[0].text;
        const promptTokens = data.usage?.input_tokens || 0;
        const completionTokens = data.usage?.output_tokens || 0;
        return { text, promptTokens, completionTokens, modelUsed: 'claude-3-5-sonnet-20241022' };
      }

      default:
        throw new Error(`Unknown provider: ${key.provider}`);
    }
  }

  private async updateKeyUsage(keyId: string, promptTokens: number, completionTokens: number, operationType: string, modelUsed: string) {
    await supabase.rpc('increment_api_key_usage', {
      key_id: keyId,
      p_prompt_tokens: promptTokens,
      p_completion_tokens: completionTokens,
      p_operation_type: operationType,
      p_model: modelUsed
    });
  }

  private async markRateLimited(key: APIKey) {
    const rateLimitUntil = new Date();
    rateLimitUntil.setHours(rateLimitUntil.getHours() + 1);

    key.rate_limited_until = rateLimitUntil.toISOString();

    await supabase
      .from('api_keys')
      .update({
        rate_limited_until: key.rate_limited_until,
        last_error: 'Rate limit exceeded'
      })
      .eq('id', key.id);
  }

  private async markInvalid(key: APIKey, reason: string) {
    key.is_active = false;
    await supabase
      .from('api_keys')
      .update({
        is_active: false,
        last_error: reason
      })
      .eq('id', key.id);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  hasKeys(): boolean {
    for (const keys of this.keys.values()) {
      if (keys.length > 0) return true;
    }
    return false;
  }
}

// Singleton instance
export const aiProvider = new AIProviderManager();
