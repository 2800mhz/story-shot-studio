import * as mammoth from 'mammoth';

export interface ScriptScene {
  perdeNo: string;
  perdeTitle: string;
  visualBlock: string;
  voContext: string;
}

export interface ScriptChunk {
  scenes: ScriptScene[];
  chunkIndex: number;
  totalChunks: number;
}

export async function parseDocxFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  
  // Custom options to capture highlighting if possible via style map 
  // or simply use convertToHtml which is richer than extractRawText
  const options = {
    styleMap: [
      "u => u",
      "strike => del",
      "r[highlight='yellow'] => mark",
      "r[highlight='green'] => mark",
      "r[highlight='cyan'] => mark",
      "r[highlight='magenta'] => mark",
      "r[highlight='blue'] => mark",
      "r[highlight='red'] => mark",
      "r[highlight='darkYellow'] => mark",
      "r[highlight='darkBlue'] => mark",
      "r[highlight='darkCyan'] => mark",
      "r[highlight='darkGreen'] => mark",
      "r[highlight='darkMagenta'] => mark",
      "r[highlight='darkRed'] => mark",
      "r[highlight='black'] => mark"
    ]
  };

  const result = await mammoth.convertToHtml({ arrayBuffer }, options);
  
  let html = result.value;
  // Convert basic paragraph structure to line breaks while keeping internal tags
  // We use a broader regex to catch <p> tags with attributes if any
  html = html.replace(/<p[^>]*>/g, '').replace(/<\/p>/g, '\n');
  
  return html;
}

export function parseScriptText(rawText: string): ScriptScene[] {
  // rawText now contains HTML tags like <mark> or <strong>
  // We split by newline (which we added in parseDocxFile)
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l);
  const perdeLines = lines.filter(l => l.includes('PERDE'));
  console.log('🎬 PERDE içeren satırlar:', perdeLines.slice(0, 20));
  console.log('🎬 Toplam PERDE satırı:', perdeLines.length);

  const matchedPerdes = lines.filter(l => /^PERDE \d+/.test(l));
  console.log('✅ Regex ile eşleşen PERDE:', matchedPerdes.length);

  const scenes: ScriptScene[] = [];

  let currentPerde = '';
  let currentTitle = '';
  let currentVisual = '';
  let currentVO = '';
  let inVisual = false;
  let inVO = false;

  let perdeCount = 0;
  let pushCount = 0;
  let goruntuCount = 0;

  const SKIP_PATTERNS = [
    /^SES:/i, /SESİ \(V\.O\.\)/i, /^FADE TO/i, /^CUT TO/i,
    /^\(/, /^MÜZİK/i, /^SESİN /i
  ];

  const shouldSkip = (line: string) => SKIP_PATTERNS.some(p => p.test(line));

  for (const line of lines) {
    // We use a helper to strip tags for regex matching but keep original line for content
    const cleanLine = line.replace(/<[^>]*>/g, '').trim();

    if (/^PERDE \d+/.test(cleanLine)) {
      perdeCount++;
      console.log(`PERDE bulundu #${perdeCount}: "${line}" — mevcut visual: "${currentVisual.substring(0, 50)}"`);
      
      if (currentPerde) {
        if (currentVisual.trim()) {
          scenes.push({
            perdeNo: currentPerde,
            perdeTitle: currentTitle,
            visualBlock: currentVisual.trim(),
            voContext: currentVO.trim()
          });
          pushCount++;
          console.log(`Push #${pushCount} (PERDE değişiminde): ${currentPerde}, visual uzunluk: ${currentVisual.length}`);
        }
      }
      currentPerde = line;
      currentTitle = '';
      currentVisual = '';
      currentVO = '';
      inVisual = false;
      inVO = false;
      continue;
    }

    if (/^(GÖRÜNTÜ|SON GÖRÜNTÜ)/.test(cleanLine) && cleanLine.includes(':')) {
      goruntuCount++;
      console.log(`GÖRÜNTÜ bloğu #${goruntuCount}: ${currentPerde}`);
      
      if (currentVisual.trim()) {
        scenes.push({
          perdeNo: currentPerde,
          perdeTitle: currentTitle,
          visualBlock: currentVisual.trim(),
          voContext: currentVO.trim()
        });
        pushCount++;
        console.log(`Push #${pushCount} (GÖRÜNTÜ bloğunda): ${currentPerde}, visual uzunluk: ${currentVisual.length}`);
        currentVisual = '';
        currentVO = '';
      }
      inVisual = true;
      inVO = false;
      continue;
    }

    if (/ANLATICI \(V\.O\.\)|ANLATICI V\.O\./i.test(cleanLine)) {
      inVO = true;
      inVisual = false;
      continue;
    }

    if (/\(V\.O\.\)/.test(cleanLine) || /GÖK TENGRİ/.test(cleanLine)) {
      inVO = true;
      inVisual = false;
      continue;
    }

    if (shouldSkip(cleanLine)) continue;

    if (currentPerde && !currentTitle && !inVisual && !inVO) {
      currentTitle = line;
      continue;
    }

    if (inVisual) currentVisual += line + '\n';
    else if (inVO) currentVO += line + '\n';
    else if (currentPerde && currentTitle) {
      // GÖRÜNTÜ: başlığı olmayan perde — içerik implicit olarak visual sayılır
      console.log(`📌 Implicit visual: ${currentPerde} — "${line.substring(0, 60)}"`);
      inVisual = true;
      currentVisual += line + '\n';
    }
  }

  if (currentPerde && currentVisual.trim()) {
    scenes.push({
      perdeNo: currentPerde,
      perdeTitle: currentTitle,
      visualBlock: currentVisual.trim(),
      voContext: currentVO.trim()
    });
    pushCount++;
    console.log(`Push #${pushCount} (Dosya sonunda): ${currentPerde}, visual uzunluk: ${currentVisual.length}`);
  }

  console.log('🏁 Kaydedilen benzersiz PERDE listesi:', [...new Set(scenes.map(s => s.perdeNo))]);
  return scenes;
}

export function chunkScriptScenes(scenes: ScriptScene[], perdePerChunk = 8): ScriptChunk[] {
  const chunks: ScriptChunk[] = [];
  for (let i = 0; i < scenes.length; i += perdePerChunk) {
    chunks.push({
      scenes: scenes.slice(i, i + perdePerChunk),
      chunkIndex: Math.floor(i / perdePerChunk),
      totalChunks: Math.ceil(scenes.length / perdePerChunk)
    });
  }
  return chunks;
}
