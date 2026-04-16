// Motion Prompt Generator — Gemini API integration
import { aiProvider } from './aiProvider';
import { parseMotionPromptResponse, type MotionPromptAnalysis } from './motionPromptParser';

const SYSTEM_INSTRUCTION = `You are an elite img2video prompt strategist and motion director.

Analyze the uploaded image and produce a concise draft that can be expanded into a long final prompt later.
This instruction is universal and must work for any uploaded image (subject, era, style, lighting, composition).
Prioritize continuity if previous shot context is provided.

GOALS:
- infer scene content in plain language
- propose coherent camera movement
- keep movement physically plausible
- avoid artifact-prone or chaotic motion

OUTPUT RULES:
- return STRICT JSON only
- do not use markdown fences
- no extra keys beyond schema

Return EXACTLY one JSON object with this schema:
{
  "shortDraft": "brief scene draft summary (5-20 words)",
  "cameraMotion": "Pan Right",
  "cinematicStyle": "Handheld",
  "intensity": "Medium",
  "focalPoint": "description of what to focus on",
  "reasoning": "why the AI chose this"
}`;

export async function generateMotionPrompt(
  imageFile: File,
  model: string,
  globalNote: string,
  perImageNote: string,
  previousMotionContext?: string,
): Promise<MotionPromptAnalysis> {
  const base64 = await fileToBase64(imageFile);
  const mimeType = imageFile.type || 'image/jpeg';

  let userText = `TASK:\nAnalyze this uploaded image and return strict JSON using the required schema.\n\n`;
  if (globalNote.trim()) userText += `GLOBAL DIRECTOR NOTE:\n${globalNote.trim()}\n\n`;
  if (perImageNote.trim()) userText += `IMAGE-SPECIFIC NOTE:\n${perImageNote.trim()}\n\n`;
  if (previousMotionContext?.trim()) {
    userText += `PREVIOUS SHOT CONTEXT:\n${previousMotionContext.trim()}\n\n`;
  }
  userText += `Draft short description + camera settings only.`;

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
