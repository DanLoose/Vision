import type { ActionExtraction } from '../../domain/action-extraction.js';
import type { ActionCandidateStatus } from '../../domain/action-candidate.js';

export interface LlmPort {
  extractAction(message: string): Promise<ActionExtraction>;
}

export interface SlackPort {
  postThreadMessage(input: { channel: string; threadTs: string; text: string; blocks?: unknown[] }): Promise<void>;
  buildApprovalBlocks(input: { candidateId: string; issueType: string; title: string; description: string; priority: string; confidence: number }): unknown[];
}

export interface JiraPort {
  createIssue(input: { issueType: string; title: string; description: string; priority: string }): Promise<{ key: string; url: string }>;
}

export interface AuditLogPort {
  log(eventType: string, payload: unknown, actionCandidateId?: string): Promise<void>;
}

export interface SlackMessageRecord {
  id: string; channelId: string; ts: string; threadTs: string | null;
}

export interface CandidateRecord {
  id: string;
  status: ActionCandidateStatus;
  issueType: string;
  title: string;
  description: string;
  priority: string;
  confidence: number;
  slackMessage: { channelId: string; ts: string; threadTs: string | null };
}

export interface CandidateRepositoryPort {
  createPending(input: { slackMessageId: string; type: string; title: string; description: string; issueType: string; priority: string; confidence: number; missingFields: string[] }): Promise<{ id: string; issueType: string; title: string; description: string; priority: string; confidence: number }>;
  getById(id: string): Promise<CandidateRecord | null>;
  updateStatus(id: string, status: ActionCandidateStatus, extra?: Record<string, unknown>): Promise<void>;
  approveIfPending(id: string): Promise<boolean>;
}

export interface SlackMessageRepositoryPort {
  create(input: { teamId: string; channelId: string; userId: string; text: string; ts: string; threadTs: string | null; rawPayload: unknown }): Promise<SlackMessageRecord | null>;
}
