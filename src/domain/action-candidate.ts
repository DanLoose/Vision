export const actionCandidateStatuses = ['pending_approval', 'approved', 'ignored', 'executed', 'failed'] as const;
export type ActionCandidateStatus = (typeof actionCandidateStatuses)[number];
