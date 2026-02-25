import type { Character, Location } from '@/types';

const ENTITY_EXTRACTION_PROMPT = `Sen bir görsel analiz AI'sın. Sahneden karakterleri ve mekanları çıkar.

🚫 YASAKLI:
- Yazı/metin nesneleri: "tabela", "kitap", "yazı", "duvar yazısı"
- Soyut kavramlar: "umut", "değişim", "ses", "rüzgar"

✅ ZORUNLU:
- İNSAN karakterler (fiziksel özellikler: yaş, ırk, kıyafet, saç)
- SOMUT mekanlar (mimari, doku, renk, malzeme)

🔄 YAZI SAHNELERİNİ YENİDEN YORUMLA:

ÖRNEK 1:
INPUT: "Şehrin tabelasında 'Hive' adının belirmesi"

❌ YANLIŞ:
{
  "characters": [],
  "locations": [{ "name": "Şehir Tabelası", "description": "Yazı var" }]
}

✅ DOĞRU (İnsanlarla yeniden yorumla):
{
  "characters": [
    { "name": "Arap Tüccar", "description": "White turban, brown robe, long beard, 40s" },
    { "name": "Çinli Yolcu", "description": "Silk kimono, bamboo hat, thin mustache" },
    { "name": "Afrikalı Sanatkâr", "description": "Colorful tunic, young man" },
    { "name": "Avrupalı Gezgin", "description": "Leather trousers, white shirt, blonde hair" },
    { "name": "Hintli Baharat Tüccarı", "description": "Orange turban, green vest, dark complexion" }
  ],
  "locations": [
    { "name": "Şehir Meydanı Büyük Çeşmesi", "description": "Marble stone fountain, water flowing, 5 people from different cultures gathered around, colorful stalls" }
  ]
}

ÖRNEK 2:
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
- Yazı/metin içeren sahneleri insanlar ve mekanlarla yeniden yorumla

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
