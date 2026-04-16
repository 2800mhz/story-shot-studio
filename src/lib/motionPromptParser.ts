export interface MotionPromptAnalysis {
  shortDraft: string;
  cameraMotion: string;
  cinematicStyle: string;
  intensity: 'Low' | 'Medium' | 'High';
  focalPoint: string;
  reasoning: string;
}

const DEFAULT_MOTION_ANALYSIS: MotionPromptAnalysis = {
  shortDraft: 'Main subject framed in a stable documentary composition.',
  cameraMotion: 'Static',
  cinematicStyle: 'Steadycam',
  intensity: 'Medium',
  focalPoint: 'main subject',
  reasoning: 'Fallback values were used due to invalid model output.',
};

export function parseMotionPromptResponse(raw: string): MotionPromptAnalysis {
  const cleaned = stripMarkdownCodeBlocks(raw);
  const parsed = safeParseJsonObject(cleaned);

  return {
    shortDraft: toSafeText(parsed?.shortDraft, DEFAULT_MOTION_ANALYSIS.shortDraft),
    cameraMotion: toSafeText(parsed?.cameraMotion, DEFAULT_MOTION_ANALYSIS.cameraMotion),
    cinematicStyle: toSafeText(parsed?.cinematicStyle, DEFAULT_MOTION_ANALYSIS.cinematicStyle),
    intensity: toIntensity(parsed?.intensity),
    focalPoint: toSafeText(parsed?.focalPoint, DEFAULT_MOTION_ANALYSIS.focalPoint),
    reasoning: toSafeText(parsed?.reasoning, DEFAULT_MOTION_ANALYSIS.reasoning),
  };
}

function stripMarkdownCodeBlocks(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) return trimmed;
  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function safeParseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const json = JSON.parse(text);
    if (json && typeof json === 'object') return json as Record<string, unknown>;
  } catch {
    // fallback to first object block in text
  }

  const match = text.match(/\{[\s\S]*?\}/);
  if (!match) return null;

  try {
    const json = JSON.parse(match[0]);
    if (json && typeof json === 'object') return json as Record<string, unknown>;
  } catch {
    return null;
  }

  return null;
}

function toSafeText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function toIntensity(value: unknown): MotionPromptAnalysis['intensity'] {
  if (value === 'Low' || value === 'Medium' || value === 'High') return value;
  return DEFAULT_MOTION_ANALYSIS.intensity;
}
