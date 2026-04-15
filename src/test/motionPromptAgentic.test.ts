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

  it('parses plain json and falls back invalid intensity to medium', () => {
    const result = parseMotionPromptResponse(
      '{"cameraMotion":"Tilt Up","cinematicStyle":"Drone","intensity":"VeryHigh","focalPoint":"mountain ridge","reasoning":"drama"}'
    );

    expect(result.intensity).toBe('Medium');
    expect(result.cameraMotion).toBe('Tilt Up');
    expect(result.cinematicStyle).toBe('Drone');
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

  it('formats kling/luma prompts as natural language and supports base fallback', () => {
    const item = {
      cameraMotion: 'Dolly In',
      cinematicStyle: 'Steadycam',
      intensity: 'Low' as const,
      focalPoint: 'the old door',
    };

    expect(formatFinalPrompt(item, 'Kling AI')).toBe(
      'A steadycam camera style with low intensity dolly in, focusing on the old door. Documentary scene focusing on the old door.'
    );
    expect(formatFinalPrompt(item, 'Luma Dream Machine')).toBe(
      'A steadycam camera style with low intensity dolly in, focusing on the old door. Documentary scene focusing on the old door.'
    );
  });
});
