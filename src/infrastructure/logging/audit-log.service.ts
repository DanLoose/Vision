import { prisma } from '../../prisma/client.js';
import type { AuditLogPort } from '../../application/ports/index.js';

export const auditLogService: AuditLogPort = {
  async log(eventType, payload, actionCandidateId) {
    await prisma.auditLog.create({ data: { eventType, payload: payload as object, actionCandidateId } });
  }
};
