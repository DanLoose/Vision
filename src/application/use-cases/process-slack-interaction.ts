import type { AuditLogPort, CandidateRepositoryPort, JiraPort, SlackPort } from '../ports/index.js';

interface Deps { candidates: CandidateRepositoryPort; jira: JiraPort; slack: SlackPort; audit: AuditLogPort; }

export function makeProcessSlackInteraction(deps: Deps) {
  return async function processSlackInteraction(payload: { actions: Array<{ action_id: string; value?: string }> }): Promise<void> {
    const action = payload?.actions?.[0];
    const candidateId = action?.value as string | undefined;
    if (!candidateId) return;

    const candidate = await deps.candidates.getById(candidateId);
    if (!candidate) return;

    const threadTs = candidate.slackMessage.threadTs ?? candidate.slackMessage.ts;
    if (action.action_id === 'ignore_jira_issue') {
      if (candidate.status !== 'pending_approval') return;
      await deps.candidates.updateStatus(candidateId, 'ignored');
      await deps.slack.postThreadMessage({ channel: candidate.slackMessage.channelId, threadTs, text: 'Suggestion ignored.' });
      await deps.audit.log('candidate_ignored', { candidateId }, candidateId);
      return;
    }

    if (action.action_id === 'create_jira_issue') {
      const approved = await deps.candidates.approveIfPending(candidateId);
      if (!approved) {
        await deps.audit.log('candidate_approval_skipped', { candidateId, reason: 'not_pending' }, candidateId);
        return;
      }

      try {
        const issue = await deps.jira.createIssue({ issueType: candidate.issueType, title: candidate.title, description: candidate.description, priority: candidate.priority });
        await deps.candidates.updateStatus(candidateId, 'executed', { jiraIssueKey: issue.key, jiraIssueUrl: issue.url });
        await deps.slack.postThreadMessage({ channel: candidate.slackMessage.channelId, threadTs, text: `Created Jira issue: ${issue.key} - ${issue.url}` });
        await deps.audit.log('candidate_executed', { candidateId, issue }, candidateId);
      } catch (error) {
        await deps.candidates.updateStatus(candidateId, 'failed');
        await deps.audit.log('candidate_execution_failed', { candidateId, error: (error as Error).message }, candidateId);
        throw error;
      }
    }
  };
}
