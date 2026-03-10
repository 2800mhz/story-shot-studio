import type { SceneCard, Character, Location, TimeContext } from '@/types';
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
- Sahnede açıkça görünen karakterleri ve mekanları tespit et
- Metinde tarihsel dönem/çağ tespit edilirse timeContexts alanını doldur

👥 KARAKTER KURALI (KRİTİK):
- Her karakter için 80-100 kelimelik İngilizce "visualDescription" yaz
- Bu betim şunları içermeli: fiziksel görünüm, yüz özellikleri, ten rengi, kıyafet detayları, kumaş dokuları, yaş belirteçleri, kültürel ve tarihsel doğruluk
- Kalabalık gruplar için isCrowd: true döndür
- Bireysel karakterler için isCrowd: false

🏛️ MEKAN KURALI (KRİTİK):
- Her mekan için 80-100 kelimelik İngilizce "visualDescription" yaz
- Bu betim şunları içermeli: mimari stil, dönem, coğrafi konum, atmosfer, ışık, malzeme detayları
- SADECE gerçek, fiziksel, fotoğraflanabilir mekanları ekle
- YASAKLI: Soyut kavramlar, fiilimsi ekler (-ması/-mesi), süreçler

JSON ÇIKTI:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "text": "Metinden kesilen kısa metin parçası (3-15 kelime)",
      "visualNote": "Kısa Türkçe görsel açıklama (maks 10 kelime)",
      "characters": [
        {
          "name": "Sultan I. Ahmed",
          "role": "Ottoman Sultan",
          "isCrowd": false,
          "visualDescription": "A young Ottoman Sultan in his early 20s with a dark beard and regal posture. Wearing an imperial deep-crimson kaftan embroidered with gold thread patterns, a large white turban with jeweled pin. Turanid facial features, olive skin tone, piercing dark eyes, broad shoulders. Cinematic lighting, photorealistic reference."
        }
      ],
      "locations": [
        {
          "name": "Sultanahmet Camii",
          "visualDescription": "Grand 17th-century Ottoman imperial mosque in Istanbul. Six slender minarets. Massive central dome. Exterior pale limestone. Interior walls covered with blue-and-white Iznik tiles. Afternoon sunlight through stained-glass windows. Sacred monumental atmosphere. Photorealistic architectural reference."
        }
      ],
      "timeContextLabel": "17. yüzyıl Osmanlı - Gündüz"
    }
  ],
  "timeContexts": [
    {
      "label": "Dönem adı (Türkçe)",
      "era": "Tarihsel dönem",
      "season": "Mevsim (opsiyonel)",
      "timeOfDay": "gündüz/gece/sabah/akşam (opsiyonel)",
      "lighting": "Işık tanımı (opsiyonel, İngilizce)",
      "weather": "Hava durumu (opsiyonel)",
      "historicalNotes": "Tarihsel notlar (opsiyonel, İngilizce)"
    }
  ]
}

NOT: timeContexts alanı opsiyoneldir.
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
  timeContextLabel?: string;
  characters?: {
    name: string;
    role?: string;
    isCrowd?: boolean;
    visualDescription?: string;
  }[];
  locations?: {
    name: string;
    visualDescription?: string;
  }[];
};

/**
 * Normalize a Turkish location name for deduplication.
 * Lowercases using Turkish locale, removes common suffixes, and normalizes whitespace.
 */
function normalizeTurkishLocationName(name: string): string {
  let n = name.toLocaleLowerCase('tr-TR').trim();
  // Remove Turkish plural suffixes only when they follow at least 3 characters
  // (avoids stripping from short words or non-Turkish words like "solar")
  n = n.replace(/(.{3,})(lar|ler)$/, '$1');
  // Normalize cami/camii variants
  n = n.replace(/camii$/, 'cami');
  // Collapse multiple spaces
  n = n.replace(/\s+/g, ' ');
  return n;
}

function buildResultFromScenes(
  scenes: SceneRaw[],
  sceneNumberOffset: number,
  characterMap: Map<string, Character>,
  locationMap: Map<string, Location>,
  timeContextLabelMap: Map<string, string>
): SceneCard[] {
  // Build a normalized-name → existing-id lookup for locations (deduplication)
  const locationNormalizedIndex = new Map<string, string>();
  locationMap.forEach((loc, id) => {
    locationNormalizedIndex.set(normalizeTurkishLocationName(loc.name), id);
  });

  const sceneCards: SceneCard[] = [];

  scenes.forEach((scene, idx: number) => {
    const globalIdx = sceneNumberOffset + idx;
    const sceneId = `scene-${Date.now()}-${globalIdx}`;
    const characterIds: string[] = [];
    const locationIds: string[] = [];

    scene.characters?.forEach((char) => {
      const charId = `char-${char.name.replace(/\s+/g, '-').toLocaleLowerCase('tr-TR')}`;
      if (!characterMap.has(charId)) {
        characterMap.set(charId, {
          id: charId,
          name: char.name,
          role: char.role,
          isCrowd: char.isCrowd ?? false,
          visualDescription: char.visualDescription,
        });
      }
      characterIds.push(charId);
    });

    scene.locations?.forEach((loc) => {
      const normalizedName = normalizeTurkishLocationName(loc.name);
      // Check if a location with the same normalized name already exists
      const existingId = locationNormalizedIndex.get(normalizedName);
      if (existingId) {
        // Reuse the existing location id (deduplication)
        if (!locationIds.includes(existingId)) locationIds.push(existingId);
      } else {
        const locId = `loc-${loc.name.replace(/\s+/g, '-').toLocaleLowerCase('tr-TR')}`;
        if (!locationMap.has(locId)) {
          locationMap.set(locId, {
            id: locId,
            name: loc.name,
            visualDescription: loc.visualDescription,
          });
          locationNormalizedIndex.set(normalizedName, locId);
        }
        if (!locationIds.includes(locId)) locationIds.push(locId);
      }
    });

    sceneCards.push({
      id: sceneId,
      sceneNumber: globalIdx + 1,
      text: scene.text || '',
      visualNote: scene.visualNote || `Sahne ${globalIdx + 1}`,
      characterIds,
      locationIds,
      timeContextIds: [],
      prompts: [],
      status: 'analyzed',
      noteEditable: true,
    });

    if (scene.timeContextLabel) {
      timeContextLabelMap.set(sceneId, scene.timeContextLabel);
    }
  });

  return sceneCards;
}

