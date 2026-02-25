import type { Scene } from '@/types';

const SCENE_PARSING_PROMPT = `You are a narrative structure analyst. Parse the following text into logical scenes for visual storytelling.

A SCENE is a continuous narrative moment suitable for 1-3 images. Scenes should:
- Be complete narrative units (not mid-sentence cuts)
- Average 2-5 sentences each
- Represent distinct visual moments
- Have clear beginning and end

OUTPUT FORMAT (JSON):
{
  "scenes": [
    {
      "text": "The actual scene text from the document",
      "reasoning": "Brief explanation why this is a scene"
    }
  ]
}

RULES:
- Preserve original text exactly (no paraphrasing)
- Each scene should be 50-300 characters
- Aim for 10-20 scenes per 1000 words
- Dialogue can be separate scenes
- Location/time changes = new scene

TEXT TO PARSE:
`;

export async function parseTextIntoScenes(
  fullText: string,
  apiKey: string,
  model: string
): Promise<Scene[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const chunks = splitIntoChunks(fullText, 20000);
  const allScenes: Scene[] = [];
  let sceneCounter = 1;

  for (const chunk of chunks) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: SCENE_PARSING_PROMPT + chunk }],
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 8192,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Scene parsing failed: ${response.status}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Extract JSON from the response
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/(\{[\s\S]*\})/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      const parsed = JSON.parse(jsonStr);

      if (parsed.scenes && Array.isArray(parsed.scenes)) {
        for (const s of parsed.scenes) {
          const sceneText = s.text?.trim();
          if (!sceneText) continue;
          const startIndex = fullText.indexOf(sceneText);

          if (startIndex !== -1) {
            allScenes.push({
              id: `scene-ai-${crypto.randomUUID()}`,
              number: sceneCounter,
              title: `Sahne ${sceneCounter}`,
              text: sceneText,
              startIndex,
              endIndex: startIndex + sceneText.length,
              episodeTitle: 'AI Parse',
              prompts: [],
              segments: [],
              subjectReferences: [],
              consistencyGroupIds: [],
              status: 'pending',
              note: s.reasoning || '',
            });
            sceneCounter++;
          }
        }
      }
    } catch (e) {
      console.error('Scene parsing error:', e);
    }

    if (chunks.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return allScenes;
}

function splitIntoChunks(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxChars;
    if (end < text.length) {
      const lastBreak = text.lastIndexOf('\n\n', end);
      if (lastBreak > start) end = lastBreak;
    }
    chunks.push(text.slice(start, end));
    start = end;
  }

  return chunks;
}
