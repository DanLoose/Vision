import { env } from '../../config/env.js';
import type { SlackPort } from '../../application/ports/index.js';

export const slackClient: SlackPort = {
  async postThreadMessage({ channel, text, threadTs, blocks }) {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ channel, text, thread_ts: threadTs, blocks })
    });
    const json = (await res.json()) as { ok: boolean; error?: string };
    if (!res.ok || !json.ok) throw new Error(`Slack post failed: ${json.error ?? res.statusText}`);
  },
  buildApprovalBlocks(input) {
    return [
      { type: 'section', text: { type: 'mrkdwn', text: `*Proposed Jira ${input.issueType}*\n*Title:* ${input.title}\n*Priority:* ${input.priority}\n*Confidence:* ${Math.round(input.confidence * 100)}%\n*Description:* ${input.description}` } },
      { type: 'actions', elements: [
        { type: 'button', style: 'primary', text: { type: 'plain_text', text: 'Create Jira issue' }, action_id: 'create_jira_issue', value: input.candidateId },
        { type: 'button', style: 'danger', text: { type: 'plain_text', text: 'Ignore' }, action_id: 'ignore_jira_issue', value: input.candidateId }
      ] }
    ];
  }
};
