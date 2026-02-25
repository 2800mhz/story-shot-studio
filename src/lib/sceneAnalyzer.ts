import type { SceneCard, Character, Location } from '@/types';

const SCENE_ANALYSIS_SYSTEM_PROMPT = `Sen bir senaryo analisti ve görsel yönetmenisin. Verilen metni görsel SAHNELERE böl.

KURALLAR:
1. Her sahne ayrı bir görsel/video klibi olmalı
2. Sahne değişimi kriterleri:
   - Mekan değişimi → Yeni sahne
   - Zaman atlaması → Yeni sahne
   - Yeni karakter girişi → Yeni sahne
   - Farklı aksiyon/durum → Yeni sahne
3. Her sahne için TÜRKÇE görsel açıklama yaz (1 cümle, net, kısa)
4. Sahnede görünecek karakterleri tespit et (fiziksel özellikler, yaş, kıyafet)
5. Sahnede görünecek mekanları tespit et (mimari, coğrafi, dönemsel özellikler)

ÖNEMLİ:
- visualNote TÜRKÇE olmalı (örn: "Boğaz kıyısında sabah yürüyüşü")
- Character/location descriptions İNGİLİZCE olmalı (prompt'larda kullanılacak)

JSON ÇIKTI:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "text": "Metinden kesilen tam metin parçası...",
      "visualNote": "Kısa Türkçe görsel açıklama",
      "characters": [
        {
          "name": "Karakter adı (Türkçe)",
          "description": "Detailed English visual description for AI image generation: age, clothing, physical features, distinctive characteristics"
        }
      ],
      "locations": [
        {
          "name": "Mekan adı (Türkçe)",
          "description": "Detailed English visual description: architectural style, geographic features, time period, lighting, atmosphere"
        }
      ]
    }
  ]
}

METİN:`;

export async function analyzeTextIntoScenes(
  text: string,
  apiKey: string,
  model: string
): Promise<{
  sceneCards: SceneCard[];
  characters: Character[];
  locations: Location[];
}> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SCENE_ANALYSIS_SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 8192,
        response_mime_type: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`AI analysis failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const parsed = JSON.parse(content);

  const characterMap = new Map<string, Character>();
  const locationMap = new Map<string, Location>();
  const sceneCards: SceneCard[] = [];

  parsed.scenes?.forEach((scene: { sceneNumber?: number; text?: string; visualNote?: string; characters?: { name: string; description: string }[]; locations?: { name: string; description: string }[] }, idx: number) => {
    const sceneId = `scene-${Date.now()}-${idx}`;
    const characterIds: string[] = [];
    const locationIds: string[] = [];

    scene.characters?.forEach((char) => {
      const charId = `char-${char.name.replace(/\s+/g, '-').toLocaleLowerCase('tr-TR')}`;
      if (!characterMap.has(charId)) {
        characterMap.set(charId, { id: charId, name: char.name, description: char.description });
      }
      characterIds.push(charId);
    });

    scene.locations?.forEach((loc) => {
      const locId = `loc-${loc.name.replace(/\s+/g, '-').toLocaleLowerCase('tr-TR')}`;
      if (!locationMap.has(locId)) {
        locationMap.set(locId, { id: locId, name: loc.name, description: loc.description });
      }
      locationIds.push(locId);
    });

    sceneCards.push({
      id: sceneId,
      sceneNumber: scene.sceneNumber || idx + 1,
      text: scene.text || '',
      visualNote: scene.visualNote || `Sahne ${idx + 1}`,
      characterIds,
      locationIds,
      prompts: [],
      status: 'analyzed',
      noteEditable: true,
    });
  });

  return {
    sceneCards,
    characters: Array.from(characterMap.values()),
    locations: Array.from(locationMap.values()),
  };
}
