import test from 'node:test';
import assert from 'node:assert/strict';
import { makeProcessSlackEvent } from '../src/application/use-cases/process-slack-event.js';

test('actionable app_mention creates candidate and sends approval prompt', async () => {
  const calls: string[] = [];
  const useCase = makeProcessSlackEvent({
    messages: {
      async create() {
        calls.push('save_message');
        return { id: 'm1', channelId: 'C1', ts: '1', threadTs: null };
      }
    },
    llm: {
      async extractAction() {
        calls.push('extract');
        return {
          is_actionable: true,
          action_type: 'jira_issue',
          issue_type: 'Bug',
          title: 'Checkout fails',
          description: 'Fails on mobile',
          priority: 'High',
          confidence: 0.9,
          missing_fields: []
        };
      }
    },
    candidates: {
      async createPending() {
        calls.push('create_candidate');
        return { id: 'c1', issueType: 'Bug', title: 'Checkout fails', description: 'Fails on mobile', priority: 'High', confidence: 0.9 };
      },
      async getById() { return null; },
      async updateStatus() {},
      async approveIfPending() { return false; }
    },
    slack: {
      async postThreadMessage() { calls.push('post_prompt'); },
      buildApprovalBlocks() { calls.push('build_blocks'); return []; }
    },
    audit: { async log(eventType: string) { calls.push(eventType); } }
  });

  await useCase({
    type: 'event_callback',
    team_id: 'T1',
    event: { type: 'app_mention', channel: 'C1', user: 'U1', ts: '1', text: 'create bug' }
  });

  assert.deepEqual(calls, ['save_message', 'extract', 'llm_extraction_completed', 'create_candidate', 'build_blocks', 'post_prompt', 'approval_prompt_sent']);
});

test('non-actionable mention does not create candidate', async () => {
  const calls: string[] = [];
  const useCase = makeProcessSlackEvent({
    messages: { async create() { calls.push('save_message'); return { id: 'm1', channelId: 'C1', ts: '1', threadTs: null }; } },
    llm: {
      async extractAction() {
        calls.push('extract');
        return { is_actionable: false, action_type: 'none', issue_type: null, title: null, description: null, priority: null, confidence: 0.2, missing_fields: [] };
      }
    },
    candidates: { async createPending() { calls.push('create_candidate'); throw new Error('should not'); }, async getById() { return null; }, async updateStatus() {}, async approveIfPending() { return false; } },
    slack: { async postThreadMessage() { calls.push('post_prompt'); }, buildApprovalBlocks() { return []; } },
    audit: { async log(eventType: string) { calls.push(eventType); } }
  });

  await useCase({ type: 'event_callback', team_id: 'T1', event: { type: 'app_mention', channel: 'C1', user: 'U1', ts: '1', text: 'hello' } });
  assert.deepEqual(calls, ['save_message', 'extract', 'llm_extraction_completed']);
});

test('deduplicated event short-circuits processing', async () => {
  const calls: string[] = [];
  const useCase = makeProcessSlackEvent({
    messages: { async create() { calls.push('save_message'); return null; } },
    llm: { async extractAction() { calls.push('extract'); throw new Error('should not'); } },
    candidates: { async createPending() { calls.push('create_candidate'); throw new Error('should not'); }, async getById() { return null; }, async updateStatus() {}, async approveIfPending() { return false; } },
    slack: { async postThreadMessage() { calls.push('post_prompt'); }, buildApprovalBlocks() { return []; } },
    audit: { async log(eventType: string) { calls.push(eventType); } }
  });

  await useCase({ type: 'event_callback', team_id: 'T1', event: { type: 'app_mention', channel: 'C1', user: 'U1', ts: '1', text: 'hello' } });
  assert.deepEqual(calls, ['save_message', 'event_deduplicated']);
});
