export const ENTITY_EXTRACTION_PROMPT = `
You are an expert text analyst for visual media production. Analyze the following text and extract:

1. CHARACTERS: Any person mentioned. For each, provide:
   - Name (or descriptive label if unnamed)
   - Physical appearance details (age, clothing, features)
   - Role/occupation if mentioned

2. LOCATIONS: Any place mentioned. For each, provide:
   - Name/description
   - Geographic/architectural details
   - Historical period if relevant
   - Visual characteristics

3. OBJECTS: Significant items mentioned
   - What they are
   - Visual description

Output as JSON only, no extra text:
{
  "characters": [{"name": "...", "description": "..."}],
  "locations": [{"name": "...", "description": "..."}],
  "objects": [{"name": "...", "description": "..."}]
}

TEXT TO ANALYZE:
`;

export const SCENE_ANALYSIS_PROMPT = `
Analyze this scene text for visual narrative structure:

1. NARRATIVE TYPE:
   - "static": Single moment in time
   - "sequence": Multiple consecutive moments
   - "timelapse": Showing change over extended period (years/decades)

2. TEMPORAL COMPLEXITY:
   - "simple": One action, one moment
   - "moderate": 2-3 distinct moments
   - "complex": 4+ moments or showing dramatic change over time

3. SUGGESTED PROMPT COUNT: How many distinct images needed to visualize this scene?
   (If describing a city's development "over 5-6 photos", suggest 5-6 prompts)

Output as JSON only, no extra text:
{
  "narrativeType": "static|sequence|timelapse",
  "temporalComplexity": "simple|moderate|complex",
  "suggestedPromptCount": 1,
  "reasoning": "brief explanation"
}

SCENE TEXT:
`;
