import { describe, expect, it } from 'vitest';
import { parseMotionPromptResponse } from '@/lib/motionPromptParser';
import { formatFinalPrompt } from '@/lib/motionPromptFormatter';

describe('motion prompt agentic helpers', () => {
  it('parses markdown wrapped json safely', () => {
    const result = parseMotionPromptResponse(`\`\`\`json
{
  "shortDraft": "A lone rider near stone walls with smoke in the distance",
  "cameraMotion": "Pan Right",
  "cinematicStyle": "Handheld",
  "intensity": "High",
  "focalPoint": "the actor face",
  "reasoning": "continue rightward movement"
}
\`\`\``);

    expect(result).toEqual({
      shortDraft: 'A lone rider near stone walls with smoke in the distance',
      cameraMotion: 'Pan Right',
      cinematicStyle: 'Handheld',
      intensity: 'High',
      focalPoint: 'the actor face',
      reasoning: 'continue rightward movement',
    });
  });

  it('parses plain json and falls back invalid intensity to medium', () => {
    const result = parseMotionPromptResponse(
      '{"shortDraft":"Mountain ridge in fog","cameraMotion":"Tilt Up","cinematicStyle":"Drone","intensity":"VeryHigh","focalPoint":"mountain ridge","reasoning":"drama"}'
    );

    expect(result.intensity).toBe('Medium');
    expect(result.shortDraft).toBe('Mountain ridge in fog');
    expect(result.cameraMotion).toBe('Tilt Up');
    expect(result.cinematicStyle).toBe('Drone');
  });

  it('formats runway prompts with params', () => {
    const item = {
      cameraMotion: 'Pan Right',
      cinematicStyle: 'Handheld',
      intensity: 'Medium' as const,
      focalPoint: 'the character',
      shortDraft: 'A dramatic documentary frame with a character in center',
    };

    const result = formatFinalPrompt(item, 'Runway Gen-3');
    expect(result).toContain('--camera pan_right --motion 3');
    expect(result).toContain('A dramatic documentary frame with a character in center');
  });

  it('formats kling/luma prompts as natural language', () => {
    const item = {
      cameraMotion: 'Dolly In',
      cinematicStyle: 'Steadycam',
      intensity: 'Low' as const,
      focalPoint: 'the old door',
      shortDraft: 'An old door in a narrow corridor',
    };

    expect(formatFinalPrompt(item, 'Kling AI')).toContain('An old door in a narrow corridor');
    expect(formatFinalPrompt(item, 'Kling AI')).toContain('Camera motion: Dolly In');
    expect(formatFinalPrompt(item, 'Luma Dream Machine')).toContain('Cinematic style: Steadycam');
  });
});
