import { z } from 'zod';

export const actionExtractionSchema = z.object({
  is_actionable: z.boolean(),
  action_type: z.enum(['jira_issue', 'none']),
  issue_type: z.enum(['Task', 'Bug', 'Story']).nullable(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  priority: z.enum(['Lowest', 'Low', 'Medium', 'High', 'Highest']).nullable(),
  confidence: z.number().min(0).max(1),
  missing_fields: z.array(z.string())
});

export type ActionExtraction = z.infer<typeof actionExtractionSchema>;
