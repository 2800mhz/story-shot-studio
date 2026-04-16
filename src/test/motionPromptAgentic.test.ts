import { describe, expect, it } from 'vitest';
import { parseMotionPromptResponse } from '@/lib/motionPromptParser';
import { formatFinalPrompt } from '@/lib/motionPromptFormatter';

describe('motion prompt agentic helpers', () => {
  it('parses markdown wrapped json safely', () => {
    const result = parseMotionPromptResponse(`\`\`\`json
{
  "shortDraft": "Hero holds sword in smoky courtyard",
  "cameraMotion": "Pan Right",
  "cinematicStyle": "Handheld",
  "intensity": "High",
  "focalPoint": "the actor face",
  "reasoning": "continue rightward movement"
}
\`\`\``);

    expect(result).toEqual({
      shortDraft: 'Hero holds sword in smoky courtyard',
      cameraMotion: 'Pan Right',
      cinematicStyle: 'Handheld',
      intensity: 'High',
      focalPoint: 'the actor face',
      reasoning: 'continue rightward movement',
    });
  });

  it('parses plain json and falls back invalid intensity to medium', () => {
    const result = parseMotionPromptResponse(
      '{"shortDraft":"Mountain monument in fog","cameraMotion":"Tilt Up","cinematicStyle":"Drone","intensity":"VeryHigh","focalPoint":"mountain ridge","reasoning":"drama"}'
    );

    expect(result.intensity).toBe('Medium');
    expect(result.shortDraft).toBe('Mountain monument in fog');
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

    const result = formatFinalPrompt(item, 'Runway Gen-3');
    expect(result).toContain('Scene draft: A dramatic documentary frame.');
    expect(result).toContain('--camera pan_right --motion 3');
  });

  it('formats kling/luma prompts as natural language and supports base fallback', () => {
    const item = {
      cameraMotion: 'Dolly In',
      cinematicStyle: 'Steadycam',
      intensity: 'Low' as const,
      focalPoint: 'the old door',
    };

    const kling = formatFinalPrompt(item, 'Kling AI');
    const luma = formatFinalPrompt(item, 'Luma Dream Machine');

    expect(kling).toContain('Scene draft: Documentary scene focusing on the old door.');
    expect(kling).toContain('Kling AI');
    expect(luma).toContain('Luma Dream Machine');
  });
});
