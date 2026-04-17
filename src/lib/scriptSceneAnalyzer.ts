import type { SceneCard, Character, Location, TimeContext } from '@/types';
import { aiProvider } from './aiProvider';
import type { ScriptChunk } from './scriptParser';
import {
  parseScriptAnalysisResponse,
  scriptAnalysisResponseJsonSchema,
  scriptAnalysisResponseSchema,
} from './scriptSceneAnalysisSchema';

const SCRIPT_ANALYSIS_SYSTEM_PROMPT = `Sen bir belgesel film görsel editörüsün.
Sana bir belgesel senaryosundan alınan GÖRÜNTÜ blokları verilecek.
Her blok bir perdeye ait, içinde birden fazla görsel an olabilir.

GÖREV:
Her GÖRÜNTÜ bloğunu analiz et ve görsel olarak üretilebilir ayrı çekimlere böl.

BÖLME MANTIĞI (KRİTİK - AGRESIF BÖLE):
Her GÖRÜNTÜ bloğunu MAKSIMUM granülaritede böl.

BUNLARIN HEPSİ AYRI SAHNE:
- Her ayrı nesne veya odak noktası ("gökyüzü" / "ufuk" / "otlar")
- Her ayrı karakter hareketi veya duruşu
- Her kamera açısı değişimi (geniş plan → yakın plan)
- Her ":" ile ayrılmış görsel tanım satırı
- Her doğa elementi (ateş, su, rüzgar, toprak ayrı ayrı)
- Başlık satırları: "GENİŞ PLAN:", "YAKIN PLAN:", "AŞIRI YAKIN PLAN:" her biri ayrı sahne
- Liste halinde verilen öğeler ("Rüzgar silüeti / Ay ışığı / Ağaçlar" = 3 ayrı sahne)

BİRLEŞTİR (sadece bu durumlarda):
- Tek kelimelik bağlaçlar ("Ve", "Ama")
- Aynı nesnenin 2 kelimelik devamı

HEDEF SAHNE SAYISI (KRİTİK):
Her GÖRÜNTÜ bloğundan ortalama 1.5 sahne çıkar.
Maksimum 2 sahne per blok. 2'den fazla üretme.
Birbirine çok yakın görsel anları birleştir.

HER SAHNE İÇİN:
- text: O sahnenin Türkçe kısa özeti (5-10 kelime)
- visualNote: Kameranın tKARAKTER STANDARDI (FİZİKSEL ÇAPA — TUTARLILIK):
Her karakter için İngilizce visualDescription yazarken "Photorealistic", "Cinematic" gibi teknik terimler ASLA kullanma. Bunlar zaten ana sistem tarafından eklenecektir. Bunun yerine bir heykel tıraş veya terzi gibi fiziksel detaylara odaklan:

0. VÜCUT MİMARİSİ (TEMEL ÇAPA):
   - Ağırlık ve boy tahmini: "Stocky heavyset build, approximately 80-90kg on 165cm frame"
   - Omuz genişliği: "Broad shoulders" veya "Narrow sloping shoulders"
   - Karın: "Slight belly" veya "Lean torso" — açık seç
   - Duruş: "Slightly hunched with age" veya "Upright commanding posture"
   - Bu veriler yüz kadar önemlidir. Model her sahnede aynı vücut tipini çizecek.

1. YÜZ GEOMETRİSİ (SABİT ÇAPA):
   - Elmacık kemiği genişliği: "Broad zygomatic arches spanning wide facial structure"
   - Burun: "Low-bridge hooked nose with wide nostrils" gibi mimari betimle
   - Göz: "Deep-set almond-shaped eyes under heavy brow ridge"
   - Deri: "Weathered bronze skin with deep nasolabial folds and crow's feet at eye corners"
   - Çene: "Strong square jawline" veya "Soft rounded jaw" — net seç, ikisi karışmasın

2. SAKAL VE SAÇ (SAYISAL ÖLÇÜ ZORUNLU):
   - Sakalın uzunluğu CM cinsinden: "Full beard extending 10-12cm below chin"
   - Rengi kesin: "Snowy white throughout, no gray patches, slightly unkempt at lower edges"
   - Dokusu: "Dense, naturally parted, with visible coarse strands"

3. KIYAFET MİMARİSİ (DETAYLI + NEGATIF):
   - Sarık: "Oversized white linen turban wrapped in 3 full coils, rising 15cm above crown, slightly asymmetric to left"
   - Kumaş: "Heavy coarse-woven wool kaftan, visible rough stitching at seams, deep ochre-brown color"
   - NEGATIF ÇAPA — her karakter tanımına ekle: Karakterin olmadığı şeyi yaz.
     Örnek Nasreddin Hoca için: "NOT a thin man, NOT dark beard, NOT small turban, NOT clean-shaven, NOT young face"

4. YASAK: Duygusal, hikayesel veya teknik betimleme. Sadece fiziksel "çapa" verisi.
5. YASAK: "Wise", "kind", "intelligent" gibi sıfatlar. Bunlar yorum, fizik değil.
 YAŞ & BEDEN:
   - Yaş aralığı (örn: mid-40s to 50s)
   - Beden tipi (lean/muscular/stocky/thin)
   - Boy (tall/medium/short)

7. KIYAFETLERİN TAMAMI:
   - Her parça ayrı ayrı (üst, alt, ayakkabı, başlık, aksesuar)
   - Kumaş tipi, renk, desen
   - Dönem ve kültürel doğruluk

8. SONUNDA MUTLAKA:
   "photorealistic, cinematic lighting, documentary style, anthropologically accurate, based on period manuscripts, NOT film or television adaptations"

KRİTİK (Karakter Verisi): "visualDescription" alanı, yukarıdaki tüm detayların bir sentezi olan akıcı bir paragraf olmalıdır. ANCAK "age", "ethnicity", "clothing", "physicalFeatures", "hair" ve "beard" alanları da AYRI AYRI ve eksiksiz doldurulmalıdır. Bir bilgiyi visualDescription'a yazmış olman, o alanı boş bırakabileceğin anlamına gelmez.

YASAK: Psikoloji, motivasyon, hikaye, soyut nitelikler

MEKAN STANDARDI:
- Sadece fiziksel, fotoğraflanabilir mekanlar
- Max 30 kelimelik İngilizce visualDescription

ZAMAN BAĞLAMI KURALI (KRİTİK):
Maksimum 5-8 zaman bağlamı üret. Benzer zamanları birleştir.
"Ötüken - Gece" tek bir bağlam olsun, her sahne için ayrı bağlam üretme.
Sadece gerçekten farklı dönem/ışık/atmosfer için yeni bağlam ekle.

GÖRSEL STİL TESPİTİ (KRİTİK):
"symbolic" seç eğer sahne şunları içeriyorsa:
- Doğaüstü ışık (enerji halkası, kozmik ışık, altın şok dalgası)
- Donmuş zaman/hareket (donmuş su, donmuş yaprak, hareketsiz rüzgar)
- Görünmez güçlerin görsel hali (ses dalgası, titreşim, enerji ağı)
- Ruhların fiziksel tezahürü, şekil alması, dönüşümü
- Gök Tengri, Umay Ana, ruhani varlıklar

"realistic" seç sadece gerçek fiziksel çekim için:
- Gerçek insan, hayvan
- Gerçek doğa, mekan
- Fizik yasalarına uygun hareket

VARSAYILAN: Emin değilsen "symbolic" seç.

JSON ÇIKTI:
{
  "scenes": [
    {
      "perdeNo": "PERDE 01",
      "sceneNumber": 1,
      "text": "Çivit mavisi gökyüzü gece başlangıcında",
      "visualNote": "Boş çivit mavisi gökyüzü yıldızsız",
      "visualStyle": "realistic",
      "characterNames": [],
      "locationNames": ["Ötüken Düzlüğü"],
      "timeContextLabel": "Ötüken - Gece"
    }
  ],
  "characters": [
    {
      "name": "Kam",
      "role": "Şaman",
      "isCrowd": false,
      "age": "mid-40s to 50s",
      "ethnicity": "Turanid-Mongoloid phenotype",
      "physicalFeatures": "broad flat face, prominent cheekbones, narrow eyes with epicanthic fold, low nasal bridge, bronze-olive skin, deep sun-lined texture",
      "hair": "long black hair, loose with small ritual braids",
      "beard": "thin black goatee and mustache",
      "clothing": "heavy deer-hide kaftan with bronze mirrors and bone talismans, fur-lined boots, feathered ritual headpiece",
      "visualDescription": "A middle-aged Shaman with Turanid-Mongoloid features, weathered bronze skin, and deep facial lines. He wears a heavy deer-hide kaftan adorned with bone talismans and bronze mirrors. His long black hair is partially braided. Photorealistic, cinematic lighting, documentary style, anthropologically accurate."
    }
  ],
  "locations": [
    {
      "name": "Ötüken Düzlüğü",
      "visualDescription": "Vast open Eurasian steppe with sparse dry grass, rolling low hills in the distance under a clear deep blue twilight sky."
    }
  ],
  "timeContexts": [
    {
      "label": "Ötüken - Gece",
      "era": "6th-8th Century Göktürk Era",
      "season": "Late Summer",
      "timeOfDay": "night",
      "lighting": "cool blue moonlight, high contrast, stars just beginning to appear",
      "weather": "clear, calm night",
      "historicalNotes": "Ancient Turkic heartland, high plateau atmosphere, nomadic settlement context"
    }
  ]
}

KRİTİK: Her sahnede timeContextLabel dolu olmalı.
KRİTİK: Her character için "age", "ethnicity", "clothing", "physicalFeatures", "hair", "beard" ve "visualDescription" alanlarını KESİNLİKLE doldur. 
EĞER bu detaylar senaryo metninde açıkça geçmiyorsa, karakterin rolüne, tarihi döneme ve mekana uygun olarak SEN TAHMİN ET VE MUTLAKA DOLDUR. Boş bırakmak veya "unknown" yazmak yasaktır!
BLOKLAR:`;


