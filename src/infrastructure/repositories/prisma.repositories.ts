import { prisma } from '../../prisma/client.js';
import type { CandidateRepositoryPort, SlackMessageRepositoryPort } from '../../application/ports/index.js';
import type { ActionCandidateStatus } from '../../domain/action-candidate.js';

export const slackMessageRepository: SlackMessageRepositoryPort = {
  create: async (input) => {
    try {
      return await prisma.slackMessage.create({ data: input });
    } catch (error) {
      const prismaError = error as { code?: string };
      if (prismaError.code === 'P2002') return null;
      throw error;
    }
  }
};

export const candidateRepository: CandidateRepositoryPort = {
  createPending: (input) => prisma.actionCandidate.create({ data: { ...input, status: 'pending_approval' } }),
  getById: (id) => prisma.actionCandidate.findUnique({ where: { id }, include: { slackMessage: true } }),
  updateStatus: async (id, status: ActionCandidateStatus, extra = {}) => {
    await prisma.actionCandidate.update({ where: { id }, data: { status, ...extra } });
  },
  approveIfPending: async (id) => {
    const result = await prisma.actionCandidate.updateMany({
      where: { id, status: 'pending_approval' },
      data: { status: 'approved' }
    });
    return result.count === 1;
  }
};
