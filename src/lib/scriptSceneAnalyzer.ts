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
- visualNote: Kameranın tam olarak ne gördüğü (max 10 kelime, somut, Türkçe)
- V.O. bağlamı varsa karakterleri/mekanları tespit et

KARAKTER STANDARDI (ANTROPOLOJİK DOĞRULUK — DETAYLI):
Her karakter için İngilizce visualDescription yazarken şu sırayı takip et:

1. FİZİKSEL ANTROPOLOJİ TİPİ:
   Turanid, Mongoloid, Alpinid, Mediterranid vb.
   Örn: "Turanid-Mongoloid phenotype"

2. YÜZ YAPISI:
   - Kafa şekli (broad/narrow/round)
   - Elmacık kemikleri (prominent/flat/high)
   - Göz (narrow/wide, epicanthic fold varsa belirt)
   - Burun (low/high bridge, wide/narrow nostrils)
   - Çene (strong/soft/square)

3. CİLT:
   - Ton (bronze/olive/dark/light)
   - Doku (weathered/smooth/lined)
   - Özel detay (sun-damaged, steppe exposure vb.)

4. SAÇ (KRİTİK — TUTARLILIK İÇİN):
   - Renk (black/dark brown/grey vb.)
   - Uzunluk (short/medium/long/very long)
   - Stil (braided/loose/tied/shaved sides)
   - Durum (clean/matted/oiled vb.)

5. SAKAL/BIYIK (KRİTİK):
   - Var mı yok mu (clean-shaven/stubble/full beard)
   - Uzunluk ve stil (short beard/long beard/mustache only)
   - Renk ve doku

6. YAŞ & BEDEN:
   - Yaş aralığı (örn: mid-40s to 50s)
   - Beden tipi (lean/muscular/stocky/thin)
   - Boy (tall/medium/short)

7. KIYAFETLERİN TAMAMI:
   - Her parça ayrı ayrı (üst, alt, ayakkabı, başlık, aksesuar)
   - Kumaş tipi, renk, desen
   - Dönem ve kültürel doğruluk

8. SONUNDA MUTLAKA:
   "photorealistic, cinematic lighting, documentary style, anthropologically accurate, based on period manuscripts, NOT film or television adaptations"

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
      "ethnicity": "Turanid-Mongoloid",
      "physicalFeatures": "broad flat face, prominent cheekbones, narrow epicanthic eyes, low nasal bridge, bronze-olive skin, deep facial lines",
      "hair": "black, long, braided",
      "beard": "short dark beard",
      "clothing": "deer-hide shamanic coat with bone/metal talismans, feathered headpiece",
      "visualDescription": "..."
    }
  ],
  "locations": [
    {
      "name": "Ötüken Düzlüğü",
      "visualDescription": "..."
    }
  ],
  "timeContexts": [
    {
      "label": "Ötüken - Gece",
      "era": "Göktürk Dönemi",
      "timeOfDay": "gece",
      "lighting": "moonlit steppe, deep blue sky, stars appearing",
      "historicalNotes": "6th-8th century Central Asian Turkic steppe"
    }
  ]
}

KRİTİK: Her sahnede timeContextLabel dolu olmalı.
KRİTİK: Her character için "age", "ethnicity", "clothing", "physicalFeatures" ve "visualDescription" alanlarını AYRI AYRI dolu string olarak üret.
Bu bilgileri yalnızca visualDescription içine gömme; her alan explicit dolu olmalı.
KRİTİK: Bu alanlarda boş string, sadece boşluk, "unknown", "n/a", "belirsiz" kullanma. Metinden açık değilse bile görsel olarak makul bir tahminle doldur.
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
    `${s.perdeNo} — ${s.perdeTitle}\nGÖRÜNTÜ:\n${s.visualBlock}\n${s.voContext ? `V.O. BAĞLAM: ${s.voContext}` : ''}`
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
    timeOfDay: tc.timeOfDay,
    lighting: tc.lighting,
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
