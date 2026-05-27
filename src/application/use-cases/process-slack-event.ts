import type { AuditLogPort, CandidateRepositoryPort, LlmPort, SlackMessageRepositoryPort, SlackPort } from '../ports/index.js';

interface Deps { llm: LlmPort; candidates: CandidateRepositoryPort; messages: SlackMessageRepositoryPort; slack: SlackPort; audit: AuditLogPort; }

export function makeProcessSlackEvent(deps: Deps) {
  return async function processSlackEvent(payload: { team_id: string; event: { type: string; text?: string; bot_id?: string; channel: string; user?: string; ts: string; thread_ts?: string } }): Promise<void> {
    const event = payload?.event;
    const isMention = event?.type === 'app_mention' || (event?.type === 'message' && Boolean(event?.text?.includes('<@')));
    if (!event || !isMention || event.bot_id) return;

    const saved = await deps.messages.create({
      teamId: payload.team_id,
      channelId: event.channel,
      userId: event.user ?? "unknown",
      text: event.text ?? '',
      ts: event.ts,
      threadTs: event.thread_ts ?? null,
      rawPayload: payload
    });

    if (!saved) {
      await deps.audit.log('event_deduplicated', { channel: event.channel, ts: event.ts });
      return;
    }

    const extraction = await deps.llm.extractAction(event.text ?? '');
    await deps.audit.log('llm_extraction_completed', extraction);
    if (!extraction.is_actionable || extraction.action_type !== 'jira_issue') return;

    const candidate = await deps.candidates.createPending({
      slackMessageId: saved.id,
      type: 'jira_issue',
      title: extraction.title ?? 'Untitled issue',
      description: extraction.description ?? 'No description provided',
      issueType: extraction.issue_type ?? 'Task',
      priority: extraction.priority ?? 'Medium',
      confidence: extraction.confidence,
      missingFields: extraction.missing_fields
    });

    await deps.slack.postThreadMessage({
      channel: event.channel,
      threadTs: event.thread_ts ?? event.ts,
      text: 'I found a possible Jira issue. Approve?',
      blocks: deps.slack.buildApprovalBlocks({ ...candidate, candidateId: candidate.id })
    });
    await deps.audit.log('approval_prompt_sent', { candidateId: candidate.id }, candidate.id);
  };
}
