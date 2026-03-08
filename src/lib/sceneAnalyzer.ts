import type { SceneCard, Character, Location } from '@/types';
import { aiProvider } from './aiProvider';

const SCENE_ANALYSIS_SYSTEM_PROMPT = `Sen bir senaryo analisti ve görsel yönetmenisin. Verilen metni görsel SAHNELERE böl.

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
- visualNote TÜRKÇE olmalı (örn: "Boğaz kıyısında sabah yürüyüşü") — maks 10 kelime
- Character/location descriptions İNGİLİZCE olmalı — maks 30 kelime
- Sahnede açıkça görünen karakterleri ve mekanları tespit et

JSON ÇIKTI:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "text": "Metinden kesilen kısa metin parçası (3-15 kelime)",
      "visualNote": "Kısa Türkçe görsel açıklama (maks 10 kelime)",
      "characters": [
        {
          "name": "Karakter adı (Türkçe)",
          "description": "Short English visual description: age, clothing, key features (max 30 words)"
        }
      ],
      "locations": [
        {
          "name": "Mekan adı (Türkçe)",
          "description": "Short English visual description: style, period, atmosphere (max 30 words)"
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

  // If JSON is still not parseable, attempt truncation recovery
  try {
    JSON.parse(text);
  } catch {
    text = recoverTruncatedJson(text);
  }

  return text;
}

function splitTextIntoChunks(text: string, maxChars = 6000): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let current = '';

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > maxChars && current) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? current + '\n\n' + para : para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function recoverTruncatedJson(raw: string): string {
  // Try to find the last complete scene object before truncation
  const lastCompleteScene = raw.lastIndexOf('},');
  const lastScene = raw.lastIndexOf('}');

  if (lastCompleteScene > 0) {
    // Ensure we have the opening {"scenes":[ wrapper
    const recovered = raw.substring(0, lastCompleteScene + 1) + ']}';
    return recovered;
  } else if (lastScene > 0) {
    const recovered = raw.substring(0, lastScene + 1) + ']}';
    return recovered;
  }
  throw new Error('Cannot recover truncated JSON');
}

type SceneRaw = {
  sceneNumber?: number;
  text?: string;
  visualNote?: string;
  characters?: { name: string; description: string }[];
  locations?: { name: string; description: string }[];
};

function buildResultFromScenes(
  scenes: SceneRaw[],
  sceneNumberOffset: number,
  characterMap: Map<string, Character>,
  locationMap: Map<string, Location>
): SceneCard[] {
  const sceneCards: SceneCard[] = [];

  scenes.forEach((scene, idx: number) => {
    const globalIdx = sceneNumberOffset + idx;
    const sceneId = `scene-${Date.now()}-${globalIdx}`;
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
      sceneNumber: globalIdx + 1,
      text: scene.text || '',
      visualNote: scene.visualNote || `Sahne ${globalIdx + 1}`,
      characterIds,
      locationIds,
      prompts: [],
      status: 'analyzed',
      noteEditable: true,
    });
  });

  return sceneCards;
}

async function analyzeChunk(
  chunk: string
): Promise<{ scenes?: SceneRaw[] }> {
  const content = await aiProvider.generateContent(chunk, SCENE_ANALYSIS_SYSTEM_PROMPT);

  console.log('🤖 Raw Gemini response:', content.substring(0, 200));

  let cleanedContent: string;
  try {
    cleanedContent = cleanJsonResponse(content);
    console.log('🧹 Cleaned JSON:', cleanedContent.substring(0, 200));
  } catch {
    cleanedContent = content;
  }

  try {
    return JSON.parse(cleanedContent) as { scenes?: SceneRaw[] };
  } catch (error) {
    console.error('❌ Scene analysis JSON parse error:', error);
    // Last-resort recovery attempt
    try {
      const recovered = recoverTruncatedJson(cleanedContent);
      console.warn('⚠️ Recovered truncated JSON for chunk');
      return JSON.parse(recovered) as { scenes?: SceneRaw[] };
    } catch {
      if (error instanceof SyntaxError) {
        throw new Error(`JSON parsing failed: ${error.message}. Check Gemini API response format.`);
      }
      throw error;
    }
  }
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
  const chunks = splitTextIntoChunks(text);
  console.log(`📦 Splitting text into ${chunks.length} chunk(s) for analysis`);

  const characterMap = new Map<string, Character>();
  const locationMap = new Map<string, Location>();
  const allSceneCards: SceneCard[] = [];
  let sceneNumberOffset = 0;

  for (let i = 0; i < chunks.length; i++) {
    console.log(`🔍 Analyzing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);
    const parsed = await analyzeChunk(chunks[i]);
    const scenes = parsed.scenes ?? [];
    const cards = buildResultFromScenes(scenes, sceneNumberOffset, characterMap, locationMap);
    allSceneCards.push(...cards);
    sceneNumberOffset += scenes.length;
  }

  return {
    sceneCards: allSceneCards,
    characters: Array.from(characterMap.values()),
    locations: Array.from(locationMap.values()),
  };
}
