import type { SceneCard, Character, Location, PromptCard } from '@/types';

const PROMPT_GENERATION_SYSTEM_PROMPT = `Sen sinematik görsel prompt üreticisisin. AI görsel üretim araçları için (Midjourney, DALL-E, Runway) detaylı prompt'lar yazıyorsun.

GÖREV: Verilen sahne bilgilerini kullanarak 3 FARKLI açıdan sinematik İngilizce prompt üret.

KURALLAR:
1. Her prompt FARKLI bir kamera açısı olmalı:
   - Prompt 1: Wide Shot / Establishing Shot
   - Prompt 2: Medium Shot / Action Shot
   - Prompt 3: Close-up / Detail Shot
2. Her prompt 80-120 kelime olmalı
3. Teknik detaylar ekle: kamera, lens, ışık, kompozisyon
4. Karakter/mekan açıklamalarını doğal şekilde entegre et
5. Türkçe notun ruhunu koru ama prompt İngilizce olmalı

TEKNİK ÖZELLİKLER:
- Kamera: ARRI Alexa, RED Komodo, cinema camera
- Lens: focal length (24mm, 50mm, 85mm)
- Işık: soft/hard, direction, color temperature
- Renk paleti: cinematic color grading
- Kompozisyon: rule of thirds, depth of field

JSON ÇIKTI:
{
  "prompts": [
    {
      "shotType": "Wide Shot",
      "summary": "Sahnenin Türkçe notu (aynen kopyala)",
      "prompt": "Detailed English prompt, 80-120 words, technical specifications included"
    },
    {
      "shotType": "Medium Shot",
      "summary": "Sahnenin Türkçe notu (aynen kopyala)",
      "prompt": "Different angle/composition, 80-120 words"
    },
    {
      "shotType": "Close-up",
      "summary": "Sahnenin Türkçe notu (aynen kopyala)",
      "prompt": "Intimate detail shot, 80-120 words"
    }
  ]
}`;

export async function generatePromptsForScene(
  scene: SceneCard,
  characters: Character[],
  locations: Location[],
  masterPrompt: string,
  apiKey: string,
  model: string
): Promise<PromptCard[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  let userMessage = `SAHNE METNİ:\n${scene.text}\n\n`;
  userMessage += `TÜRKÇE GÖRSEL NOT: "${scene.visualNote}"\n\n`;

  if (characters.length > 0) {
    userMessage += `KARAKTERLER:\n`;
    characters.forEach(char => {
      userMessage += `- ${char.name}: ${char.description}\n`;
    });
    userMessage += '\n';
  }

  if (locations.length > 0) {
    userMessage += `MEKANLAR:\n`;
    locations.forEach(loc => {
      userMessage += `- ${loc.name}: ${loc.description}\n`;
    });
    userMessage += '\n';
  }

  if (masterPrompt) {
    userMessage += `MASTER PROMPT (tüm prompt'larda dikkate al):\n${masterPrompt}\n\n`;
  }

  userMessage += `3 farklı açıdan sinematik prompt üret. Her prompt'ta "${scene.visualNote}" notunun ruhunu koru.`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: PROMPT_GENERATION_SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 4096,
        response_mime_type: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Prompt generation failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const parsed = JSON.parse(content);

  if (!parsed.prompts || !Array.isArray(parsed.prompts)) {
    throw new Error('Invalid prompt response format');
  }

  return parsed.prompts.map((p: { shotType?: string; summary?: string; prompt?: string }, idx: number) => {
    const labels = ['Prompt A', 'Prompt B', 'Prompt C'];
    const types: Array<'wide' | 'medium' | 'closeup'> = ['wide', 'medium', 'closeup'];
    return {
      id: `prompt-${scene.id}-${idx}`,
      type: types[idx] ?? 'wide',
      label: labels[idx] ?? `Prompt ${idx + 1}`,
      shotType: p.shotType || 'General',
      summary: p.summary || scene.visualNote,
      promptText: p.prompt || '',
      versions: [p.prompt || ''],
    };
  });
}
