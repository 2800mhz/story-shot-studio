import type { SceneCard, Character, Location } from '@/types';
import { aiProvider } from './aiProvider';

const SCENE_ANALYSIS_SYSTEM_PROMPT = `Sen bir senaryo analisti ve görsel yönetmenisin. Verilen metni ULTRA DETAYLI görsel SAHNELERE böl.

🔥 KATİL KURALLAR:
1. Her cümle = AYRI SAHNE! (Nokta gördün mü = yeni sahne!)
2. Uzun cümle (20+ kelime) = 2-3 sahneye böl
3. 100 kelime = EN AZ 20 sahne
4. 200 kelime = EN AZ 40 sahne
5. Görsel değişimi = yeni sahne
6. Karakter hareketi = yeni sahne
7. Mekan değişimi = yeni sahne
8. Duygusal geçiş = yeni sahne

📐 SAHNE BOYUTU:
- İdeal: 3-8 kelime per sahne
- Maksimum: 15 kelime per sahne
- 15+ kelime varsa MUTLAKA böl!

KURALLAR:
- visualNote TÜRKÇE olmalı (örn: "Boğaz kıyısında sabah yürüyüşü")
- Character/location descriptions İNGİLİZCE olmalı (prompt'larda kullanılacak)
- Sahnede açıkça görünen karakterleri ve mekanları tespit et

JSON ÇIKTI:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "text": "Metinden kesilen kısa metin parçası (3-15 kelime)",
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

function cleanJsonResponse(text: string): string {
  // Remove markdown code blocks
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  // Remove control characters but keep valid JSON escapes
  text = text.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '');

  // Fix common issues with newlines in strings
  // Matches JSON strings and escapes any literal newlines/tabs within them
  text = text.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
    return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
  });

  return text;
}

export async function analyzeTextIntoScenes(
  text: string,
  _apiKey?: string,
  _model?: string
): Promise<{
  sceneCards: SceneCard[];
  characters: Character[];
  locations: Location[];
}> {
  const content = await aiProvider.generateContent(text, SCENE_ANALYSIS_SYSTEM_PROMPT);

  console.log('🤖 Raw Gemini response:', content.substring(0, 200));

  let cleanedContent: string;
  try {
    cleanedContent = cleanJsonResponse(content);
    console.log('🧹 Cleaned JSON:', cleanedContent.substring(0, 200));
  } catch {
    cleanedContent = content;
  }

  let parsed: { scenes?: { sceneNumber?: number; text?: string; visualNote?: string; characters?: { name: string; description: string }[]; locations?: { name: string; description: string }[] }[] };
  try {
    parsed = JSON.parse(cleanedContent);
  } catch (error) {
    console.error('❌ Scene analysis JSON parse error:', error);
    if (error instanceof SyntaxError) {
      throw new Error(`JSON parsing failed: ${error.message}. Check Gemini API response format.`);
    }
    throw error;
  }

  const characterMap = new Map<string, Character>();
  const locationMap = new Map<string, Location>();
  const sceneCards: SceneCard[] = [];

  parsed.scenes?.forEach((scene, idx: number) => {
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
