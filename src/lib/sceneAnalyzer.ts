import type { SceneCard, Character, Location, TimeContext } from '@/types';
import { aiProvider } from './aiProvider';

const SCENE_ANALYSIS_SYSTEM_PROMPT = `Sen dünya standartlarında bir belgesel film görsel yönetmeni ve kurgu editörüsün.
Elindeki metin bir BELGESEL SESLENDIRME METNİDİR (documentary voice-over/narration).

TEMEL CERCEVE

Bu metin ekranda kısa görüntü kesimleriyle desteklenecek.
Her sahne kartı = ekranda 1.5-2 saniyelik TEK BİR GÖRÜNTÜ KESİMİDİR.
Bu görüntüler text2img ile üretilecek, sonra hareketlendirme uygulanacaktır.

SAHNE SAYISI HESABI (KRİTİK)

Metni almadan önce kelime sayısını tahmin et.
Formül: kelime_sayısı / 5 = hedef sahne sayısı

Örnekler:
- 150 kelime = kabaca 30 sahne
- 300 kelime = kabaca 60 sahne
- 450 kelime = kabaca 90 sahne
- 600 kelime = kabaca 120 sahne

Bu hedefe tam ulaş. Fazla üretme, eksik kalabilirsin ama ASLA fazla üretme.

BÖLME MANTIĞI

TEMEL KURAL: Her anlamlı kelime grubu veya görsel an = ayrı sahne.
Tam olarak 4 kelime = 1 sahne. 4 kelime de olabilir ama 5+ kelimeyi birleştirebiliyosan okey

BUNLARIN HEPSI AYRI SAHNE:
- Her özne-eylem çifti ("kervanlar yürür" / "develer ağırlaşır")
- Virgülle ayrılan her liste öğesi ("camilerde" / "evlerde" / "medreselerde")
- "kimileri...kimileri..." ifadelerinde her biri ayrı sahne
- Her duygu/tepki anı ("şüpheyle baktılar" / "hayretle bağırdılar")
- Her mekan geçişi
- Her özne geçişi (kalabalık, birey, çocuk)
- Her eylem değişimi (okuma, dinleme, dua)
- Tek bir objeye odaklanan an ("bastonunu toprağa vurdu")
- Yakın çekim gerektiren detaylar ("dudaklara değen ilk damla")

TIMELAPSE SAHNELERİ:
- "Yüzyıllar boyunca", "Zamanla", "Nesiller geçtikçe" ifadeleri
  timelapse sahnesi olarak işaretle, visualNote'a "timelapse:" öneki koy
  Örnek: "timelapse: yüzyıllar boyu cami silueti"
  Bunlar da tek sahne sayılır, birleştirme.

BIRLESTIR (istisnai durum):
- Sadece tek kelimelik bağlaç cümleleri ("Ve", "Ama", "İşte")
  önceki sahneye dahil edilebilir. Başka birleştirme yapma.

GÖRSEL NOT (visualNote) STANDARDI

- Türkçe, maksimum 10 kelime
- Kamera tam olarak NE GÖRÜR, fiziksel ve somut yaz
- Dogru: "Sabah ışığında Mushaf tutan yaşlı eller"
- Dogru: "Çöl kumlarını elleriyle kazan genç adam"
- Dogru: "timelapse: gece-gündüz değişen Osmanlı cami silueti"
- Yanlis: "Geleneğin yaşatılması" (soyut)
- Yanlis: "Manevi atmosfer" (soyut)

GÖRÜNTÜ KOMPOZİSYON KURALLARI (TEXT2IMG + ANİMASYON UYUMU)

Her sahne görüntü olarak üretilip hafif hareketlendirme alacağından:
- NET BİR ODAK NOKTASI içermeli (kamera nereye bakıyor, ne görüyor)
- DERINLIK KATMANLARI olmalı (ön plan, orta plan, arka plan)
- HAREKET POTANSİYELİ taşımalı:
  Kalabalık sahneler: hafif pan için yatay kompozisyon
  Yakın çekim: zoom-in için net bir detay odağı
  Manzara/dış mekan: parallax için katmanlı derinlik
  Portre: subtle sway için etrafında boş alan
- DONDURULMUS AN prensibi: hareketin en dramatik karesi
  ("su fışkırdığı an" değil "su fışkırmak üzere, gerilim anı")
- YASAK: Tamamen soyut, düz, derinliksiz kompozisyonlar

GÖRSEL TUTARLILIK VE KALİTE

DÖNEM TUTARLILIĞI:
- Osmanlı sahnesi: kıyafet, mimari, ışık döneme yüzde yüz uygun
- Günümüz sahnesi: modern Türkiye/dünya estetiği
- Tarihsel ve günümüz sahnelerini asla karıştırma
- Orta Asya/İpek Yolu sahnesi: step mimarisi, kervan estetiği, toprak renkler

IŞIK SÜREKLİLİĞİ:
- Çöl sahneleri: sert güneş, kızıl-sarı tonlar, toz
- Ramazan: altın saat, kandil ışığı, mavi saat
- İç mekan: yumuşak yayılmış ışık, taş/ahşap dokular
- Gece sahneleri: ateş ışığı, yıldızlı gökyüzü

ÖZNE SÜREKLİLİĞİ:
- Tanıttığın karakteri sonraki ilgili sahnede tekrar kullan
- Kalabalık, birey geçişlerini görsel olarak mantıklı kur
- Yakın çekim ve geniş plan dönüşümlerini belirt

KARAKTER STANDARDI (ANTROPOLOJİK DOĞRULUK)

- SADECE sahnede fiziksel olarak GÖRÜNEN kişileri ekle
- Her karakter için maksimum 30 kelimelik İngilizce visualDescription yaz:
  Yaş ve beden tipi, yüz özellikleri, ten rengi,
  kıyafet (kumaş, renk, desen, dönem ve kültür doğruluğu),
  kültürel kimlik belirteçleri (sarık tipi, başörtüsü stili, sakal,
  Orta Asya/Osmanlı/modern Türk farkı).
  Sonunda mutlaka: "photorealistic, cinematic lighting, documentary style"
- Kalabalık: isCrowd true, grup kompozisyonunu tanımla
- Birey: isCrowd false, tam birey detayı
- YASAK: Psikoloji, motivasyon, hikaye

MEKAN STANDARDI (MİMARİ DOĞRULUK)

- SADECE fiziksel, fotoğraflanabilir mekanlar
- Her mekan için maksimum 30 kelimelik İngilizce visualDescription yaz:
  Mimari stil ve dönem, yapı malzemeleri (kerpiç, kesme taş, ahşap, çini, mermer, halı),
  ışık kaynağı ve yönü, atmosfer ve ölçek,
  coğrafi bağlam (Orta Asya çölü, Anadolu, İstanbul vb.)
- YASAK: Soyut mekanlar, süreçler, eylemler

ZAMAN BAGLAMI KURALLARI

- Farklı dönemler kesinlikle ayrı timeContext
- lighting alanı İngilizce, görsel AI için optimize et:
  "harsh desert sunlight, golden dust haze, dry heat shimmer"
  "warm candlelight, golden hour through mosque windows, Ramadan night"
  "blue hour pre-dawn, soft ambient light, modern cityscape"
- historicalNotes: dönem kostüm ve mimari doğruluğu için kritik notlar

JSON CIKTI:
{
  "characters": [
    {
      "name": "Karakter Adı",
      "role": "Rolü/mesleği/kimliği (örn: 'Süvari', 'Padişah')",
      "isCrowd": false,
      "visualDescription": "Maksimum 30 kelimelik İngilizce görsel betimleme"
    }
  ],
  "locations": [
    {
      "name": "Mekan Adı",
      "visualDescription": "Maksimum 30 kelimelik İngilizce görsel betimleme"
    }
  ],
  "timeContexts": [
    {
      "label": "Dönem adı (Türkçe)",
      "era": "Tarihsel dönem",
      "season": "Mevsim",
      "timeOfDay": "gündüz/gece/sabah/akşam/iftar vakti",
      "lighting": "İngilizce ışık tanımı",
      "weather": "Hava (opsiyonel)",
      "historicalNotes": "Dönem doğruluğu notları (İngilizce)"
    }
  ],
  "scenes": [
    {
      "sceneNumber": 1,
      "text": "Seslendirme metninden orijinal kelime grubu, degistirme",
      "visualNote": "Kısa Türkçe görsel açıklama (maks 10 kelime)",
      "characterNames": ["Karakter Adı"],
      "locationNames": ["Mekan Adı"],
      "timeContextLabel": "Dönem - Zaman (Türkçe)"
    }
  ]
}

KRİTİK: Her sahnede timeContextLabel dolu olmalı. timeContexts en az 1 eleman içermeli.
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
  characterNames?: string[];
  locationNames?: string[];
  // Legacy support for older API drafts
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

type AnalysisPayload = {
  characters?: { name: string; role?: string; isCrowd?: boolean; visualDescription?: string; }[];
  locations?: { name: string; visualDescription?: string; }[];
  scenes?: SceneRaw[];
  timeContexts?: TimeContextRaw[];
  timeContext?: TimeContextRaw;
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

function fuzzyFindText(fullText: string, searchStr: string, startIndex: number): { start: number, end: number } | null {
  const cleanSearch = searchStr.trim();
  if (!cleanSearch) return null;

  // 1. Exact match
  let exact = fullText.indexOf(cleanSearch, startIndex);
  if (exact !== -1) return { start: exact, end: exact + cleanSearch.length };
  exact = fullText.indexOf(cleanSearch, 0);
  if (exact !== -1) return { start: exact, end: exact + cleanSearch.length };

  // 2. Case-insensitive exact match
  const lowerFull = fullText.toLocaleLowerCase('tr-TR');
  const lowerSearch = cleanSearch.toLocaleLowerCase('tr-TR');
  let ci = lowerFull.indexOf(lowerSearch, startIndex);
  if (ci === -1) ci = lowerFull.indexOf(lowerSearch, 0);
  if (ci !== -1) return { start: ci, end: ci + cleanSearch.length };

  // 3. Kelime-kelime sliding window match
  // Orijinal metni token'lara böl (kelime + pozisyon)
  const tokenRegex = /\S+/g;
  const fullTokens: { word: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = tokenRegex.exec(fullText)) !== null) {
    fullTokens.push({ word: m[0].toLocaleLowerCase('tr-TR').replace(/[^\wışğüçöıİŞĞÜÇÖ]/g, ''), index: m.index });
  }

  const searchTokens = cleanSearch
    .split(/\s+/)
    .map(w => w.toLocaleLowerCase('tr-TR').replace(/[^\wışğüçöıİŞĞÜÇÖ]/g, ''))
    .filter(w => w.length > 0);

  if (searchTokens.length === 0) return null;

  // startIndex'ten sonraki token'lardan başla
  const startTokenIdx = fullTokens.findIndex(t => t.index >= Math.max(0, startIndex - 50));
  const searchFrom = startTokenIdx >= 0 ? startTokenIdx : 0;

  for (let i = searchFrom; i <= fullTokens.length - searchTokens.length; i++) {
    let matchCount = 0;
    for (let j = 0; j < searchTokens.length; j++) {
      const ft = fullTokens[i + j]?.word || '';
      const st = searchTokens[j];
      // Tam eşleşme veya biri diğerinin prefix'i (suffix farkı toleransı)
      if (ft === st || ft.startsWith(st) || st.startsWith(ft)) {
        matchCount++;
      }
    }
    // %80 eşleşme yeterli
    if (matchCount >= Math.ceil(searchTokens.length * 0.8)) {
      const startPos = fullTokens[i].index;
      const realEnd = Math.min(startPos + cleanSearch.length + 10, fullText.length);
      return { start: startPos, end: realEnd };
    }
  }

  // 4. startIndex'ten önce de ara
  for (let i = 0; i < Math.min(searchFrom, fullTokens.length - searchTokens.length); i++) {
    let matchCount = 0;
    for (let j = 0; j < searchTokens.length; j++) {
      const ft = fullTokens[i + j]?.word || '';
      const st = searchTokens[j];
      if (ft === st || ft.startsWith(st) || st.startsWith(ft)) matchCount++;
    }
    if (matchCount >= Math.ceil(searchTokens.length * 0.8)) {
      const startPos = fullTokens[i].index;
      const realEnd = Math.min(startPos + cleanSearch.length + 10, fullText.length);
      return { start: startPos, end: realEnd };
    }
  }

  return null;
}

function buildResultFromScenes(
  scenes: SceneRaw[],
  sceneNumberOffset: number,
  characterMap: Map<string, Character>,
  locationMap: Map<string, Location>,
  timeContextLabelMap: Map<string, string>,
  fullText: string,
  searchState: { lastIndex: number }
): SceneCard[] {
  // Build a normalized-name → existing-id lookup for locations (deduplication)
  const locationNormalizedIndex = new Map<string, string>();
  locationMap.forEach((loc, id) => {
    locationNormalizedIndex.set(normalizeTurkishLocationName(loc.name), id);
  });

  const sceneCards: SceneCard[] = [];

  scenes.forEach((scene, idx: number) => {
    const globalIdx = sceneNumberOffset + idx;
    const sceneId = crypto.randomUUID();
    const characterIds: string[] = [];
    const locationIds: string[] = [];

    scene.characterNames?.forEach(name => {
      const charId = `char-${name.replace(/\s+/g, '-').toLocaleLowerCase('tr-TR')}`;
      if (characterMap.has(charId) && !characterIds.includes(charId)) characterIds.push(charId);
    });

    scene.characters?.forEach((char) => {
      if (!char.name) return;
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
      if (!characterIds.includes(charId)) characterIds.push(charId);
    });

    scene.locationNames?.forEach(name => {
      const normalizedName = normalizeTurkishLocationName(name);
      const existingId = locationNormalizedIndex.get(normalizedName);
      if (existingId && !locationIds.includes(existingId)) locationIds.push(existingId);
    });

    scene.locations?.forEach((loc) => {
      if (!loc.name) return;
      const normalizedName = normalizeTurkishLocationName(loc.name);
      const existingId = locationNormalizedIndex.get(normalizedName);
      if (existingId) {
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

    let startIndex: number | undefined;
    let endIndex: number | undefined;
    if (scene.text) {
      // Find the text in the document starting from our last known position using fuzzy search
      const match = fuzzyFindText(fullText, scene.text, searchState.lastIndex);
      if (match) {
        startIndex = match.start;
        endIndex = match.end;
        searchState.lastIndex = match.end; // Move the pointer forward
      } else {
        console.warn(`⚠️ Could not find exact match for scene text: "${scene.text.substring(0, 30)}..."`);
      }
    }

    sceneCards.push({
      id: sceneId,
      sceneNumber: globalIdx + 1,
      text: scene.text || '',
      visualNote: scene.visualNote || `Sahne ${globalIdx + 1}`,
      characterIds,
      locationIds,
      timeContextIds: [],
      startIndex,
      endIndex,
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
): Promise<AnalysisPayload> {
  const content = await aiProvider.generateContent(chunk, SCENE_ANALYSIS_SYSTEM_PROMPT, { operationType: 'scene_analysis' });

  console.log('🤖 Raw Gemini response:', content.substring(0, 1000));

  let cleanedContent: string;
  try {
    cleanedContent = cleanJsonResponse(content);
    console.log('🧹 Cleaned JSON string length:', cleanedContent.length);
  } catch {
    cleanedContent = content;
  }

  try {
    return JSON.parse(cleanedContent) as AnalysisPayload;
  } catch (error) {
    console.error('❌ Scene analysis JSON parse error:', error);
    // Last-resort recovery attempt
    try {
      const recovered = recoverTruncatedJson(cleanedContent);
      console.warn('⚠️ Recovered truncated JSON for chunk');
      return JSON.parse(recovered) as AnalysisPayload;
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
  _model?: string,
  onProgress?: (message: string) => void
): Promise<{
  sceneCards: SceneCard[];
  characters: Character[];
  locations: Location[];
  suggestedTimeContexts: TimeContext[];
}> {
  onProgress?.(` Metin hazırlanıyor... (${text.length} karakter, ~${Math.round(text.split(' ').length)} kelime)`);
  const chunks = splitTextIntoChunks(text);
  console.log(`📦 Splitting text into ${chunks.length} chunk(s) for analysis`);
  onProgress?.(` ${chunks.length} parçaya bölündü`);

  const characterMap = new Map<string, Character>();
  const locationMap = new Map<string, Location>();
  const allSceneCards: SceneCard[] = [];
  const timeContextLabelMap = new Map<string, string>(); // sceneId → timeContextLabel
  let sceneNumberOffset = 0;
  let suggestedTimeContexts: TimeContext[] = [];
  const searchState = { lastIndex: 0 };

  for (let i = 0; i < chunks.length; i++) {
    console.log(`🔍 Analyzing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);
    onProgress?.(` Yapay zeka analiz ediyor... (Parça ${i + 1}/${chunks.length})`);
    const parsed = await analyzeChunk(chunks[i]);

    // Process top-level globally defined characters and locations
    if (parsed.characters) {
      parsed.characters.forEach(char => {
        if (!char.name) return;
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
      });
    }

    if (parsed.locations) {
      parsed.locations.forEach(loc => {
        if (!loc.name) return;
        const normalizedName = normalizeTurkishLocationName(loc.name);

        // Find existing ID across all parsed chunks so far using normalized name
        let existingId: string | null = null;
        for (const [id, l] of locationMap.entries()) {
          if (normalizeTurkishLocationName(l.name) === normalizedName) {
            existingId = id; break;
          }
        }

        if (!existingId) {
          const locId = `loc-${loc.name.replace(/\s+/g, '-').toLocaleLowerCase('tr-TR')}`;
          locationMap.set(locId, {
            id: locId,
            name: loc.name,
            visualDescription: loc.visualDescription,
          });
        }
      });
    }

    const scenes = parsed.scenes ?? [];
    const cards = buildResultFromScenes(scenes, sceneNumberOffset, characterMap, locationMap, timeContextLabelMap, text, searchState);
    allSceneCards.push(...cards);
    sceneNumberOffset += scenes.length;
    onProgress?.(` ${cards.length} sahne kartı oluşturuldu`);

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
    onProgress?.(` ${characterMap.size} karakter tespit edildi`);
    onProgress?.(` ${locationMap.size} mekan tespit edildi`);
  }

  onProgress?.(` ${suggestedTimeContexts.length} zaman bağlamı oluşturuldu`);
  onProgress?.(` Sahnelere karakter ve mekan bağlanıyor...`);

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

  onProgress?.(` Veriler kayıt için hazırlanıyor...`);
  onProgress?.(` Analiz tamamlandı! ${allSceneCards.length} sahne hazır`);

  return {
    sceneCards: allSceneCards,
    characters: Array.from(characterMap.values()),
    locations: Array.from(locationMap.values()),
    suggestedTimeContexts,
  };
}

