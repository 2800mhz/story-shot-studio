import type { SceneCard, Character, Location, TimeContext } from '@/types';
import { aiProvider } from './aiProvider';
import type { ScriptChunk } from './scriptParser';

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

HEDEF: Her GÖRÜNTÜ bloğundan ortalama 2-3 sahne kartı çıkar.
Bir bloktan 1 sahne çıkıyorsa az bölüyorsun.
5+ sahne çıkıyorsa fazla bölüyorsun, birleştir.

HER SAHNE İÇİN:
- text: O sahnenin Türkçe kısa özeti (5-10 kelime)
- visualNote: Kameranın tam olarak ne gördüğü (max 10 kelime, somut, Türkçe)
- V.O. bağlamı varsa karakterleri/mekanları tespit et

KARAKTER STANDARDI (ANTROPOLOJİK DOĞRULUK):
- Sadece fiziksel olarak GÖRÜNEN kişiler
- Max 30 kelimelik İngilizce visualDescription
- ASLA film/dizi adaptasyonlarına dayandırma
- Dönem, etnisite, kıyafet akademik doğrulukla

MEKAN STANDARDI:
- Sadece fiziksel, fotoğraflanabilir mekanlar
- Max 30 kelimelik İngilizce visualDescription

JSON ÇIKTI:
{
  "scenes": [
    {
      "perdeNo": "PERDE 01",
      "sceneNumber": 1,
      "text": "Çivit mavisi gökyüzü gece başlangıcında",
      "visualNote": "Boş çivit mavisi gökyüzü yıldızsız",
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
  const chunkText = chunk.scenes.map(s =>
    `${s.perdeNo} — ${s.perdeTitle}\nGÖRÜNTÜ:\n${s.visualBlock}\n${s.voContext ? `V.O. BAĞLAM: ${s.voContext}` : ''}`
  ).join('\n\n---\n\n');

  onProgress?.(`🎬 Chunk ${chunk.chunkIndex + 1}/${chunk.totalChunks} analiz ediliyor...`);

  const content = await aiProvider.generateContent(chunkText, SCRIPT_ANALYSIS_SYSTEM_PROMPT);

  let parsed: {
    scenes?: Array<{
      perdeNo?: string;
      sceneNumber?: number;
      text?: string;
      visualNote?: string;
      characterNames?: string[];
      locationNames?: string[];
      timeContextLabel?: string;
    }>;
    characters?: Array<{ name?: string; role?: string; isCrowd?: boolean; visualDescription?: string }>;
    locations?: Array<{ name?: string; visualDescription?: string }>;
    timeContexts?: Array<{
      label?: string;
      era?: string;
      timeOfDay?: string;
      lighting?: string;
      historicalNotes?: string;
    }>;
  };
  try {
    const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(clean);
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
      characterMap.set(id, { id, name: c.name, role: c.role, isCrowd: c.isCrowd ?? false, visualDescription: c.visualDescription });
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
