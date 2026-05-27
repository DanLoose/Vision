import type { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';
import { makeProcessSlackEvent } from '../application/use-cases/process-slack-event.js';
import { llmClient } from '../infrastructure/clients/llm.client.js';
import { candidateRepository, slackMessageRepository } from '../infrastructure/repositories/prisma.repositories.js';
import { slackClient } from '../infrastructure/clients/slack.client.js';
import { auditLogService } from '../infrastructure/logging/audit-log.service.js';
import { verifySlackSignature } from '../utils/verify-slack-signature.js';
import { slackEventPayloadSchema } from '../schemas/slack-event.schema.js';

const processSlackEvent = makeProcessSlackEvent({
  llm: llmClient,
  candidates: candidateRepository,
  messages: slackMessageRepository,
  slack: slackClient,
  audit: auditLogService
});

export async function slackEventsRoute(app: FastifyInstance) {
  app.post('/slack/events', async (request, reply) => {
    const rawBody = (request.body as string) ?? '';
    const timestamp = request.headers['x-slack-request-timestamp'] as string;
    const signature = request.headers['x-slack-signature'] as string;

    if (!verifySlackSignature({ signingSecret: env.SLACK_SIGNING_SECRET, timestamp, signature, rawBody })) {
      return reply.code(401).send({ error: 'invalid signature' });
    }

    const payload = JSON.parse(rawBody);
    if (payload.type === 'url_verification') return reply.send({ challenge: payload.challenge });

    const parsed = slackEventPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      reply.code(200).send({ ok: true });
      await auditLogService.log('event_payload_invalid', { issues: parsed.error.issues });
      return;
    }

    reply.code(200).send({ ok: true });

    void processSlackEvent(parsed.data).catch(async (error) => {
      await auditLogService.log('event_processing_failed', { error: (error as Error).message });
    });
  });
}