export async function generateEpisodePrompt(
  documentText: string,
  characters: Character[],
  locations: Location[]
): Promise<string> {
  const characterSummary = characters
    .slice(0, 5)
    .map(c => `${c.name}${c.role ? ` (${c.role})` : ''}`)
    .join(', ');

  const locationSummary = locations
    .slice(0, 5)
    .map(l => l.name)
    .join(', ');

  const systemPrompt = `Sen dünya standartlarında bir belgesel film sanat yönetmenisin.
Sana bir belgesel bölümünün seslendirme metni, karakterleri ve mekanları verilecek.
Görevin: Bu bölüm için kapsamlı bir GÖRSEL STİL REHBERİ yazmak.

Bu rehber şunları içermeli:
- Genel görsel ton ve atmosfer (sinematik referanslar)
- Renk paleti ve kontrast tercihleri
- Işık karakteri (sıcak/soğuk, sert/yumuşak, yön)
- Kamera dili (yakın çekim ağırlıklı mı, epik geniş açılar mı)
- Dönem ve kültürel estetik doğruluk notları
- Kostüm ve mimari renk harmonisi
- Öne çıkan doku ve malzeme karakteri
- Genel mood ve duygusal ton

Rehber İNGİLİZCE olmalı, 150-200 kelime, prompt formatında yazılmalı.
Madde madde değil, akıcı paragraf halinde.
Görüntü üretim AI'ına (Midjourney/Stable Diffusion) doğrudan verilebilecek kalitede olmalı.`;

  const userMessage = `Seslendirme metni:
${documentText.substring(0, 1500)}

Bölümde geçen karakterler: ${characterSummary || 'Belirtilmemiş'}
Bölümde geçen mekanlar: ${locationSummary || 'Belirtilmemiş'}

Bu bölüm için görsel stil rehberini yaz.`;

  const result = await aiProvider.generateContent(userMessage, systemPrompt);
  return result.trim();
}

