import { describe, expect, it } from 'vitest';
import { parseMotionPromptResponse } from '@/lib/motionPromptParser';
import { formatFinalPrompt } from '@/lib/motionPromptFormatter';

describe('motion prompt agentic helpers', () => {
  it('parses markdown wrapped json safely', () => {
    const result = parseMotionPromptResponse(`\`\`\`json
{
  "cameraMotion": "Pan Right",
  "cinematicStyle": "Handheld",
  "intensity": "High",
  "focalPoint": "the actor face",
  "reasoning": "continue rightward movement"
}
\`\`\``);

    expect(result).toEqual({
      cameraMotion: 'Pan Right',
      cinematicStyle: 'Handheld',
      intensity: 'High',
      focalPoint: 'the actor face',
      reasoning: 'continue rightward movement',
    });
  });

  it('formats runway prompts with params', () => {
    const item = {
      cameraMotion: 'Pan Right',
      cinematicStyle: 'Handheld',
      intensity: 'Medium',
      focalPoint: 'the character',
      basePrompt: 'A dramatic documentary frame.',
    };

    expect(formatFinalPrompt(item, 'Runway Gen-3')).toBe(
      'A dramatic documentary frame. --camera pan_right --motion 3'
    );
  });
});
