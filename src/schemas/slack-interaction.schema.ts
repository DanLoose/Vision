import { z } from 'zod';

const interactionActionSchema = z.object({
  action_id: z.string(),
  value: z.string().optional()
});

export const slackInteractionPayloadSchema = z.object({
  actions: z.array(interactionActionSchema).min(1)
});

export type SlackInteractionPayload = z.infer<typeof slackInteractionPayloadSchema>;
