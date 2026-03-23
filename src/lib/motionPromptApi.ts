// Motion Prompt Generator — Gemini API integration

const PROJECT_CONTEXTS: Record<string, string> = {
  hive: `HISTORICAL CONTEXT: Central Asian Silk Road, Khwarezm Empire, 10-12th century.
PHENOTYPE: Turanid-Iranid Central Asian features — broad faces, almond eyes, olive-bronze skin.
CLOTHING: Richly embroidered chapan robes, turbans, leather boots, silk garments.
ENVIRONMENT: Transoxiana steppe, caravanserai, desert oases, Bactrian camels, dusty trade routes.
AESTHETIC: Werner Herzog documentary realism — unflinching, observational, grand landscape scale.
ARCHITECTURE: Islamic geometric tilework, mudbrick, domed bazaars, minaret silhouettes.`,

  atabeyit: `HISTORICAL CONTEXT: Ata-Beyit National Memorial Complex, Chong-Tash village, Kyrgyzstan.
LAYERS: 1938 Stalinist purge (symbolic/indirect only — NO explicit violence), 1991 discovery period, present-day memorial.
PHENOTYPE: Kyrgyz Central Asian Turkic — broad face, high cheekbones, epicanthic fold, dark almond eyes, bronze-olive skin.
ENVIRONMENT: Chuy Valley steppe, Tian Shan mountain silhouette on southern horizon, dry golden grass, overcast high-altitude light.
AESTHETIC: Andrei Tarkovsky contemplative framing — slow, meditative, objects as memory vessels. Elem Klimov shadow and implied horror. Sebastião Salgado dignified grief portraiture.
MATERIAL CULTURE: 1938 — NKVD dark wool greatcoats, peaked caps; Kyrgyz intellectuals in Soviet-era collarless shirts, kalpak hats. 1991 — post-Soviet civilian wool coats, headscarves.`,

  general: `General documentary context. Analyze the image content directly and generate appropriate motion.`,
};

const SYSTEM_INSTRUCTION = `You are a specialist AI video motion director. Analyze historical documentary still images and write precise, minimal motion prompts for AI video generation (Google Flow, Runway, Kling).

RULES:
1. Analyze EXACTLY what is in the image
2. Motion must be SIMPLE, PREDICTABLE, stable for AI video synthesis
3. Motion feels like natural continuation of the image
4. Start directly with motion description — no preamble, no title

FORBIDDEN motions (AI video fails on these):
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

Write ONLY the motion prompt. Nothing else.`;

import { aiProvider } from './aiProvider';

export interface MotionPromptResult {
  imageFile: File;
  prompt: string;
  error?: string;
}

export async function generateMotionPrompt(
  imageFile: File,
  model: string,
  projectContext: string,
  globalNote: string,
  perImageNote: string,
): Promise<string> {
  const base64 = await fileToBase64(imageFile);
  const mimeType = imageFile.type || 'image/jpeg';

  const contextText = PROJECT_CONTEXTS[projectContext] || PROJECT_CONTEXTS.general;

  let userText = `PROJECT CONTEXT:\n${contextText}\n\n`;
  if (globalNote.trim()) userText += `GLOBAL DIRECTOR NOTE:\n${globalNote.trim()}\n\n`;
  if (perImageNote.trim()) userText += `IMAGE-SPECIFIC NOTE:\n${perImageNote.trim()}\n\n`;
  userText += `Analyze this image and write a single motion prompt for AI video generation. Write ONLY the prompt text, nothing else.`;

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
    return result.trim();
  } catch (err: any) {
    throw new Error(err.message || 'Error generating motion prompt');
  }
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
