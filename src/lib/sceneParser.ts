import type { Scene } from '@/types';

const SCENE_PARSING_PROMPT = `Sen bir story-board uzmanısın. Metni ULTRA DETAYLI sahnelere böl!

🔥 KATİL KURALLAR (ÇOK ÖNEMLİ):
1. Her cümle = AYRI SAHNE! (Nokta gördün mü = yeni sahne!)
2. Uzun cümle (20+ kelime) = 2-3 sahneye böl
3. 50 kelime = EN AZ 10 sahne
4. 100 kelime = EN AZ 20 sahne
5. 200 kelime = EN AZ 40 sahne
6. Görsel değişimi = yeni sahne
7. Karakter hareketi = yeni sahne
8. Mekan değişimi = yeni sahne
9. Duygusal geçiş = yeni sahne
10. Zaman atlama = yeni sahne

✅ DOĞRU ÖRNEK (her cümle ayrı sahne):
INPUT: "1220'li yıllarda kara bulutlar ufkumda belirdi. Cengiz Han'ın Moğol orduları Türkistan'ı kasıp kavururken sıra bana, Ürgenç'e geldi."

DOĞRU OUTPUT:
{
  "scenes": [
    { "text": "1220'li yıllarda kara bulutlar ufkumda belirdi.", "reasoning": "Zaman damgası - tehdit bulutları" },
    { "text": "Cengiz Han'ın Moğol orduları Türkistan'ı kasıp kavururken", "reasoning": "Moğol ordusu yağma sahnesi" },
    { "text": "sıra bana, Ürgenç'e geldi.", "reasoning": "Ürgenç şehri görünümü" }
  ]
}

🎯 HEDEF SAHNE SAYILARI:
- 25 kelime = 5+ sahne
- 50 kelime = 10+ sahne
- 100 kelime = 20+ sahne
- 150 kelime = 30+ sahne
- 200 kelime = 40+ sahne
- 500 kelime = 100+ sahne

📐 SAHNE BOYUTU:
- İdeal: 3-8 kelime per sahne
- Maksimum: 15 kelime per sahne
- 15+ kelime varsa = MUTLAKA böl!

OUTPUT FORMAT:
{
  "scenes": [
    {
      "text": "Kısa cümle veya cümle parçası",
      "reasoning": "Hangi görseli temsil ediyor? (1 cümle Türkçe açıklama)"
    }
  ]
}

ŞİMDİ BU METNİ ULTRA DETAYLI PARÇALA (mümkün olduğunca çok sahne):
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
            temperature: 0.2,
            maxOutputTokens: 16384,
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
