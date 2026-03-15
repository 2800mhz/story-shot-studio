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
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

export function parseScriptText(rawText: string): ScriptScene[] {
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
    if (/^PERDE \d+/.test(line)) {
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

    if (/^(GÖRÜNTÜ|SON GÖRÜNTÜ)/.test(line) && line.includes(':')) {
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

    if (/ANLATICI \(V\.O\.\)|ANLATICI V\.O\./i.test(line)) {
      inVO = true;
      inVisual = false;
      continue;
    }

    if (/\(V\.O\.\)/.test(line) || /GÖK TENGRİ/.test(line)) {
      inVO = true;
      inVisual = false;
      continue;
    }

    if (shouldSkip(line)) continue;

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

export function chunkScriptScenes(scenes: ScriptScene[], perdePerChunk = 6): ScriptChunk[] {
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
