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

class AIProviderManager {
  private currentProvider: AIProvider = 'gemini';
  private currentKeyIndex = 0;
  private keys: Map<AIProvider, APIKey[]> = new Map();
  private initialized = false;
  private model = 'gemini-2.0-flash';

  async initialize(userId: string) {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('usage_count', { ascending: true });

    if (error) throw error;

    this.keys.clear();
    data?.forEach(key => {
      if (!this.keys.has(key.provider)) {
        this.keys.set(key.provider, []);
      }
      this.keys.get(key.provider)?.push(key);
    });

    this.initialized = true;
    this.currentProvider = 'gemini';
    this.currentKeyIndex = 0;

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

  private async _generateWithRetry(prompt: string, systemInstruction: string | undefined, retryCount: number, operationType: string = 'api_request', images?: Array<{ inlineData: { data: string, mimeType: string } }>): Promise<string> {
    const maxRetries = 25; // Increase max retries to accommodate 19+ keys

    if (retryCount >= maxRetries) {
      throw new Error('All AI providers exhausted. Please add more API keys in Settings.');
    }

    const key = this.getCurrentKey();
    if (!key) {
      // If we ran out of keys but haven't hit max retries, we might need to wait for rate limits
      throw new Error('No active API keys available. Please add keys in Settings.');
    }

    try {
      console.log(`🤖 Trying ${key.provider} (key ${this.currentKeyIndex + 1})`);
      const result = await this.callProvider(key, prompt, systemInstruction, images);
      await this.updateKeyUsage(key.id, result.promptTokens, result.completionTokens, operationType, result.modelUsed);
      return result.text;
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      console.error(`❌ Error with ${this.currentProvider}:`, error);

      if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
        console.warn(`⚠️ Rate limit hit for ${this.currentProvider}, rotating...`);
        await this.markRateLimited(key);
      } else if (err.status === 503 || err.status === 500) {
        console.warn(`⚠️ Server error ${err.status} for ${this.currentProvider}, rotating and waiting...`);
      }

      this.rotateKey();
      
      // Add a small delay before retrying to avoid hammering a downed API or getting instantly rate-limited again
      await new Promise(resolve => setTimeout(resolve, 1000));
      return this._generateWithRetry(prompt, systemInstruction, retryCount + 1, operationType, images);
    }
  }

  private getCurrentKey(): APIKey | null {
    const providerKeys = this.keys.get(this.currentProvider) || [];

    const availableKeys = providerKeys.filter(key => {
      if (!key.rate_limited_until) return true;
      return new Date(key.rate_limited_until) < new Date();
    });

    if (availableKeys.length === 0) return null;
    if (this.currentKeyIndex >= availableKeys.length) return null;

    return availableKeys[this.currentKeyIndex];
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
    const maxRetries = 25;

    if (retryCount >= maxRetries) {
      throw new Error('All AI providers exhausted. Please add more API keys in Settings.');
    }

    const key = this.getCurrentKey();
    if (!key) {
      throw new Error('No active API keys available. Please add keys in Settings.');
    }

    try {
      console.log(`🤖 Trying ${key.provider} (key ${this.currentKeyIndex + 1}) [STREAMING]`);
      const result = await this.callProviderStream(key, prompt, systemInstruction, onChunk);
      await this.updateKeyUsage(key.id, result.promptTokens, result.completionTokens, operationType, result.modelUsed);
      return result.text;
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      console.error(`❌ Error with ${this.currentProvider} [STREAMING]:`, error);

      if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
        console.warn(`⚠️ Rate limit hit for ${this.currentProvider}, rotating...`);
        await this.markRateLimited(key);
      } else if (err.status === 503 || err.status === 500) {
        console.warn(`⚠️ Server error ${err.status} for ${this.currentProvider}, rotating and waiting...`);
      }

      this.rotateKey();
      await new Promise(resolve => setTimeout(resolve, 1000));
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
        
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?alt=sse&key=${decryptedKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        
        if (!response.ok) {
          const err = new Error(`Gemini API error: ${response.status}`) as Error & { status: number };
          err.status = response.status;
          throw err;
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Response body is not readable');
        
        const decoder = new TextDecoder();
        let fullText = '';
        let inputTokens = 0;
        let outputTokens = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\\n').filter(l => l.startsWith('data: '));

          for (const line of lines) {
            try {
              const jsonStr = line.replace('data: ', '').trim();
              if (!jsonStr) continue;
              
              const json = JSON.parse(jsonStr);
              
              const candidate = json.candidates?.[0];
              if (candidate?.finishReason === 'SAFETY') {
                console.warn('⚠️ Gemini blocked response due to safety filters.');
                return { text: '[İçerik güvenlik filtresine takıldı. Lütfen sahne metnini gözden geçirin.]', promptTokens: 0, completionTokens: 0, modelUsed: this.model };
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
        
        return { text: fullText, promptTokens: inputTokens, completionTokens: outputTokens, modelUsed: this.model };
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
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${decryptedKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          const err = new Error(`Gemini API error: ${response.status}`) as Error & { status: number };
          err.status = response.status;
          throw err;
        }
        const data = await response.json();
        // Handle SAFETY blocks gracefully
        const candidate = data.candidates?.[0];
        if (candidate?.finishReason === 'SAFETY') {
          console.warn('⚠️ Gemini blocked response due to safety filters.');
          return { text: '[İçerik güvenlik filtresine takıldı. Lütfen sahne metnini gözden geçirin.]', promptTokens: 0, completionTokens: 0, modelUsed: this.model };
        }
        
        const text = candidate?.content?.parts?.[0]?.text || '';
        const promptTokens = data.usageMetadata?.promptTokenCount || 0;
        const completionTokens = data.usageMetadata?.candidatesTokenCount || 0;
        
        return { text, promptTokens, completionTokens, modelUsed: this.model };
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
            model: 'gpt-4-turbo-preview',
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
        return { text, promptTokens, completionTokens, modelUsed: 'gpt-4-turbo-preview' };
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
            model: 'claude-3-sonnet-20240229',
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
        return { text, promptTokens, completionTokens, modelUsed: 'claude-3-sonnet-20240229' };
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

    await supabase
      .from('api_keys')
      .update({
        rate_limited_until: rateLimitUntil.toISOString(),
        last_error: 'Rate limit exceeded'
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