type TimeContextRaw = Omit<TimeContext, 'id'>;

async function analyzeChunk(
  chunk: string
): Promise<{ scenes?: SceneRaw[]; timeContexts?: TimeContextRaw[]; timeContext?: TimeContextRaw }> {
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
    return JSON.parse(cleanedContent) as { scenes?: SceneRaw[]; timeContexts?: TimeContextRaw[]; timeContext?: TimeContextRaw };
  } catch (error) {
    console.error('❌ Scene analysis JSON parse error:', error);
    // Last-resort recovery attempt
    try {
      const recovered = recoverTruncatedJson(cleanedContent);
      console.warn('⚠️ Recovered truncated JSON for chunk');
      return JSON.parse(recovered) as { scenes?: SceneRaw[]; timeContexts?: TimeContextRaw[]; timeContext?: TimeContextRaw };
    } catch {
      if (error instanceof SyntaxError) {
        throw new Error(`JSON parsing failed: ${error.message}. Check Gemini API response format.`);
      }
      throw error;
    }
  }
}

/**
 * Merge two TimeContext arrays by label, preferring existing items.
 */
function mergeTimeContextsByLabel(existing: TimeContext[], incoming: TimeContext[]): TimeContext[] {
  const map = new Map(existing.map(tc => [tc.label, tc]));
  incoming.forEach(tc => { if (!map.has(tc.label)) map.set(tc.label, tc); });
  return Array.from(map.values());
}

export async function analyzeTextIntoScenes(
  text: string,
  _apiKey?: string,
  _model?: string
): Promise<{
  sceneCards: SceneCard[];
  characters: Character[];
  locations: Location[];
  suggestedTimeContexts: TimeContext[];
}> {
  const chunks = splitTextIntoChunks(text);
  console.log(`📦 Splitting text into ${chunks.length} chunk(s) for analysis`);

  const characterMap = new Map<string, Character>();
  const locationMap = new Map<string, Location>();
  const allSceneCards: SceneCard[] = [];
  const timeContextLabelMap = new Map<string, string>(); // sceneId → timeContextLabel
  let sceneNumberOffset = 0;
  let suggestedTimeContexts: TimeContext[] = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`🔍 Analyzing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);
    const parsed = await analyzeChunk(chunks[i]);
    const scenes = parsed.scenes ?? [];
    const cards = buildResultFromScenes(scenes, sceneNumberOffset, characterMap, locationMap, timeContextLabelMap);
    allSceneCards.push(...cards);
    sceneNumberOffset += scenes.length;

    // Normalize time contexts from this chunk (support both array and legacy single object)
    const rawContexts: typeof parsed.timeContexts =
      Array.isArray(parsed.timeContexts) && parsed.timeContexts.length > 0
        ? parsed.timeContexts
        : parsed.timeContext?.label
          ? [parsed.timeContext]
          : [];

    const chunkTimeContexts: TimeContext[] = (rawContexts ?? [])
      .filter(tc => tc.label)
      .map(tc => ({
        id: `tc-${crypto.randomUUID()}`,
        label: tc.label!,
        era: tc.era,
        season: tc.season,
        timeOfDay: tc.timeOfDay,
        lighting: tc.lighting,
        weather: tc.weather,
        historicalNotes: tc.historicalNotes,
      }));

    suggestedTimeContexts = mergeTimeContextsByLabel(suggestedTimeContexts, chunkTimeContexts);
  }

  // Post-process: assign timeContextIds to scene cards based on timeContextLabel
  const labelToId = new Map(suggestedTimeContexts.map(tc => [tc.label, tc.id]));
  for (const card of allSceneCards) {
    const label = timeContextLabelMap.get(card.id);
    if (label) {
      const tcId = labelToId.get(label);
      if (tcId) {
        card.timeContextIds = [tcId];
      } else {
        console.warn(`⚠️ timeContextLabel "${label}" for scene ${card.id} did not match any time context`);
      }
    }
  }

  return {
    sceneCards: allSceneCards,
    characters: Array.from(characterMap.values()),
    locations: Array.from(locationMap.values()),
    suggestedTimeContexts,
  };
}