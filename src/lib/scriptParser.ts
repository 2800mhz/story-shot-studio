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
  const scenes: ScriptScene[] = [];

  let currentPerde = '';
  let currentTitle = '';
  let currentVisual = '';
  let currentVO = '';
  let inVisual = false;
  let inVO = false;

  const SKIP_PATTERNS = [
    /^SES:/i, /SESİ \(V\.O\.\)/i, /^FADE TO/i, /^CUT TO/i,
    /^\(/, /^MÜZİK/i, /^SESİN /i
  ];

  const shouldSkip = (line: string) => SKIP_PATTERNS.some(p => p.test(line));

  for (const line of lines) {
    if (/^PERDE \d+/.test(line)) {
      if (currentVisual.trim()) {
        scenes.push({
          perdeNo: currentPerde,
          perdeTitle: currentTitle,
          visualBlock: currentVisual.trim(),
          voContext: currentVO.trim()
        });
      }
      currentPerde = line;
      currentTitle = '';
      currentVisual = '';
      currentVO = '';
      inVisual = false;
      inVO = false;
      continue;
    }

    if (line === 'GÖRÜNTÜ:' || line === 'SON GÖRÜNTÜ:') {
      if (currentVisual.trim()) {
        scenes.push({
          perdeNo: currentPerde,
          perdeTitle: currentTitle,
          visualBlock: currentVisual.trim(),
          voContext: currentVO.trim()
        });
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
  }

  if (currentVisual.trim()) {
    scenes.push({
      perdeNo: currentPerde,
      perdeTitle: currentTitle,
      visualBlock: currentVisual.trim(),
      voContext: currentVO.trim()
    });
  }

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
