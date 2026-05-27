import crypto from 'node:crypto';

export function verifySlackSignature(params: {
  signingSecret: string;
  timestamp: string;
  signature: string;
  rawBody: string;
}): boolean {
  const { signingSecret, timestamp, signature, rawBody } = params;
  const now = Math.floor(Date.now() / 1000);
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > 60 * 5) return false;

  const baseString = `v0:${timestamp}:${rawBody}`;
  const computed = `v0=${crypto.createHmac('sha256', signingSecret).update(baseString).digest('hex')}`;

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed));
}
