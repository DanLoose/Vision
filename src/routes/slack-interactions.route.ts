import type { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';
import { makeProcessSlackInteraction } from '../application/use-cases/process-slack-interaction.js';
import { candidateRepository } from '../infrastructure/repositories/prisma.repositories.js';
import { jiraClient } from '../infrastructure/clients/jira.client.js';
import { slackClient } from '../infrastructure/clients/slack.client.js';
import { auditLogService } from '../infrastructure/logging/audit-log.service.js';
import { verifySlackSignature } from '../utils/verify-slack-signature.js';
import { slackInteractionPayloadSchema } from '../schemas/slack-interaction.schema.js';

const processSlackInteraction = makeProcessSlackInteraction({ candidates: candidateRepository, jira: jiraClient, slack: slackClient, audit: auditLogService });

export async function slackInteractionsRoute(app: FastifyInstance) {
  app.post('/slack/interactions', async (request, reply) => {
    const rawBody = (request.body as string) ?? '';
    const timestamp = request.headers['x-slack-request-timestamp'] as string;
    const signature = request.headers['x-slack-signature'] as string;

    if (!verifySlackSignature({ signingSecret: env.SLACK_SIGNING_SECRET, timestamp, signature, rawBody })) {
      return reply.code(401).send({ error: 'invalid signature' });
    }

    const payload = JSON.parse(new URLSearchParams(rawBody).get('payload') ?? '{}');
    const parsed = slackInteractionPayloadSchema.safeParse(payload);
    reply.code(200).send();

    if (!parsed.success) {
      await auditLogService.log('interaction_payload_invalid', { issues: parsed.error.issues });
      return;
    }

    void processSlackInteraction(parsed.data).catch(async (error) => {
      await auditLogService.log('interaction_failed', { error: (error as Error).message });
    });
  });
}
