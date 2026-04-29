import { agentOperationSetSchema, type AgentOperationSet } from './agentSchema';

const JSON_OPEN = '<AGENT_RESULT_JSON>';
const JSON_CLOSE = '</AGENT_RESULT_JSON>';

export function extractAgentResultBlock(text: string): string | null {
  const start = text.indexOf(JSON_OPEN);
  const end = text.indexOf(JSON_CLOSE);
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start + JSON_OPEN.length, end).trim();
}

export function stripAgentResultBlock(text: string): string {
  const block = extractAgentResultBlock(text);
  if (!block) return text.trim();
  return text.replace(`${JSON_OPEN}${block}${JSON_CLOSE}`, '').trim();
}

export function parseAgentOperationSet(text: string): AgentOperationSet {
  const block = extractAgentResultBlock(text) ?? text.trim();
  const cleaned = block
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);

    const normalized = (() => {
      if (!parsed || typeof parsed !== 'object') return parsed;
      const ops = Array.isArray((parsed as any).operations) ? (parsed as any).operations : [];
      const normalizedOps = ops.map((op: any) => {
        if (!op || typeof op !== 'object') return op;
        if (op.payload && typeof op.payload === 'object' && !Array.isArray(op.payload)) {
          return { type: op.type, ...op.payload };
        }
        return op;
      });
      return { ...(parsed as any), operations: normalizedOps };
    })();

    const result = agentOperationSetSchema.safeParse(normalized);
    if (!result.success) {
      console.error('Agent JSON validation failed:', result.error.format());
      throw new Error(`JSON yapısı geçersiz: ${result.error.issues.map((i) => i.message).join(', ')}`);
    }

    return result.data;
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error('Yapay zeka geçersiz bir JSON formatı üretti. Lütfen tekrar deneyin.');
    }
    throw e;
  }
}
