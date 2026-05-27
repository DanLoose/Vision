import { z } from 'zod';

const slackEventInnerSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
  bot_id: z.string().optional(),
  channel: z.string(),
  user: z.string().optional(),
  ts: z.string(),
  thread_ts: z.string().optional()
});

export const slackEventPayloadSchema = z.object({
  type: z.string(),
  team_id: z.string(),
  event: slackEventInnerSchema
});

export type SlackEventPayload = z.infer<typeof slackEventPayloadSchema>;
