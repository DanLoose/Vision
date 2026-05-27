import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifySlackSignature } from '../src/utils/verify-slack-signature.js';

test('validates correct signature', () => {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const rawBody = '{"type":"event_callback"}';
  const signingSecret = 'secret';
  const base = `v0:${timestamp}:${rawBody}`;
  const signature = `v0=${crypto.createHmac('sha256', signingSecret).update(base).digest('hex')}`;
  assert.equal(verifySlackSignature({ signingSecret, timestamp, signature, rawBody }), true);
});

test('rejects stale timestamp', () => {
  const timestamp = '1';
  assert.equal(verifySlackSignature({ signingSecret: 'secret', timestamp, signature: 'v0=123', rawBody: '{}' }), false);
});
