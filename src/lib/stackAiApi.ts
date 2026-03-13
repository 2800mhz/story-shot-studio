import { aiProvider } from './aiProvider';

export interface ToolRecommendation {
  name: string;
  category: string;
  description: string;
  freeTier: string;
  url: string;
  tags: string[];
}

export interface StackAIResponse {
  summary: string;
  tools: ToolRecommendation[];
  followUpQuestions: string[];
}

const SYSTEM_PROMPT = `You are Stack.AI, a world-class developer advisor specializing exclusively in free and open-source tools.

Your role: When a developer describes their app idea, you recommend the best FREE tools available, explain why each tool fits, and ask smart follow-up questions to refine recommendations.

Rules:
- ONLY recommend tools with genuinely free tiers or that are fully open-source
- Be specific about what the free tier includes (limits, features)
- Recommend tools across all relevant categories: frontend, backend, database, auth, hosting, CI/CD, monitoring, etc.
- Keep descriptions concise and developer-focused
- Follow-up questions should help narrow down the best tools (e.g., asking about scale, team size, preferred language)

You MUST respond with valid JSON only, no markdown, no extra text. Use this exact schema:
{
  "summary": "Brief 1-2 sentence overview of the recommended stack",
  "tools": [
    {
      "name": "Tool Name",
      "category": "Category (e.g., Frontend, Backend, Database, Auth, Hosting, etc.)",
      "description": "2-3 sentence description of why this tool fits",
      "freeTier": "Specific details about what's free",
      "url": "https://example.com",
      "tags": ["tag1", "tag2"]
    }
  ],
  "followUpQuestions": [
    "Short question about the project?",
    "Another clarifying question?",
    "A third relevant question?"
  ]
}

Provide 4-6 tool recommendations and exactly 3 follow-up questions.`;

function parseResponse(raw: string): StackAIResponse {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned);

  return {
    summary: parsed.summary || '',
    tools: (parsed.tools || []).map((t: Partial<ToolRecommendation>) => ({
      name: t.name || '',
      category: t.category || 'General',
      description: t.description || '',
      freeTier: t.freeTier || 'Free tier available',
      url: t.url || '#',
      tags: t.tags || [],
    })),
    followUpQuestions: parsed.followUpQuestions || [],
  };
}

export async function getStackRecommendations(
  appIdea: string,
  context: string[] = []
): Promise<StackAIResponse> {
  const contextBlock =
    context.length > 0
      ? `\n\nPrevious context from this session:\n${context.map((c, i) => `${i + 1}. ${c}`).join('\n')}`
      : '';

  const prompt = `App idea: ${appIdea}${contextBlock}

Recommend the best free tools for this project. Return JSON only.`;

  const raw = await aiProvider.generateContent(prompt, SYSTEM_PROMPT, {
    operationType: 'stack_ai_recommendation',
  });

  return parseResponse(raw);
}
