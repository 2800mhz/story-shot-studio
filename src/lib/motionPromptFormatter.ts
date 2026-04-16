export type TargetModel = 'Runway Gen-3' | 'Kling AI' | 'Luma Dream Machine';

export interface MotionPromptFields {
  cameraMotion?: string;
  cinematicStyle?: string;
  intensity?: 'Low' | 'Medium' | 'High';
  focalPoint?: string;
  basePrompt?: string;
}

const RUNWAY_MOTION_LEVEL = {
  low: 1,
  medium: 3,
  high: 5,
} as const;

export function formatFinalPrompt(item: MotionPromptFields, targetModel: TargetModel): string {
  const cameraMotion = item.cameraMotion || 'Static';
  const cinematicStyle = item.cinematicStyle || 'Steadycam';
  const intensity = item.intensity || 'Medium';
  const focalPoint = item.focalPoint?.trim() || 'main subject';
  const shortDraft = item.basePrompt?.trim() || `Documentary scene focusing on ${focalPoint}.`;
  const comprehensiveBase = [
    `Scene draft: ${shortDraft}.`,
    `Focus on ${focalPoint}.`,
    `Camera motion: ${cameraMotion}.`,
    `Cinematic style: ${cinematicStyle}.`,
    `Motion intensity: ${intensity}.`,
    'Keep physical continuity, realistic movement, and coherent depth across foreground and background.',
    'Avoid fast chaotic action, deformations, and unstable temporal artifacts.'
  ].join(' ');

  if (targetModel === 'Runway Gen-3') {
    const camera = toRunwayCameraParam(cameraMotion);
    const motionLevel = toRunwayMotionLevel(intensity);
    return `${comprehensiveBase} --camera ${camera} --motion ${motionLevel}`;
  }

  return `${comprehensiveBase} Render with a ${cinematicStyle.toLowerCase()} style and ${intensity.toLowerCase()} motion emphasis for ${targetModel}.`;
}

export function buildMotionContextFromFields(item: MotionPromptFields): string {
  const cameraMotion = item.cameraMotion || 'Static';
  const intensity = item.intensity || 'Medium';
  return `The previous shot ended with ${cameraMotion} at ${intensity} intensity focusing on ${item.focalPoint || 'the main subject'}. Try to maintain continuous storyboard flow if applicable.`;
}

function toRunwayCameraParam(cameraMotion: string): string {
  const motionMap: Record<string, string> = {
    'Pan Right': 'pan_right',
    'Pan Left': 'pan_left',
    'Dolly In': 'dolly_in',
    'Dolly Out': 'dolly_out',
    'Zoom In': 'zoom_in',
    'Zoom Out': 'zoom_out',
    'Tilt Up': 'tilt_up',
    'Tilt Down': 'tilt_down',
    Static: 'static',
  };
  return motionMap[cameraMotion] || 'static';
}

function toRunwayMotionLevel(intensity: MotionPromptFields['intensity']): number {
  if (intensity === 'Low') return RUNWAY_MOTION_LEVEL.low;
  if (intensity === 'High') return RUNWAY_MOTION_LEVEL.high;
  return RUNWAY_MOTION_LEVEL.medium;
}