export async function generateEpisodePromptTurkishExplanation(
  episodePrompt: string
): Promise<string> {
  const systemPrompt = `Sen profesyonel bir belgesel yönetmeni ve çevirmenisin.
Sana İngilizce yazılmış, yapay zeka görüntü üretimi için hazırlanmış teknik bir GÖRSEL STİL REHBERİ (Episode Prompt) verilecek.
Görevin: Bu rehberde istenen vizyonu ve atmosferi, prodüksiyon ekibinin (veya müşterinin) kolayca anlayabileceği bir dille TÜRKÇE olarak özetlemek.

Kurallar:
- Doğrudan çeviri yapma, okunaklı ve akıcı bir özet paragraf yaz.
- Renk paletini, ışık tarzını, kamera dilini ve genel atmosferi kısaca anlat.
- Prompun teknik kısımlarını (örn. 35mm lens, 8k resolution, cinematic lighting vb.) sadeleştirerek "Nasıl bir his/görüntü yaratılmak isteniyor?" sorusuna cevap ver.
- En fazla 2-3 cümlelik, 40-50 kelimelik net ve profesyonel bir özet olsun.`;

  const userMessage = `İngilizce Görsel Stil Rehberi (Episode Prompt):
${episodePrompt}

Bu rehberin Türkçe, akıcı ve profesyonel açıklamasını/özetini yazar mısın?`;

  const result = await aiProvider.generateContent(userMessage, systemPrompt);
  return result.trim();
}
