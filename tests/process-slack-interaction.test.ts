import test from 'node:test';
import assert from 'node:assert/strict';
import { makeProcessSlackInteraction } from '../src/application/use-cases/process-slack-interaction.js';

test('ignore action updates status and posts message', async () => {
  const calls: string[] = [];
  const useCase = makeProcessSlackInteraction({
    candidates: {
      async getById() { return { id: 'c1', status: 'pending_approval', issueType: 'Bug', title: 'x', description: 'y', priority: 'High', confidence: 0.9, slackMessage: { channelId: 'C1', ts: '1', threadTs: null } }; },
      async updateStatus(_id, status) { calls.push(status); },
      async approveIfPending() { return true; }
    },
    jira: { async createIssue() { throw new Error('should not call'); } },
    slack: { async postThreadMessage() { calls.push('post'); }, buildApprovalBlocks() { return []; } },
    audit: { async log() { calls.push('audit'); } }
  });

  await useCase({ actions: [{ action_id: 'ignore_jira_issue', value: 'c1' }] });
  assert.deepEqual(calls, ['ignored', 'post', 'audit']);
});

test('create action marks failed when Jira creation throws', async () => {
  const calls: string[] = [];
  const useCase = makeProcessSlackInteraction({
    candidates: {
      async getById() { return { id: 'c1', status: 'pending_approval', issueType: 'Bug', title: 'x', description: 'y', priority: 'High', confidence: 0.9, slackMessage: { channelId: 'C1', ts: '1', threadTs: null } }; },
      async updateStatus(_id, status) { calls.push(status); },
      async approveIfPending() { calls.push('approved'); return true; }
    },
    jira: { async createIssue() { throw new Error('jira down'); } },
    slack: { async postThreadMessage() { calls.push('post'); }, buildApprovalBlocks() { return []; } },
    audit: { async log(eventType) { calls.push(eventType); } }
  });

  await assert.rejects(() => useCase({ actions: [{ action_id: 'create_jira_issue', value: 'c1' }] }));
  assert.deepEqual(calls, ['approved', 'failed', 'candidate_execution_failed']);
});


test('create action executes jira and posts ticket link', async () => {
  const calls: string[] = [];
  const useCase = makeProcessSlackInteraction({
    candidates: {
      async getById() { return { id: 'c1', status: 'pending_approval', issueType: 'Bug', title: 'x', description: 'y', priority: 'High', confidence: 0.9, slackMessage: { channelId: 'C1', ts: '1', threadTs: null } }; },
      async updateStatus(_id, status) { calls.push(status); },
      async approveIfPending() { calls.push('approved'); return true; }
    },
    jira: { async createIssue() { calls.push('create_jira'); return { key: 'PROJ-1', url: 'https://jira/browse/PROJ-1' }; } },
    slack: { async postThreadMessage() { calls.push('post'); }, buildApprovalBlocks() { return []; } },
    audit: { async log(eventType) { calls.push(eventType); } }
  });

  await useCase({ actions: [{ action_id: 'create_jira_issue', value: 'c1' }] });
  assert.deepEqual(calls, ['approved', 'create_jira', 'executed', 'post', 'candidate_executed']);
});

test('create action skips when candidate is not pending anymore', async () => {
  const calls: string[] = [];
  const useCase = makeProcessSlackInteraction({
    candidates: {
      async getById() { return { id: 'c1', status: 'approved', issueType: 'Bug', title: 'x', description: 'y', priority: 'High', confidence: 0.9, slackMessage: { channelId: 'C1', ts: '1', threadTs: null } }; },
      async updateStatus() { calls.push('update'); },
      async approveIfPending() { calls.push('approve_attempt'); return false; }
    },
    jira: { async createIssue() { calls.push('create_jira'); return { key: 'PROJ-1', url: 'x' }; } },
    slack: { async postThreadMessage() { calls.push('post'); }, buildApprovalBlocks() { return []; } },
    audit: { async log(eventType) { calls.push(eventType); } }
  });

  await useCase({ actions: [{ action_id: 'create_jira_issue', value: 'c1' }] });
  assert.deepEqual(calls, ['approve_attempt', 'candidate_approval_skipped']);
});
