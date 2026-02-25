import type { Character, Location } from '@/types';

const ENTITY_EXTRACTION_PROMPT = `Sen bir görsel analiz AI'sın. Sahneden karakterleri ve mekanları çıkar.

🚫 YASAKLI (Asla extract etme):
- Yazı/metin nesneleri: "tabela", "kitap", "yazı", "duvar yazısı", "kelime", "ad", "adı"
- Soyut kavramlar: "ses dalgaları", "yankı", "soyut oluşum", "belirme", "dönüşüm", "evrim"
- Hareketli süreç ifadeleri: "-ması/-mesi/-ışı/-işi/-uşu/-üşü" ekleri

✅ ZORUNLU:
- İNSAN karakterler (fiziksel özellikler: yaş, ırk, kıyafet, saç)
- SOMUT mekanlar (mimari, doku, renk, malzeme)

🔄 YAZI/SOYUT SAHNELERİNİ YENİDEN YORUMLA (İNSANLARLA):

ÖRNEK 1:
INPUT: "Şehrin tabelasında 'Hive' adının belirmesi" veya "'Hive' adının belirginleşmesi"

❌ YANLIŞ:
{
  "characters": [],
  "locations": [{ "name": "Şehir Tabelası", "description": "Yazı var" }]
}

✅ DOĞRU (5 farklı kültürden insanla yeniden yorumla):
{
  "characters": [
    { "name": "Arap Tüccar", "description": "White turban, brown silk robe, long black beard, 40s, dark complexion" },
    { "name": "Çinli Yolcu", "description": "Blue silk kimono, bamboo hat, thin mustache, middle-aged" },
    { "name": "Afrikalı Sanatkâr", "description": "Orange-yellow-red colorful tunic, young man, short hair" },
    { "name": "Avrupalı Gezgin", "description": "Leather brown trousers, white linen shirt, blonde hair, blue eyes, 30s" },
    { "name": "Hintli Baharat Tüccarı", "description": "Orange turban, green silk vest, dark complexion, long black beard" }
  ],
  "locations": [
    { "name": "Şehir Meydanı Büyük Çeşmesi", "description": "Marble stone fountain in center, water flowing, 5 people from different cultures gathered around, colorful cloth stalls, stone paved floor" }
  ]
}

ÖRNEK 2:
INPUT: "'Hey vah' kelimesinin evrimi, ses dalgaları" veya "soyut bir isim oluşumu"

❌ YANLIŞ:
{
  "characters": [],
  "locations": [{ "name": "Soyut Mekan", "description": "Abstract concept" }]
}

✅ DOĞRU (Pazarda konuşan insanlarla somutlaştır):
{
  "characters": [
    { "name": "Yaşlı Hikaye Anlatıcısı", "description": "Long white beard, brown robe, mouth open speaking, 70s" },
    { "name": "Genç Dinleyici", "description": "Simple clothing, sitting, attentively listening, 20s" },
    { "name": "Kadın Öğretmen", "description": "Colorful headscarf, long dress, holding a book, middle-aged" }
  ],
  "locations": [
    { "name": "Şehir Pazarı", "description": "Open market, merchants frozen mid-gesture, colorful fabrics, stone walls, busy stalls" }
  ]
}

ÖRNEK 3:
INPUT: "Farklı dillerde 'Hey vah' kelimesinin evrimi, yazılı metinler"

❌ YANLIŞ:
{
  "characters": [],
  "locations": [{ "name": "Kütüphane", "description": "Books present" }]
}

✅ DOĞRU (İnsanlarla yeniden yorumla):
{
  "characters": [
    { "name": "Yaşlı Âlim", "description": "Long white beard, brown robe, holding a book" },
    { "name": "Genç Öğrenci", "description": "Simple clothing, holding notepad, listening" },
    { "name": "Kadın Hikaye Anlatıcısı", "description": "Colorful headscarf, elderly, children around her" }
  ],
  "locations": [
    { "name": "Eski Kütüphane", "description": "Wooden shelves, old bound books, candlelight, stone walls" }
  ]
}

KURALLAR:
- Sadece JSON döndür
- Karakterlerin görsel tanımı prompt için kullanılacak (İngilizce)
- Mekanlar için atmosfer ve stil önemli (İngilizce)
- Yazı/metin/soyut içeren sahneleri MUTLAKA insanlar ve somut mekanlarla yeniden yorumla

SAHNE METNİ:
`;

export async function extractEntitiesFromScene(
  sceneText: string,
  apiKey: string,
  model: string
): Promise<{ characters: Character[]; locations: Location[] }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: ENTITY_EXTRACTION_PROMPT + sceneText }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        response_mime_type: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Entity extraction failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

  let parsed: { characters?: { name: string; description: string }[]; locations?: { name: string; description: string }[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  }

  const characters: Character[] = (parsed.characters || []).map((c) => ({
    id: `char-${c.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
    name: c.name,
    description: c.description,
  }));

  const locations: Location[] = (parsed.locations || []).map((l) => ({
    id: `loc-${l.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
    name: l.name,
    description: l.description,
  }));

  return { characters, locations };
}