export async function analyzeScriptChunk(
  chunk: ScriptChunk,
  onProgress?: (msg: string) => void
): Promise<{
  sceneCards: SceneCard[];
  characters: Character[];
  locations: Location[];
  suggestedTimeContexts: TimeContext[];
}> {
  const totalBlocks = chunk.scenes.reduce((sum, s) => {
    return sum + (s.visualBlock.split('\n').filter(l => l.trim()).length);
  }, 0);

  const targetScenes = Math.round(totalBlocks * 1.5);

  const chunkScenesText = chunk.scenes.map(s =>
    `
${s.perdeNo} — ${s.perdeTitle}\nGÖRÜNTÜ:\n${s.visualBlock}\n${s.voContext ? `V.O. BAĞLAM: ${s.voContext}` : ''}`
  ).join('\n\n---\n\n');

  const chunkText = `HEDEF SAHNE SAYISI: Bu chunk için tam olarak ${targetScenes} sahne üret. Ne az ne fazla.\n\n${chunkScenesText}`;

  onProgress?.(`🎬 Chunk ${chunk.chunkIndex + 1}/${chunk.totalChunks} analiz ediliyor...`);

  const content = await aiProvider.generateContent(chunkText, SCRIPT_ANALYSIS_SYSTEM_PROMPT, {
    operationType: 'script_scene_analysis',
    responseMimeType: 'application/json',
    responseSchema: scriptAnalysisResponseJsonSchema,
  });

  let parsed: z.infer<typeof scriptAnalysisResponseSchema>;
  try {
    parsed = parseScriptAnalysisResponse(content);
    console.log(`📊 Chunk ${chunk.chunkIndex + 1}: ${chunk.scenes.length} perde → ${parsed.scenes?.length} sahne üretildi`);
    console.log(`📝 İlk sahne örneği:`, JSON.stringify(parsed.scenes?.[0], null, 2));
  } catch {
    console.error('Script chunk parse error');
    return { sceneCards: [], characters: [], locations: [], suggestedTimeContexts: [] };
  }

  const characterMap = new Map<string, Character>();
  const locationMap = new Map<string, Location>();

  (parsed.characters || []).forEach((c) => {
    if (!c.name) return;
    const id = `char-${c.name.replace(/\s+/g, '-').toLocaleLowerCase('tr-TR')}`;
    if (!characterMap.has(id)) {
      characterMap.set(id, {
        id,
        name: c.name,
        role: c.role,
        isCrowd: c.isCrowd ?? false,
        age: c.age,
        ethnicity: c.ethnicity,
        physicalFeatures: c.physicalFeatures,
        hair: c.hair,
        beard: c.beard,
        clothing: c.clothing,
        visualDescription: c.visualDescription,
      });
    }
  });


  (parsed.locations || []).forEach((l) => {
    if (!l.name) return;
    const id = `loc-${l.name.replace(/\s+/g, '-').toLocaleLowerCase('tr-TR')}`;
    if (!locationMap.has(id)) {
      locationMap.set(id, { id, name: l.name, visualDescription: l.visualDescription });
    }
  });

  const timeContexts: TimeContext[] = (parsed.timeContexts || []).map((tc) => ({
    id: `tc-${crypto.randomUUID()}`,
    label: tc.label ?? '',
    era: tc.era,
    season: tc.season,
    timeOfDay: tc.timeOfDay,
    lighting: tc.lighting,
    weather: tc.weather,
    historicalNotes: tc.historicalNotes,
  }));


  const labelToId = new Map(timeContexts.map(tc => [tc.label, tc.id]));

  const sceneCards: SceneCard[] = (parsed.scenes || []).map((s, idx) => ({
    id: crypto.randomUUID(),
    sceneNumber: idx + 1, // Placeholder, will be reassigned in analyzeFullScript
    text: s.text || '',
    visualNote: s.visualNote || '',
    visualStyle: (() => {
      if (s.visualStyle === 'symbolic') return 'symbolic';
      // AI 'symbolic' demese bile metin içeriğine bakarak tespit et
      const note = (s.visualNote || '').toLowerCase();
      const text = (s.text || '').toLowerCase();
      const symbolicKeywords = [
        'enerji', 'halka', 'ışık halkası', 'donmuş', 'asılı', 'titreşim',
        'kozmik', 'şekil alır', 'dönüşür', 'yükselir', 'havada', 'siyah',
        'ses dalgası', 'mavi halka', 'altın şok', 'enerji ağı', 'silüet oluşur',
        'gök tengri', 'umay ana', 'ruh', 'tezahür'
      ];
      const isSymbolic = symbolicKeywords.some(k => note.includes(k) || text.includes(k));
      return isSymbolic ? 'symbolic' : 'realistic';
    })(),
    characterIds: (s.characterNames || []).map((n) =>
      `char-${n.replace(/\s+/g, '-').toLocaleLowerCase('tr-TR')}`
    ).filter((id) => characterMap.has(id)),
    locationIds: (s.locationNames || []).map((n) =>
      `loc-${n.replace(/\s+/g, '-').toLocaleLowerCase('tr-TR')}`
    ).filter((id) => locationMap.has(id)),
    timeContextIds: s.timeContextLabel && labelToId.has(s.timeContextLabel) ? [labelToId.get(s.timeContextLabel)!] : [],
    prompts: [],
    status: 'analyzed',
    noteEditable: true,
  }));

  return {
    sceneCards,
    characters: Array.from(characterMap.values()),
    locations: Array.from(locationMap.values()),
    suggestedTimeContexts: timeContexts,
  };
}

