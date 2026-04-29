function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function trimParagraphs(text: string, maxParagraphs = 2): string[] {
  return text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, maxParagraphs);
}

export function resolveLocalAgentQuery(args: {
  command: string;
  episodePrompt?: string;
  masterPrompt?: string;
}) {
  const normalizedCommand = normalizeText(args.command);

  if (/^(merhaba|selam|hey|yo|naber|nasilsin|nasılsın|kimsin|sen kimsin|ne yapiyorsun|ne yapıyorsun)[.!? ]*$/.test(normalizedCommand)) {
    return {
      message: 'Buradayım. Sahne, prompt, karakter ya da görsel stil tarafında neyi değiştirmemi istersen direkt söyleyebilirsin.',
      details: ['Kısa karşılama yerelden üretildi', 'LLM çağrısı yapılmadı'],
    };
  }

  if (/neler yapabili(rsin|yon)|ne yapabili(rsin|yon)|yardim|help/.test(normalizedCommand)) {
    return {
      message: [
        'Burada en çok işime yarayan şeyler doğrudan düzenlemeler:',
        '- sahne notu ve görsel not güncelleme',
        '- prompt revizyonu ve pinned prompt seçimi',
        '- karakter görünüşü, kıyafet, saç-sakal gibi değişiklikler',
        '- mekan, referans ve bağlı sahne etkilerini yayma',
        '',
        'Bana hedefi söylemen yeter: “sahne 12 daha doğal olsun” ya da “yaşlı karakterin kıyafeti koyulaşsın” gibi.',
      ].join('\n'),
      details: ['Yerel yardım cevabı üretildi', 'LLM çağrısı yapılmadı'],
    };
  }

  if (/gorsel stil|gorsel brief|stil brief|stilimiz ne|style brief|episode prompt/.test(normalizedCommand)) {
    const source = (args.episodePrompt || args.masterPrompt || '').trim();
    if (!source) {
      return {
        message: 'Şu an kayıtlı bir görsel stil brief’i göremiyorum. İstersen birlikte yeni bir yön kurabiliriz.',
        details: ['Kayıtlı style brief bulunamadı', 'LLM çağrısı yapılmadı'],
      };
    }

    const paragraphs = trimParagraphs(source, 2);
    return {
      message: [
        'Şu an aktif görsel brief kabaca bunu söylüyor:',
        ...paragraphs,
      ].join('\n\n'),
      details: ['Episode/master brief yerel olarak okundu', 'LLM çağrısı yapılmadı'],
    };
  }

  return null;
}
