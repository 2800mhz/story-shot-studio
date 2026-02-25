import type { Scene } from '@/types';

const SCENE_PARSING_PROMPT = `Sen bir görsel story-board uzmanısın. Metni çok detaylı ve kısa sahnelere böl.

BU ÇOK ÖNEMLİ:
- Her sahne MUTLAKA 1-2 CÜMLE olmalı (MAX 20-30 kelime)
- 100 kelimelik metin = EN AZ 12-15 sahne
- 500 kelimelik metin = EN AZ 50-60 sahne
- Her görsel an = ayrı sahne
- Karakter giriş/çıkışları = ayrı sahne
- Mekan değişimi = ayrı sahne
- Duygusal geçişler = ayrı sahne
- Aksiyon değişimi = ayrı sahne

OUTPUT FORMAT (JSON):
{
  "scenes": [
    {
      "text": "The actual scene text from the document",
      "reasoning": "Brief explanation why this is a scene"
    }
  ]
}

KURALLAR:
- Orijinal metni AYNEN koru (parafraz yapma)
- 1 sahne = 1-2 cümle = 1 görsel an
- Uzun cümleleri bile ayır (noktalı virgül veya bağlaç varsa böl)
- Daha fazla sahne = daha iyi (50 sahne normal, 100 sahne mükemmel)
- Karakter giriş/çıkışları = ayrı sahne
- Mekan değişimi = ayrı sahne
- Diyaloglar = ayrı sahne

ŞİMDİ BU METNİ PARÇALA (mümkün olduğunca çok sahne üret):
`;

export async function parseTextIntoScenes(
  fullText: string,
  apiKey: string,
  model: string
): Promise<Scene[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const chunks = splitIntoChunks(fullText, 20000);
  const allScenes: Scene[] = [];
  let sceneCounter = 1;

  for (const chunk of chunks) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: SCENE_PARSING_PROMPT + chunk }],
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 8192,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Scene parsing failed: ${response.status}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Extract JSON from the response
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/(\{[\s\S]*\})/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      const parsed = JSON.parse(jsonStr);

      if (parsed.scenes && Array.isArray(parsed.scenes)) {
        for (const s of parsed.scenes) {
          const sceneText = s.text?.trim();
          if (!sceneText) continue;
          const startIndex = fullText.indexOf(sceneText);

          if (startIndex !== -1) {
            allScenes.push({
              id: `scene-ai-${crypto.randomUUID()}`,
              number: sceneCounter,
              title: `Sahne ${sceneCounter}`,
              text: sceneText,
              startIndex,
              endIndex: startIndex + sceneText.length,
              episodeTitle: 'AI Parse',
              prompts: [],
              segments: [],
              subjectReferences: [],
              consistencyGroupIds: [],
              status: 'pending',
              note: s.reasoning || '',
            });
            sceneCounter++;
          }
        }
      }
    } catch (e) {
      console.error('Scene parsing error:', e);
    }

    if (chunks.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return allScenes;
}

function splitIntoChunks(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxChars;
    if (end < text.length) {
      const lastBreak = text.lastIndexOf('\n\n', end);
      if (lastBreak > start) end = lastBreak;
    }
    chunks.push(text.slice(start, end));
    start = end;
  }

  return chunks;
}
