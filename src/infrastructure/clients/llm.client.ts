import OpenAI from 'openai';
import { env } from '../../config/env.js';
import { actionExtractionSchema } from '../../domain/action-extraction.js';
import type { LlmPort } from '../../application/ports/index.js';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const EXTRACTION_INSTRUCTIONS = `You are an action extraction classifier for Slack messages.
Return ONLY one JSON object with exactly these fields:
- is_actionable: boolean
- action_type: "jira_issue" | "none"
- issue_type: "Task" | "Bug" | "Story" | null
- title: string | null
- description: string | null
- priority: "Lowest" | "Low" | "Medium" | "High" | "Highest" | null
- confidence: number between 0 and 1
- missing_fields: string[]
Rules:
- If not actionable, set action_type="none" and issue_type/title/description/priority to null.
- Do not include markdown, comments, or extra keys.`;

export const llmClient: LlmPort = {
  async extractAction(message) {
    const response = await openai.chat.completions.create({
      model: env.OPENAI_MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: EXTRACTION_INSTRUCTIONS }, { role: 'user', content: message }]
    });
    return actionExtractionSchema.parse(JSON.parse(response.choices[0]?.message?.content ?? '{}'));
  }
};
