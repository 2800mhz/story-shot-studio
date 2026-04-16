// Motion Prompt Generator — Gemini API integration
import { aiProvider } from './aiProvider';
import { parseMotionPromptResponse, type MotionPromptAnalysis } from './motionPromptParser';

const SYSTEM_INSTRUCTION = `You are an AI video director that must return STRICT JSON only.

You are using a universal IMG2VIDEO MASTER PROMPT strategy.
Analyze the uploaded image and produce a motion direction that is simple, stable, and suitable for AI video generation.
Prioritize continuity if previous shot context is provided.

FORBIDDEN motions:
- Flowing water, splashing, liquid dynamics
- Fire or flame movement
- Fabric billowing or wind effects
- Crowds or many simultaneous figures moving
- Fast camera movements
- Dramatic facial expression changes
- Animals running or turning

PREFERRED motions:
- Slow camera push-in or pull-back (3-6 second arc)
- Static lock-off with micro-movement (breathing, dust settling)
- Single figure slow deliberate action
- Drone: slow vertical descend or ascend only
- Rack focus foreground to background
- Light shift: shadow slowly crossing a surface

Return EXACTLY one JSON object with this schema and no extra keys:
{
  "shortDraft": "Very short scene summary (5-20 words)",
  "cameraMotion": "Pan Right",
  "cinematicStyle": "Handheld",
  "intensity": "Medium",
  "focalPoint": "description of what to focus on",
  "reasoning": "why the AI chose this"
}

Return strict JSON only. Do not wrap output in markdown code fences.`;

export interface MotionPromptResult {
  imageFile: File;
  prompt: string;
  error?: string;
}

export async function generateMotionPrompt(
  imageFile: File,
  model: string,
  globalNote: string,
  perImageNote: string,
  previousMotionContext?: string,
): Promise<MotionPromptAnalysis> {
  const base64 = await fileToBase64(imageFile);
  const mimeType = imageFile.type || 'image/jpeg';

  let userText = 'UNIVERSAL IMG2VIDEO MASTER PROMPT MODE ACTIVE.\n\n';
  if (globalNote.trim()) userText += `GLOBAL DIRECTOR NOTE:\n${globalNote.trim()}\n\n`;
  if (perImageNote.trim()) userText += `IMAGE-SPECIFIC NOTE:\n${perImageNote.trim()}\n\n`;
  if (previousMotionContext?.trim()) {
    userText += `PREVIOUS SHOT CONTEXT:\n${previousMotionContext.trim()}\n\n`;
  }
  userText += `Analyze this image and return STRICT JSON only. Follow the schema exactly.`;

  aiProvider.setModel(model);

  const images = [
    { inlineData: { mimeType, data: base64 } }
  ];

  try {
    const result = await aiProvider.generateContent(
      userText,
      SYSTEM_INSTRUCTION,
      { operationType: 'motion_prompt', images }
    );
    return parseMotionPromptResponse(result);
  } catch (err: unknown) {
    throw new Error(getErrorMessage(err) || 'Error generating motion prompt');
  }
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return '';
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
