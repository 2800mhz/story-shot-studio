import type { SceneCard, Character, Location, TimeContext } from '@/types';
import { aiProvider } from './aiProvider';

export function getSceneAnalysisSystemPrompt(targetSceneCount?: number): string {
  const targetInstruction = targetSceneCount
    ? `⛔ KESİN SAHNE SINIRI: ${targetSceneCount} sahne (tolerans: ±2)

Bu kural diğer tüm kuralların ÜZERİNDEDİR.
- ${targetSceneCount}'den fazla sahne YASAKTIR, istisnasız.
- Fazla üretmek yerine sahneleri BİRLEŞTİR.
- "Her dönüşüm 5 sahne" gibi kurallar bu limite TABİDİR, onu geçemez.
- Önce toplam sahne sayısını planla, sonra metni böl.
- Eğer metin çok kısa veya çok uzunsa bile ${targetSceneCount} ± 2 bandında kal.`
    : `SAHNE SAYISI HESABI (KRİTİK)

Metni almadan önce kelime sayısını tahmin et.
Formül: kelime_sayısı / 5 = hedef sahne sayısı

Örnekler:
- 150 kelime = kabaca 30 sahne
- 300 kelime = kabaca 60 sahne
- 450 kelime = kabaca 90 sahne

Bu hedefe tam ulaş. Fazla üretme, eksik kalabilirsin ama ASLA fazla üretme.`;

  return `Sen dünya standartlarında bir belgesel film görsel yönetmeni ve kurgu editörüsün.
Elindeki metin bir BELGESEL SESLENDIRME METNİDİR (documentary voice-over/narration).

TEMEL CERCEVE

Bu metin ekranda kısa görüntü kesimleriyle desteklenecek.
Her sahne kartı = ekranda 3-5 saniyelik TEK BİR GÖRÜNTÜ KESİMİDİR.
Bu görüntüler text2img ile üretilecek, sonra hareketlendirme uygulanacaktır.

${targetInstruction}

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
- YASAK: Karakterlerin kameraya veya ileriye dümdüz baktığı vesikalık pozlar.
- YASAK: Orduların tiyatro sahnesi gibi tüm kadro karşılıklı dizildiği vizyonsuz geniş açılar.
- TERCİH EDİLEN: Omuz üstü (over-the-shoulder), silüet, kaosun içinden (toz/duman) detaya odaklı sinematik açılar.

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
  Yaş ve beden tipi, siluet karakteri,
  kıyafet (kumaş, renk, desen, dönem ve kültür doğruluğu),
  kültürel kimlik belirteçleri (sarık tipi, başörtüsü stili, sakal,
  Orta Asya/Osmanlı/modern Türk farkı).
  Sonunda mutlaka: "photorealistic, cinematic lighting, documentary style"
- Kalabalık: isCrowd true, grup kompozisyonunu tanımla
- Birey: isCrowd false, tam birey detayı
- YASAK: Psikoloji, motivasyon, hikaye, yüz ifadesi tarifi

MEKAN STANDARDI (MİMARİ DOĞRULUK + TEMPORAL AYRIMI)

- SADECE fiziksel, fotoğraflanabilir mekanlar
- Her mekan için maksimum 30 kelimelik İngilizce visualDescription yaz:
  Mimari stil ve dönem, yapı malzemeleri (kerpiç, kesme taş, ahşap, çini, mermer, halı),
  ölçek ve coğrafi bağlam (Orta Asya çölü, Anadolu, İstanbul vb.)

KRİTİK — FİZİKSEL YAPI vs DURUMSAL ATMOSFER AYRIMI:
- visualDescription = mekânın KALICI fiziksel ve mimari özellikleri, değişmez gerçekliği
  YANLIŞ: "burning buildings, scattered debris, smoke" — bu durum/atmosfer, mimari değil
  YANLIŞ: "signs of destruction, fire damage, abandoned streets" — bunlar timeContext'e ait
  YANLIŞ: "ominous atmosphere, tense mood" — atmosfer değil mimari yaz
  DOĞRU: "mud-brick houses with carved archways, vaulted market halls, central courtyard fountain"
  DOĞRU: "massive stone walls with battlements and towers, arched gateways, mud-brick construction"
  DOĞRU: "opulent palace interior, geometric tilework, silk hangings, carved stone columns, domed ceiling"
- Hasar, yıkım, kuşatma, yangın, terk edilmişlik, gerilim bilgisi visualDescription'a KESİNLİKLE GİRMEZ
  Bu bilgiler timeContext.historicalNotes ve timeContext.lighting'e aittir

AYNI MEKANIN FARKLI TEMPORAL HALLERİ:
- Bir mekân hikaye boyunca farklı durumlarda görünüyorsa:
  LOKASYON ENTITY'Sİ TEK KALIR (mimari yapı değişmez)
  O anın durumu ve atmosferi timeContext.historicalNotes ile taşınır
- YASAK: Aynı fiziksel mekânı farklı temporal halleri için ayrı entity olarak tanımlamak
- YASAK: Soyut mekanlar, süreçler, eylemler

ZAMAN BAGLAMI KURALLARI (KRİTİK)

- Farklı dönemler kesinlikle ayrı timeContext
- Aynı dönem ama mekânın farklı temporal durumu = ayrı timeContext
  Örnekler:
  kuşatma öncesi Ürgenç sarayı ≠ kuşatma altındaki Ürgenç sarayı ≠ yıkılmış Ürgenç
  savaş öncesi konuşlanma ≠ açık savaş ≠ savaş sonrası enkaz
  Fatih İstanbul kuşatması ≠ surların düşüşü ≠ fetih sabahı

historicalNotes — EN KRİTİK ALAN (atmosfer ve temporal bağlam buraya yazılır):
- Mekânın O ANKİ fiziksel ve sosyal durumunu tam olarak tarif et
- Örnekler:
  "City fully intact, palace and markets functioning — Mongol forces approaching but walls not yet breached"
  "Palace interior intact but in crisis: sultan absent, court tense, candles unlit, servants fled to corners"
  "City under active siege: outer walls partially breached but palace structure still standing, population in hiding"
  "Post-sack: structures gutted, halls stripped of valuables, streets emptied — only dust and ruins remain"
  "Open battlefield before engagement: armies positioned in tense stillness, no blood yet shed"
  "Siege in progress: dust and fire outside city walls, interior spaces intact but fearful"

lighting — DUYGUSAL ATMOSFERİ FIZIKSEL YIKIM OLMADAN DA TAŞIYABİLİR:
  "cold grey light through narrow palace windows, candles unlit, ominous stillness — siege outside, interior intact"
  "warm torchlight in functioning throne room, deep shadows in corners, tension without destruction"
  "harsh desert sunlight, golden dust haze, dry heat shimmer"
  "warm candlelight, golden hour through mosque windows, Ramadan night"
  "blue hour pre-dawn, soft ambient light, modern cityscape"
  "dramatic low sunlight filtering through smoke, deep shadows, orange hues from distant fires"

JSON CIKTI:
{
  "characters": [
    {
      "name": "Karakter Adı",
      "role": "Rolü/mesleği/kimliği (örn: 'Süvari', 'Padişah')",
      "isCrowd": false,
      "visualDescription": "Maksimum 30 kelimelik İngilizce — kostüm/siluet/beden, yüz ifadesi YOK"
    }
  ],
  "locations": [
    {
      "name": "Mekan Adı",
      "visualDescription": "Maksimum 30 kelimelik İngilizce — SADECE kalıcı mimari özellikler, hasar/atmosfer/durum YOK"
    }
  ],
  "timeContexts": [
    {
      "label": "Dönem ve durum adı (Türkçe, örn: 'Kuşatma Öncesi Ürgenç - Gündüz')",
      "era": "Tarihsel dönem",
      "season": "Mevsim",
      "timeOfDay": "gündüz/gece/sabah/akşam/iftar vakti",
      "lighting": "İngilizce ışık ve atmosfer tanımı — duygusal ton burada yaratılır",
      "weather": "Hava (opsiyonel)",
      "historicalNotes": "Mekânın O ANKİ fiziksel ve sosyal durumu (İngilizce) — temporal bağlam ve atmosfer burada"
    }
  ],
  "scenes": [
    {
      "sceneNumber": 1,
      "text": "Seslendirme metninden orijinal kelime grubu, degistirme",
      "visualNote": "Kısa Türkçe görsel açıklama (maks 10 kelime)",
      "characterNames": ["Karakter Adı"],
      "locationNames": ["Mekan Adı"],
      "timeContextLabel": "Dönem ve durum adı (Türkçe)"
    }
  ]
}

KRİTİK: Her sahnede timeContextLabel dolu olmalı. timeContexts en az 1 eleman içermeli.
METİN:`;
}

