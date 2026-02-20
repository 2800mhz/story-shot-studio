const CONTEXT_MAP: Record<string, string> = {
  'KÖHNEÜRGENÇ': '13th century Konye-Urgench, Turkmenistan, Khwarezmian architecture, Mongol invasion period',
  'ÜRGENÇ': '13th century Ürgenç, Turkmenistan, Khwarezmian Islamic city',
  'HİVE': '12th-13th century Khiva, Kyzylkum steppe, Silk Road caravan, Transoxiana',
  'BUHARA': '10th century Bukhara, Samanid dynasty, Central Asian Islamic architecture',
  'ATABEYİT': '1938-1991 Soviet-era Kyrgyzstan, mass grave memorial site',
  'TALAS': '10th century Talas, Kyrgyzstan, Karakhanid Turkic steppe',
  'ARAL': 'Historical Aral Sea, Central Asian steppe lake, traditional fishing communities',
  'SEMERKANT': '10th century Samarkand, Samanid era, Islamic madrasa',
  'SAVRAN': '14th-15th century Savran, Kazakhstan steppe, Timurid era, clay architecture',
  'OŞ': '15th century Osh, Kyrgyzstan, Sulayman Mountain, Babur era',
  'SÜLEYMAN': '15th century Osh, Kyrgyzstan, Sulayman Mountain',
  'TAŞRABAT': '15th century Tash Rabat caravanserai, Kyrgyzstan mountain pass',
  'ÖZBEKİSTAN': 'Historical Uzbekistan, Central Asian steppes and oasis cities, Silk Road heritage',
  'KIRGIZİSTAN': 'Historical Kyrgyzstan, mountain nomadic culture, yurt camps, alpine lakes',
  'TÜRKMENİSTAN': 'Historical Turkmenistan, Karakum desert, ancient Merv, Parthian heritage',
  'KAZAKİSTAN': 'Historical Kazakhstan, vast steppes, nomadic Kazakh culture, eagle hunters',
  'TACİKİSTAN': 'Historical Tajikistan, Pamir mountains, Persian-Tajik culture, ancient Sogdian heritage',
};

// Country-level keywords that define top-level (parent) episodes
const COUNTRY_KEYWORDS = [
  'ÖZBEKİSTAN', 'KIRGIZİSTAN', 'TÜRKMENİSTAN', 'KAZAKİSTAN', 'TACİKİSTAN',
];

export function detectContext(episodeTitle: string): string {
  const upper = episodeTitle.toUpperCase();
  for (const [key, context] of Object.entries(CONTEXT_MAP)) {
    if (upper.includes(key)) {
      return context;
    }
  }
  return 'Central Asian historical setting, Silk Road region';
}

function isCountryHeader(line: string): boolean {
  const upper = line.toUpperCase();
  return COUNTRY_KEYWORDS.some(kw => upper.includes(kw));
}

export interface ParsedEpisode {
  id: string;
  title: string;
  startIndex: number;
  endIndex: number;
  parentId: string | null;
  level: number;
}

export function parseEpisodes(text: string): ParsedEpisode[] {
  const episodes: ParsedEpisode[] = [];
  const lines = text.split('\n');
  let currentIndex = 0;
  let currentParentId: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const isHeader =
      (line.length > 3 && line.length < 100 && line === line.toUpperCase() && /[A-ZÇĞİÖŞÜ]/.test(line)) ||
      /^(BÖLÜM|EPISODE|ÖZBEKİSTAN|KIRGIZİSTAN|TÜRKMENİSTAN|KAZAKİSTAN|TACİKİSTAN)/i.test(line);

    if (isHeader && line.length > 2) {
      if (episodes.length > 0) {
        episodes[episodes.length - 1].endIndex = currentIndex - 1;
      }

      const isCountry = isCountryHeader(line);
      const epId = `ep-${episodes.length}`;

      if (isCountry) {
        currentParentId = epId;
        episodes.push({
          id: epId,
          title: line,
          startIndex: currentIndex,
          endIndex: text.length,
          parentId: null,
          level: 0,
        });
      } else {
        episodes.push({
          id: epId,
          title: line,
          startIndex: currentIndex,
          endIndex: text.length,
          parentId: currentParentId,
          level: currentParentId ? 1 : 0,
        });
      }
    }
    currentIndex += lines[i].length + 1;
  }

  if (episodes.length === 0) {
    episodes.push({
      id: 'ep-0',
      title: 'Belge',
      startIndex: 0,
      endIndex: text.length,
      parentId: null,
      level: 0,
    });
  }

  return episodes;
}
