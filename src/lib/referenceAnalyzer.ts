import { aiProvider } from './aiProvider';
import type { SceneCard } from '@/types';

const REFERENCE_ANALYSIS_SYSTEM_PROMPT = `You are an expert film director and continuity supervisor.
You are given a reference image (as an image attachment) and a list of scenes in a project.
Your job is to analyze the image and determine WHICH SCENES this image is relevant for.

Rules:
1. You will be provided with a JSON list of scenes (ID, Text, Visual Note).
2. You will be provided with the reference type (subject, style, or scene) and an optional user description.
3. Determine which scenes narratively or visually match this reference.
4. If it's a "subject" (character/object), assign it to scenes where that subject appears.
5. If it's a "style" (color palette, mood), assign it to scenes that share that mood.
6. If it's a "scene" (specific location/moment), assign it to the exact matching scenes.
7. Return your response STRICTLY as a valid JSON object matching this schema:
{
  "assignedSceneIds": ["uuid-1", "uuid-2"],
  "analysis": "Brief 1-sentence explanation of why this image matches these scenes."
}`;

export async function analyzeReferenceImage(
  base64Image: string,
  mimeType: string,
  description: string,
  referenceType: string,
  sceneCards: SceneCard[]
): Promise<{ assignedSceneIds: string[]; aiAnalysis: string }> {
  
  if (sceneCards.length === 0) {
    return { assignedSceneIds: [], aiAnalysis: "No scenes available to match." };
  }

  // Optimize payload by only sending necessary scene data
  const sceneData = sceneCards.map(s => ({
    id: s.id,
    text: s.text,
    visualNote: s.visualNote
  }));

  const userMessage = `
REFERENCE TYPE: ${referenceType}
USER DESCRIPTION: ${description || 'None provided'}

SCENE LIST:
${JSON.stringify(sceneData, null, 2)}

Please analyze the attached image and return the matching scene IDs in the required JSON format.
`;

  try {
    const rawContent = await aiProvider.generateContent(
      userMessage,
      REFERENCE_ANALYSIS_SYSTEM_PROMPT,
      { 
        operationType: 'reference_analysis',
        // Inject image via inlineData for Gemini Vision
        images: [{ inlineData: { data: base64Image, mimeType } }]
      }
    );

    const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as { assignedSceneIds?: string[]; analysis?: string };
    
    // Validate IDs
    const validIds = (parsed.assignedSceneIds || []).filter(id => sceneCards.some(s => s.id === id));

    return {
      assignedSceneIds: validIds,
      aiAnalysis: parsed.analysis || 'Analysis complete.',
    };
  } catch (error) {
    console.error('Failed to analyze reference image:', error);
    return {
      assignedSceneIds: [],
      aiAnalysis: 'Failed to analyze image due to an error.',
    };
  }
}
