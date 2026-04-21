export interface ParsedEpisode {
  id: string;
  title: string;
  startIndex: number;
  endIndex: number;
  parentId: string | null;
  level: number;
}

const COUNTRY_KEYWORDS = [
  'ÖZBEKİSTAN', 'KIRGIZİSTAN', 'TÜRKMENİSTAN', 'KAZAKİSTAN', 'TACİKİSTAN',
];

function isCountryHeader(line: string): boolean {
  const upper = line.toUpperCase();
  return COUNTRY_KEYWORDS.some(kw => upper.includes(kw));
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
