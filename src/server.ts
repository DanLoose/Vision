import Fastify from 'fastify';
import formBody from '@fastify/formbody';
import rawBody from '@fastify/raw-body';
import { env } from './config/env.js';
import { slackEventsRoute } from './routes/slack-events.route.js';
import { slackInteractionsRoute } from './routes/slack-interactions.route.js';

const app = Fastify({ logger: true });

await app.register(formBody);
await app.register(rawBody, { field: 'body', global: false, encoding: 'utf8', runFirst: true, routes: ['/slack/events', '/slack/interactions'] });

await app.register(slackEventsRoute);
await app.register(slackInteractionsRoute);

app.get('/health', async () => ({ ok: true }));

app.listen({ host: '0.0.0.0', port: env.PORT }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
