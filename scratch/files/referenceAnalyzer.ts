/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  STORY SHOT STUDIO — REFERENCE IMAGE ANALYSER  v3.0                    ║
 * ║  Analyses uploaded reference images and assigns them to relevant scenes ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { aiProvider } from './aiProvider';
import type { SceneCard } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// § 1  SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────────────

const REFERENCE_ANALYSIS_SYSTEM_PROMPT = `You are an expert film director and continuity supervisor.
You receive a reference image and a list of scenes from a documentary or film project.

Your task: Determine which scenes this reference image is relevant for.

REFERENCE TYPES AND ASSIGNMENT LOGIC:

  "subject"  → A specific person, character, object, or creature.
               Assign to scenes where that subject appears or is described.
               Match by: physical appearance, role, named character, object type.

  "style"    → A colour palette, lighting mood, textural aesthetic, or compositional approach.
               Assign to scenes that share the SAME EMOTIONAL REGISTER or VISUAL ATMOSPHERE.
               Match by: light quality (warm/cool/dramatic), environment type, era aesthetic.

  "scene"    → A specific location, moment, or event.
               Assign ONLY to scenes that directly depict that location or moment.
               Match by: recognisable architecture, geography, or specific described event.

SCENE LIST FORMAT:
  You will receive a JSON array of scenes, each with: id, text (source words), visualNote (camera description).

ASSIGNMENT RULES:
  • Be selective — not every scene needs this reference.
  • For subject references: assign only scenes where the subject is mentioned or central.
  • For style references: assign the 30-50% of scenes that most closely match that style.
  • For scene references: assign only scenes at that specific location/moment.
  • If the image is not clearly relevant to any scenes: return an empty assignedSceneIds array.

Return ONLY this JSON object — no preamble, no markdown:
{
  "assignedSceneIds": ["uuid-1", "uuid-2"],
  "analysis": "One sentence explanation of why this image matches these scenes."
}`;

// ─────────────────────────────────────────────────────────────────────────────
// § 2  MAIN ANALYSIS FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

export async function analyzeReferenceImage(
  base64Image: string,
  mimeType: string,
  description: string,
  referenceType: 'subject' | 'style' | 'scene',
  sceneCards: SceneCard[],
): Promise<{ assignedSceneIds: string[]; aiAnalysis: string }> {

  if (sceneCards.length === 0) {
    return { assignedSceneIds: [], aiAnalysis: 'No scenes available to match.' };
  }

  // Send only the fields needed for matching — avoid token bloat
  const sceneData = sceneCards.map(s => ({
    id:         s.id,
    text:       s.text,
    visualNote: s.visualNote,
  }));

  const userMessage = [
    `REFERENCE TYPE: ${referenceType}`,
    description ? `USER DESCRIPTION: ${description}` : '',
    ``,
    `SCENE LIST (${sceneData.length} scenes):`,
    JSON.stringify(sceneData, null, 2),
    ``,
    `Analyse the attached image and return the matching scene IDs.`,
  ].filter(Boolean).join('\n');

  try {
    const raw = await aiProvider.generateContent(
      userMessage,
      REFERENCE_ANALYSIS_SYSTEM_PROMPT,
      {
        operationType: 'reference_analysis',
        // Gemini Vision inline image injection
        images: [{ inlineData: { data: base64Image, mimeType } }],
      },
    );

    const cleaned = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    const parsed = JSON.parse(cleaned) as {
      assignedSceneIds?: string[];
      analysis?: string;
    };

    // Validate — only keep IDs that actually exist in sceneCards
    const validIds = (parsed.assignedSceneIds ?? [])
      .filter(id => sceneCards.some(s => s.id === id));

    return {
      assignedSceneIds: validIds,
      aiAnalysis: parsed.analysis ?? 'Analysis complete.',
    };
  } catch (error) {
    console.error('[referenceAnalyzer] Failed to analyse reference image:', error);
    return {
      assignedSceneIds: [],
      aiAnalysis: 'Failed to analyse image due to an error.',
    };
  }
}
