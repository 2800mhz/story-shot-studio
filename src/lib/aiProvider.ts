import { supabase } from './supabase';
import { decryptKey } from './encryption';

export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'groq' | 'deepinfra';

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
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
];

// Groq model seçenekleri — güncel 22 Nisan 2026
const GROQ_MODELS = [
  'llama-3.3-70b-versatile',   // Hızlı, güçlü, prompt generation için ideal
  'groq/compound',             // Tool-use destekli compound model
  'openai/gpt-oss-120b',      // Reasoning model (reasoning_effort: medium)
  'llama-3.1-8b-instant',      // Ultra-hızlı fallback
];

class AIProviderManager {
  private currentProvider: AIProvider = 'deepinfra';
  private currentKeyIndex = 0;
  private keys: Map<AIProvider, APIKey[]> = new Map();
  private initialized = false;
  private model = 'gemini-2.5-flash';
  private groqModel = 'llama-3.3-70b-versatile';
  private deepinfraModel = 'deepseek-ai/DeepSeek-V4-Flash'; // Default to V4-Flash for faster DeepInfra responses

  // 503 backoff + model fallback tracking
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
      this.currentProvider = 'deepinfra'; // DeepInfra öncelikli başlar
      this.currentKeyIndex = 0;
    }
    this.initialized = true;

    console.log('🔑 Loaded API keys:', {
      gemini: this.keys.get('gemini')?.length || 0,
      groq: this.keys.get('groq')?.length || 0,
      openai: this.keys.get('openai')?.length || 0,
      anthropic: this.keys.get('anthropic')?.length || 0,
      deepinfra: this.keys.get('deepinfra')?.length || 0,
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

  setGroqModel(model: string) {
    if (model && model.trim()) {
      this.groqModel = model.trim();
    }
  }

  getGroqModel(): string {
    return this.groqModel;
  }

  getGroqModelOptions(): string[] {
    return [...GROQ_MODELS];
  }

  setDeepinfraModel(model: string) {
    if (model && model.trim()) this.deepinfraModel = model.trim();
  }

  getDeepinfraModel(): string {
    return this.deepinfraModel;
  }

  async generateContent(
    prompt: string,
    systemInstruction?: string,
    options?: {
      operationType?: string;
      images?: Array<{ inlineData: { data: string, mimeType: string } }>;
      responseMimeType?: 'application/json';
      responseSchema?: Record<string, unknown>;
    }
  ): Promise<string> {
    return this._generateWithRetry(
      prompt,
      systemInstruction,
      0,
      options?.operationType,
      options?.images,
      options?.responseMimeType,
      options?.responseSchema,
      { consecutiveServerErrors: 0 }
    );
  }

  async generateContentStream(
    prompt: string,
    systemInstruction?: string,
    options?: {
      operationType?: string;
      onChunk?: (text: string) => void;
    }
  ): Promise<string> {
    return this._generateWithRetryStream(prompt, systemInstruction, 0, options?.operationType, options?.onChunk, { consecutiveServerErrors: 0 });
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
    images?: Array<{ inlineData: { data: string, mimeType: string } }>,
    responseMimeType?: 'application/json',
    responseSchema?: Record<string, unknown>,
    context: { consecutiveServerErrors: number } = { consecutiveServerErrors: 0 }
  ): Promise<string> {
    // maxRetries: tüm key sayısı * birkaç bulk-wait turu
    const maxRetries = 60;

    if (retryCount >= maxRetries) {
      throw new Error('All AI providers exhausted after many retries. Please try again later.');
    }

    let currentKey = this.getCurrentKey();

    // Eğer şu anki provider'da key yoksa, diğer provider'ları kontrol et
    if (!currentKey) {
      let found = false;
      for (let i = 0; i < 3; i++) {
        this.forceRotateProvider();
        currentKey = this.getCurrentKey();
        if (currentKey) {
          found = true;
          break;
        }
      }

      if (!found) {
        // Tüm keyler rate-limited veya inactive — bekle
        console.warn(`⏳ All keys across all providers exhausted, waiting 15s before retry (attempt ${retryCount + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 15_000));
        return this._generateWithRetry(prompt, systemInstruction, retryCount + 1, operationType, images, responseMimeType, responseSchema);
      }
    }

    try {
      const providerKeys = this.keys.get(this.currentProvider) || [];
      console.log(` Trying ${currentKey.provider} (key ${this.currentKeyIndex + 1}/${providerKeys.length})`);
      const result = await this.callProvider(
        currentKey,
        prompt,
        systemInstruction,
        images,
        responseMimeType,
        responseSchema
      );
      // Başarılı istek — 503 sayacını ve fallback'i sıfırla
      context.consecutiveServerErrors = 0;
      this._tempModel = null;
      this.activeFallbackModelIndex = -1;
      await this.updateKeyUsage(currentKey.id, result.promptTokens, result.completionTokens, operationType, result.modelUsed);
      return result.text;
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; retryAfterMs?: number };
      console.error(`❌ Error with ${this.currentProvider}:`, error);

      if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
        console.warn(`⚠️ Rate limit hit for ${this.currentProvider}, rotating...`);
        await this.markRateLimited(currentKey);
        this.rotateKey();
        await new Promise(resolve => setTimeout(resolve, 1500));
      } else if (err.status === 403 || err.status === 400 || err.message?.includes('API key not valid')) {
        console.warn(`🚫 Invalid API key for ${this.currentProvider}, marking inactive...`);
        await this.markInvalid(currentKey, `Invalid or unauthorized API key (${err.status || 400})`);
        this.rotateKey();
        await new Promise(resolve => setTimeout(resolve, 500));
      } else if (err.status === 503 || err.status === 500) {
        context.consecutiveServerErrors++;
        this.lastServerErrorAt = Date.now();
        this.rotateKey();

        const retryAfterMs = err.retryAfterMs ?? 0;
        const providerKeys = this.keys.get(this.currentProvider) || [];
        const totalKeys = providerKeys.length;

        if (context.consecutiveServerErrors >= totalKeys) {
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
            context.consecutiveServerErrors = 0;
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
            context.consecutiveServerErrors = 0;
            const bulkWait = retryAfterMs > 0 ? retryAfterMs : 30_000;
            await new Promise(resolve => setTimeout(resolve, bulkWait));
          }
        } else {
          // Henüz tüm keyler denenmedi — kısa backoff ile sonraki key'e geç
          const backoffMs = retryAfterMs > 0
            ? retryAfterMs
            : this.getBackoffMs(Math.min(context.consecutiveServerErrors, 4));
          console.warn(
            `⚠️ Server error ${err.status} — key ${context.consecutiveServerErrors}/${totalKeys} denendi, ` +
            `${(backoffMs / 1000).toFixed(1)}s bekleniyor...`
          );
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      } else {
        // Bilinmeyen hata — kısa bekleme
        this.rotateKey();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return this._generateWithRetry(
        prompt,
        systemInstruction,
        retryCount + 1,
        operationType,
        images,
        responseMimeType,
        responseSchema,
        context
      );
    }
  }

  private getCurrentKey(): APIKey | null {
    const providerKeys = this.keys.get(this.currentProvider) || [];
    if (providerKeys.length === 0) return null;

    const initialKeyIndex = this.currentKeyIndex;
    for (let i = 0; i < providerKeys.length; i++) {
      const index = (initialKeyIndex + i) % providerKeys.length;
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
      this.forceRotateProvider();
    }
  }

  private forceRotateProvider() {
    console.log(`🔄 Switching provider from ${this.currentProvider}`);
    this.currentKeyIndex = 0;
    // DeepInfra önce — rate-limit olunca Gemini'ye, sonra Groq'a geçer
    const providers: AIProvider[] = ['deepinfra', 'gemini', 'groq', 'openai', 'anthropic'];
    const currentIndex = providers.indexOf(this.currentProvider);
    const nextIndex = (currentIndex + 1) % providers.length;
    this.currentProvider = providers[nextIndex];
  }

  private async _generateWithRetryStream(
    prompt: string,
    systemInstruction: string | undefined,
    retryCount: number,
    operationType: string = 'api_request',
    onChunk?: (text: string) => void,
    context: { consecutiveServerErrors: number } = { consecutiveServerErrors: 0 }
  ): Promise<string> {
    const maxRetries = 60;

    if (retryCount >= maxRetries) {
      throw new Error('All AI providers exhausted after many retries. Please try again later.');
    }

    let currentKey = this.getCurrentKey();

    // Eğer şu anki provider'da key yoksa, diğer provider'ları kontrol et
    if (!currentKey) {
      let found = false;
      for (let i = 0; i < 3; i++) {
        this.forceRotateProvider();
        currentKey = this.getCurrentKey();
        if (currentKey) {
          found = true;
          break;
        }
      }

      if (!found) {
        console.warn(`⏳ All keys across all providers exhausted [STREAM], waiting 15s before retry (attempt ${retryCount + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 15_000));
        return this._generateWithRetryStream(prompt, systemInstruction, retryCount + 1, operationType, onChunk);
      }
    }

    try {
      const providerKeys = this.keys.get(this.currentProvider) || [];
      console.log(` Trying ${currentKey.provider} (key ${this.currentKeyIndex + 1}/${providerKeys.length}) [STREAMING]`);
      const result = await this.callProviderStream(currentKey, prompt, systemInstruction, onChunk);
      context.consecutiveServerErrors = 0;
      this._tempModel = null;
      this.activeFallbackModelIndex = -1;
      await this.updateKeyUsage(currentKey.id, result.promptTokens, result.completionTokens, operationType, result.modelUsed);
      return result.text;
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; retryAfterMs?: number };
      console.error(`❌ Error with ${this.currentProvider} [STREAMING]:`, error);

      if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
        console.warn(`⚠️ Rate limit hit for ${this.currentProvider}, rotating...`);
        await this.markRateLimited(currentKey);
        this.rotateKey();
        await new Promise(resolve => setTimeout(resolve, 1500));
      } else if (err.status === 403 || err.status === 400 || err.message?.includes('API key not valid')) {
        console.warn(`🚫 Invalid API key for ${this.currentProvider}, marking inactive...`);
        await this.markInvalid(currentKey, `Invalid or unauthorized API key (${err.status || 400})`);
        this.rotateKey();
        await new Promise(resolve => setTimeout(resolve, 500));
      } else if (err.status === 503 || err.status === 500) {
        context.consecutiveServerErrors++;
        this.lastServerErrorAt = Date.now();
        this.rotateKey();

        const retryAfterMs = err.retryAfterMs ?? 0;
        const providerKeys = this.keys.get(this.currentProvider) || [];
        const totalKeys = providerKeys.length;

        if (context.consecutiveServerErrors >= totalKeys) {
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
            context.consecutiveServerErrors = 0;
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            console.warn(
              `🌐 [STREAM] Tüm modeller ve keyler 503 verdi. 30s bekleniyor...`
            );
            this._tempModel = null;
            this.activeFallbackModelIndex = -1;
            this.currentKeyIndex = 0;
            context.consecutiveServerErrors = 0;
            const bulkWait = retryAfterMs > 0 ? retryAfterMs : 30_000;
            await new Promise(resolve => setTimeout(resolve, bulkWait));
          }
        } else {
          const backoffMs = retryAfterMs > 0
            ? retryAfterMs
            : this.getBackoffMs(Math.min(context.consecutiveServerErrors, 4));
          console.warn(
            `⚠️ [STREAM] Server error ${err.status} — key ${context.consecutiveServerErrors}/${totalKeys} denendi, ` +
            `${(backoffMs / 1000).toFixed(1)}s bekleniyor...`
          );
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      } else {
        this.rotateKey();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return this._generateWithRetryStream(prompt, systemInstruction, retryCount + 1, operationType, onChunk, context);
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

        if (!fullText) {
          // Stream tamamlandı ama içerik gelmedi — key rotate için throw et
          const emptyStreamErr = new Error('Gemini stream empty response (no content)') as Error & { status: number };
          emptyStreamErr.status = 503;
          throw emptyStreamErr;
        }
        return { text: fullText, promptTokens: inputTokens, completionTokens: outputTokens, modelUsed: this.getActiveModel() };
      }

      case 'deepinfra': {
        const body: Record<string, unknown> = {
          model: this.deepinfraModel,
          messages: [
            ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 4096,
          stream: true, // Stream'i aktif ettik
        };

        const response = await fetch('https://api.deepinfra.com/v1/openai/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${decryptedKey}`
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const err = new Error(`DeepInfra API error: ${response.status}`) as Error & { status: number; retryAfterMs?: number };
          err.status = response.status;
          throw err;
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Response body is not readable');

        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';
        let inputTokens = 0;
        let outputTokens = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n');
          buffer = parts.pop() || '';

          for (const line of parts) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;
            if (!trimmed.startsWith('data: ')) continue;

            try {
              const jsonStr = trimmed.replace('data: ', '').trim();
              if (!jsonStr) continue;

              const json = JSON.parse(jsonStr);
              const textChunk = json.choices?.[0]?.delta?.content || '';

              if (textChunk) {
                fullText += textChunk;
                onChunk?.(fullText); // Gelen parçayı UI'a gönder
              }
              
              // OpenAI tarzı stream'lerde token kullanımı bazen son chunk'ta 'usage' objesi olarak gelir
              if (json.usage) {
                inputTokens = json.usage.prompt_tokens || inputTokens;
                outputTokens = json.usage.completion_tokens || outputTokens;
              }
            } catch (e) {
              console.warn('Failed to parse SSE line (DeepInfra):', e);
            }
          }
        }

        if (!fullText) {
          const emptyStreamErr = new Error('DeepInfra stream empty response') as Error & { status: number };
          emptyStreamErr.status = 503;
          throw emptyStreamErr;
        }

        return { text: fullText, promptTokens: inputTokens, completionTokens: outputTokens, modelUsed: this.deepinfraModel };
      }

      // For Groq, OpenAI and Anthropic, fallback to non-streaming but simulate onChunk
      case 'groq':
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

  private async callProvider(
    key: APIKey,
    prompt: string,
    systemInstruction?: string,
    images?: Array<{ inlineData: { data: string, mimeType: string } }>,
    responseMimeType?: 'application/json',
    responseSchema?: Record<string, unknown>
  ): Promise<{ text: string; promptTokens: number; completionTokens: number; modelUsed: string }> {
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
            ...(responseMimeType ? { response_mime_type: responseMimeType } : {}),
            ...(responseSchema ? { response_schema: responseSchema } : {}),
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

        // HTTP 200 ama body'de hata alanı var — Gemini bazen böyle yapar
        if (data.error) {
          const apiErrMsg = data.error.message || 'Unknown Gemini API error';
          console.warn(`⚠️ Gemini API body error: ${apiErrMsg}`);
          const bodyErr = new Error(`Gemini body error: ${apiErrMsg}`) as Error & { status: number };
          // Kota / rate-limit mesajı içeriyorsa 429, diğerleri 503
          bodyErr.status = (apiErrMsg.includes('quota') || apiErrMsg.includes('429') || apiErrMsg.includes('RATE_LIMIT')) ? 429 : 503;
          throw bodyErr;
        }

        // Handle SAFETY blocks gracefully
        const candidate = data.candidates?.[0];
        if (candidate?.finishReason === 'SAFETY') {
          console.warn('⚠️ Gemini blocked response due to safety filters.');
          return { text: '[İçerik güvenlik filtresine takıldı. Lütfen sahne metnini gözden geçirin.]', promptTokens: 0, completionTokens: 0, modelUsed: this.getActiveModel() };
        }

        // finishReason OTHER / RECITATION / MAX_TOKENS ile içerik yoksa → key rotate
        const finishReason = candidate?.finishReason;
        const text = candidate?.content?.parts?.[0]?.text || '';
        if (!text) {
          console.warn(`⚠️ Gemini empty content. finishReason=${finishReason ?? 'none'}, candidate=${JSON.stringify(candidate)?.slice(0, 200)}`);
          const emptyErr = new Error(`Gemini empty response (finishReason=${finishReason ?? 'none'})`) as Error & { status: number };
          emptyErr.status = 503;
          throw emptyErr;
        }
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

        const body: Record<string, unknown> = {
          model: 'gpt-5.4',
          messages,
          // Structured outputs are more reliable with lower temperature for deterministic schema filling.
          temperature: responseSchema ? 0.2 : 0.7,
        };
        if (responseSchema) {
          body.response_format = {
            type: 'json_schema',
            json_schema: {
              name: 'structured_output',
              strict: true,
              schema: responseSchema,
            },
          };
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${decryptedKey}`
          },
          body: JSON.stringify(body)
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
        return { text, promptTokens, completionTokens, modelUsed: 'gpt-5.4' };
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

      case 'groq': {
        const messages: Array<{ role: string; content: string }> = [];
        if (systemInstruction) {
          messages.push({ role: 'system', content: systemInstruction });
        }
        messages.push({ role: 'user', content: prompt });

        const groqBody: Record<string, unknown> = {
          model: this.groqModel,
          messages,
          temperature: 0.7,
          max_completion_tokens: 4096,
        };

        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${decryptedKey}`
          },
          body: JSON.stringify(groqBody)
        });

        if (!groqResponse.ok) {
          const groqErr = new Error(`Groq API error: ${groqResponse.status}`) as Error & { status: number; retryAfterMs?: number };
          groqErr.status = groqResponse.status;
          const retryAfterSec = groqResponse.headers.get('Retry-After') || groqResponse.headers.get('X-RateLimit-Reset');
          if (retryAfterSec) {
            groqErr.retryAfterMs = parseInt(retryAfterSec, 10) * 1000;
          }
          throw groqErr;
        }

        const groqData = await groqResponse.json();
        const groqText = groqData.choices?.[0]?.message?.content || '';
        const groqPromptTokens = groqData.usage?.prompt_tokens || 0;
        const groqCompletionTokens = groqData.usage?.completion_tokens || 0;
        return { text: groqText, promptTokens: groqPromptTokens, completionTokens: groqCompletionTokens, modelUsed: this.groqModel };
      }

      case 'deepinfra': {
        type DeepInfraTextPart = { type: 'text'; text: string };
        type DeepInfraImagePart = { type: 'image_url'; image_url: { url: string } };
        type DeepInfraMessage = {
          role: 'user' | 'assistant' | 'system';
          content: string | Array<DeepInfraTextPart | DeepInfraImagePart>;
        };

        const normalizedSystemInstruction = systemInstruction?.trim();
        const systemRules = normalizedSystemInstruction
          ? `SYSTEM RULES:\n${normalizedSystemInstruction}\n\n---\n\n`
          : '';
        const userPrompt = `${systemRules}${prompt}`;

        const messages: DeepInfraMessage[] = [];
        if (images && images.length > 0) {
          const content: Array<DeepInfraTextPart | DeepInfraImagePart> = [{ type: 'text', text: userPrompt }];
          images.forEach(img => {
            content.push({
              type: 'image_url',
              image_url: {
                url: `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`
              }
            });
          });
          messages.push({ role: 'user', content });
        } else {
          messages.push({ role: 'user', content: userPrompt });
        }

        const getElapsedMarker = () => Date.now();
        const startedAt = getElapsedMarker();
        let phase: 'preparing' | 'sending' | 'received' = 'preparing';

        const DEEPINFRA_TIMEOUT_MS = 120000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), DEEPINFRA_TIMEOUT_MS); // 2 min timeout

        try {
          const body: Record<string, unknown> = {
            model: this.deepinfraModel,
            messages,
            temperature: 0.7,
            max_tokens: 4096, // Reduced from 8192 to limit long generations and improve overall response time
          };

          if (responseMimeType === 'application/json') {
            body.response_format = { type: 'json_object' };
            const lastMsg = messages[messages.length - 1];
            const jsonInstruction = "\n\nIMPORTANT: Respond ONLY with a valid JSON object.";

            if (typeof lastMsg.content === 'string') {
              if (!lastMsg.content.toLowerCase().includes('json')) {
                lastMsg.content += jsonInstruction;
              }
            } else if (Array.isArray(lastMsg.content)) {
              const hasJsonInstr = lastMsg.content.some((part) =>
                part.type === 'text' && part.text.toLowerCase().includes('json')
              );
              if (!hasJsonInstr) {
                lastMsg.content.push({ type: 'text', text: jsonInstruction });
              }
            }
          }

          const payload = JSON.stringify(body);
          const payloadBytes = typeof TextEncoder !== 'undefined'
            ? new TextEncoder().encode(payload).length
            : payload.length; // Fallback is char count and may underestimate UTF-8 byte size for non-ASCII text
          phase = 'sending';
          console.log(`📡 [DeepInfra] Sending... Model: ${this.deepinfraModel}, Vision: ${!!(images && images.length > 0)}, Size: ${payloadBytes} bytes`);

          const diResponse = await fetch('https://api.deepinfra.com/v1/openai/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${decryptedKey}`,
            },
            signal: controller.signal,
            body: payload,
          });

          clearTimeout(timeoutId);
          const elapsedMs = Math.round(getElapsedMarker() - startedAt);
          console.log(`📥 [DeepInfra] Response received - Status: ${diResponse.status}, Time: ${elapsedMs}ms`);

          if (!diResponse.ok) {
            phase = 'received';
            const errorText = await diResponse.text();
            console.error(`❌ DeepInfra Error - Phase: ${phase}, Status: ${diResponse.status}, Time: ${elapsedMs}ms, Body:`, errorText);
            const diErr = new Error(`DeepInfra API error: ${diResponse.status}`) as Error & { status: number; retryAfterMs?: number };
            diErr.status = diResponse.status;
            const retryAfter = diResponse.headers.get('Retry-After');
            if (retryAfter) diErr.retryAfterMs = parseInt(retryAfter, 10) * 1000;
            throw diErr;
          }
          phase = 'received';

          const diData = await diResponse.json();
          const diText = diData.choices?.[0]?.message?.content || '';
          const diPromptTokens = diData.usage?.prompt_tokens || 0;
          const diCompletionTokens = diData.usage?.completion_tokens || 0;
          return { text: diText, promptTokens: diPromptTokens, completionTokens: diCompletionTokens, modelUsed: this.deepinfraModel };
        } catch (error: unknown) {
          clearTimeout(timeoutId);
          const elapsedMs = Math.round(getElapsedMarker() - startedAt);
          const err = error as Error;
          if (err.name === 'AbortError') {
            console.error(`❌ DeepInfra Timed Out - Phase: ${phase}, Time: ${elapsedMs}ms`);
            throw new Error(`DeepInfra request timed out after ${DEEPINFRA_TIMEOUT_MS / 1000} seconds`);
          }
          throw error;
        }
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
