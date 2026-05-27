import test from 'node:test';
import assert from 'node:assert/strict';
import { slackEventPayloadSchema } from '../src/schemas/slack-event.schema.js';
import { slackInteractionPayloadSchema } from '../src/schemas/slack-interaction.schema.js';

test('slack event schema validates app_mention payload', () => {
  const parsed = slackEventPayloadSchema.safeParse({
    type: 'event_callback',
    team_id: 'T1',
    event: { type: 'app_mention', channel: 'C1', user: 'U1', ts: '123.45', text: 'hello' }
  });
  assert.equal(parsed.success, true);
});

test('slack interaction schema rejects missing actions', () => {
  const parsed = slackInteractionPayloadSchema.safeParse({});
  assert.equal(parsed.success, false);
});
