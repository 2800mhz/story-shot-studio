import type { Character, Location } from '@/types';

const ENTITY_EXTRACTION_PROMPT = `Sen bir metin analiz AI'sın. Aşağıdaki sahne metnini analiz et ve karakterler ile mekanları çıkar.

JSON ÇIKTI (SADECE JSON DÖN, başka hiçbir şey yazma):
{
  "characters": [
    {
      "name": "Karakter İsmi (Türkçe)",
      "description": "Detailed English visual description for AI image generation: age, clothing, physical features, distinctive characteristics"
    }
  ],
  "locations": [
    {
      "name": "Mekan İsmi (Türkçe)",
      "description": "Detailed English visual description: architectural style, atmosphere, color palette, lighting, time period"
    }
  ]
}

KURALLAR:
- Sadece JSON döndür
- Karakterlerin görsel tanımı prompt için kullanılacak (İngilizce)
- Mekanlar için atmosfer ve stil önemli (İngilizce)
- Metinde açıkça belirtilmeyen karakterleri/mekanları ekleme

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