export async function analyzeFullScript(
  chunks: ScriptChunk[],
  onProgress?: (msg: string) => void
): Promise<{
  sceneCards: SceneCard[];
  characters: Character[];
  locations: Location[];
  suggestedTimeContexts: TimeContext[];
}> {
  const allSceneCards: SceneCard[] = [];
  const characterMap = new Map<string, Character>();
  const locationMap = new Map<string, Location>();
  const timeContextMap = new Map<string, TimeContext>();

  const WORKER_COUNT = 2;
  const queue = [...chunks];
  let globalSceneNumber = 0;

  const worker = async () => {
    while (queue.length > 0) {
      const chunk = queue.shift();
      if (!chunk) break;

      const result = await analyzeScriptChunk(chunk, onProgress);

      result.sceneCards.forEach(sc => {
        globalSceneNumber++;
        sc.sceneNumber = globalSceneNumber;
        allSceneCards.push(sc);
      });

      result.characters.forEach(c => { if (!characterMap.has(c.id)) characterMap.set(c.id, c); });
      result.locations.forEach(l => { if (!locationMap.has(l.id)) locationMap.set(l.id, l); });
      result.suggestedTimeContexts.forEach(tc => { if (!timeContextMap.has(tc.label)) timeContextMap.set(tc.label, tc); });

      onProgress?.(`✅ ${allSceneCards.length} sahne kartı oluşturuldu`);
      await new Promise(r => setTimeout(r, 300));
    }
  };

  await Promise.all(Array.from({ length: WORKER_COUNT }, () => worker()));

  return {
    sceneCards: allSceneCards,
    characters: Array.from(characterMap.values()),
    locations: Array.from(locationMap.values()),
    suggestedTimeContexts: Array.from(timeContextMap.values()),
  };
}