function cleanJsonResponse(text: string): string {
  // Önce ```json ... ``` bloğunu bul ve sadece içeriğini al
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    text = jsonBlockMatch[1].trim();
  } else {
    // Backtick bloğu yoksa ilk { karakterinden itibaren al (preamble metni at)
    const firstBrace = text.indexOf('{');
    if (firstBrace > 0) {
      text = text.substring(firstBrace);
    }
    // Sondaki ``` artıklarını temizle
    text = text.replace(/```\s*$/g, '').trim();
  }

  // Kontrol karakterlerini temizle
  text = text.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '');
  text = text.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
    return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
  });
  try {
    JSON.parse(text);
  } catch {
    text = recoverTruncatedJson(text);
  }
  return text;
}

function splitTextIntoChunks(text: string, maxChars = 2500): string[] {
  if (text.length <= maxChars) return [text];
  const chunks: string[] = [];
  const paragraphs = text.split(/\n+/);
  
  let currentChunk = '';

  for (const para of paragraphs) {
    // Eğer tek bir paragraf maxChars sınırından büyükse cümlelere böl
    if (para.length > maxChars) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      const sentences = para.split(/(?<=[.!?])\s+/);
      let currentSentenceChunk = '';
      
      for (const sentence of sentences) {
        if ((currentSentenceChunk + ' ' + sentence).length > maxChars && currentSentenceChunk) {
          chunks.push(currentSentenceChunk.trim());
          currentSentenceChunk = sentence;
        } else {
          currentSentenceChunk = currentSentenceChunk ? currentSentenceChunk + ' ' + sentence : sentence;
        }
      }
      if (currentSentenceChunk) {
        currentChunk = currentSentenceChunk;
      }
    } else {
      if ((currentChunk + '\n' + para).length > maxChars && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = para;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n' + para : para;
      }
    }
  }
  
  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks;
}

function recoverTruncatedJson(raw: string): string {
  const lastObj = raw.lastIndexOf('}');
  if (lastObj <= 0) throw new Error('Cannot recover truncated JSON');
  let candidate = raw.substring(0, lastObj + 1);
  let openBrackets = 0;
  let openBraces = 0;
  let inString = false;
  let escape = false;
  for (const ch of candidate) {
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '[') openBrackets++;
    else if (ch === ']') openBrackets--;
    else if (ch === '{') openBraces++;
    else if (ch === '}') openBraces--;
  }
  candidate += ']'.repeat(Math.max(0, openBrackets));
  candidate += '}'.repeat(Math.max(0, openBraces));
  return candidate;
}

type SceneRaw = {
  sceneNumber?: number;
  text?: string;
  visualNote?: string;
  timeContextLabel?: string;
  characterNames?: string[];
  locationNames?: string[];
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

function normalizeTurkishLocationName(name: string): string {
  let n = name.toLocaleLowerCase('tr-TR').trim();
  n = n.replace(/(.{3,})(lar|ler)$/, '$1');
  n = n.replace(/camii$/, 'cami');
  n = n.replace(/\s+/g, ' ');
  return n;
}

function fuzzyFindText(fullText: string, searchStr: string, startIndex: number): { start: number, end: number } | null {
  const cleanSearch = searchStr.trim();
  if (!cleanSearch) return null;

  let exact = fullText.indexOf(cleanSearch, startIndex);
  if (exact !== -1) return { start: exact, end: exact + cleanSearch.length };
  exact = fullText.indexOf(cleanSearch, 0);
  if (exact !== -1) return { start: exact, end: exact + cleanSearch.length };

  const lowerFull = fullText.toLocaleLowerCase('tr-TR');
  const lowerSearch = cleanSearch.toLocaleLowerCase('tr-TR');
  let ci = lowerFull.indexOf(lowerSearch, startIndex);
  if (ci === -1) ci = lowerFull.indexOf(lowerSearch, 0);
  if (ci !== -1) return { start: ci, end: ci + cleanSearch.length };

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

  const startTokenIdx = fullTokens.findIndex(t => t.index >= Math.max(0, startIndex - 50));
  const searchFrom = startTokenIdx >= 0 ? startTokenIdx : 0;

  for (let i = searchFrom; i <= fullTokens.length - searchTokens.length; i++) {
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
      const match = fuzzyFindText(fullText, scene.text, searchState.lastIndex);
      if (match) {
        startIndex = match.start;
        endIndex = match.end;
        searchState.lastIndex = match.end;
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
  chunk: string,
  targetSceneCount?: number
): Promise<AnalysisPayload> {
  const content = await aiProvider.generateContent(chunk, getSceneAnalysisSystemPrompt(targetSceneCount), { operationType: 'scene_analysis' });

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

function mergeTimeContextsByLabel(existing: TimeContext[], incoming: TimeContext[]): TimeContext[] {
  const map = new Map(existing.map(tc => [tc.label, tc]));
  incoming.forEach(tc => { if (!map.has(tc.label)) map.set(tc.label, tc); });
  return Array.from(map.values());
}

export async function analyzeTextIntoScenes(
  text: string,
  _apiKey?: string,
  _model?: string,
  onProgress?: (message: string) => void,
  targetSceneCount?: number
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
  const timeContextLabelMap = new Map<string, string>();
  let sceneNumberOffset = 0;
  let suggestedTimeContexts: TimeContext[] = [];
  const searchState = { lastIndex: 0 };

  // Hedef sahne sayısını chunk'lara karakter oranına göre dağıt
  const totalCharsAllChunks = chunks.reduce((sum, c) => sum + c.length, 0);
  const chunkTargets: (number | undefined)[] = chunks.map((chunk, i) => {
    if (!targetSceneCount) return undefined;
    if (chunks.length === 1) return targetSceneCount;
    // Son chunk: kalan sahneyi ver (yuvarlama hatası birikmesini önler)
    if (i === chunks.length - 1) {
      const allocated = chunks.slice(0, -1).reduce((sum, c) => {
        return sum + Math.round(targetSceneCount * (c.length / totalCharsAllChunks));
      }, 0);
      return Math.max(1, targetSceneCount - allocated);
    }
    return Math.max(1, Math.round(targetSceneCount * (chunk.length / totalCharsAllChunks)));
  });

  for (let i = 0; i < chunks.length; i++) {
    const chunkTarget = chunkTargets[i];
    console.log(`🔍 Analyzing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars${chunkTarget ? `, target: ${chunkTarget} scenes` : ''})`);
    onProgress?.(` Yapay zeka analiz ediyor... (Parça ${i + 1}/${chunks.length})`);
    const parsed = await analyzeChunk(chunks[i], chunkTarget);

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

export async function reviseEpisodePrompt(
  currentPrompt: string,
  instruction: string
): Promise<string> {
  const systemPrompt = `Sen dünya standartlarında bir belgesel film sanat yönetmenisin.
Sana mevcut bir İngilizce GÖRSEL STİL REHBERİ (Episode Prompt) ve kullanıcının revizyon yönergesi verilecek.

Görevin:
- Kullanıcının yönergesini dikkate alarak rehberi güncelle.
- Rehberin genel yapısını, akışını ve teknik kalitesini koru.
- Sadece istenen değişikliği entegre et; değiştirilmemesi gereken kısımlara dokunma.
- Sonuç yine prompt formatında, 150-200 kelime İngilizce olmalı.

SADECE güncellenmiş İngilizce rehberi döndür. Açıklama yapma, Türkçe yazmaz, markdown kullanma.`;

  const userMessage = `Mevcut Görsel Stil Rehberi (Episode Prompt):
${currentPrompt || '(Henüz bir stil rehberi yok — sıfırdan yaz)'}

Kullanıcı yönergesi:
"${instruction}"

Lütfen rehberi bu yönergeye göre revize et ve sadece güncellenmiş İngilizce rehberi döndür.`;

  const result = await aiProvider.generateContent(userMessage, systemPrompt, { operationType: 'episode_style_revision' });
  return result.trim();
}