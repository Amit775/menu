import { Injectable } from '@nestjs/common';
import { PrismaService } from '@menu/api/shared/db';
import {
  type ContributorApplication,
  type ContributorApplicationDecision,
  type ContributorApplicationReview,
  type ContributorApplicationStatus,
} from '@menu/shared/contracts';

interface ContributorApplicationRow {
  id: string;
  note: string;
  status: ContributorApplicationStatus;
  createdAt: Date;
  decidedAt: Date | null;
}

interface ReviewRow extends ContributorApplicationRow {
  account: { id: string; displayName: string };
}

const withAccount = { account: { select: { id: true, displayName: true } } } as const;

const decidedStatus: Record<ContributorApplicationDecision, ContributorApplicationStatus> = {
  approve: 'approved',
  reject: 'rejected',
};

@Injectable()
export class ContributorApplicationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async latestFor(accountId: string): Promise<ContributorApplication | null> {
    const row = await this.prisma.contributorApplication.findFirst({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
    });
    return row ? toContract(row) : null;
  }

  /** Null when the account already has a pending application. */
  async create(accountId: string, note: string): Promise<ContributorApplication | null> {
    return this.prisma.$transaction(async (tx) => {
      // Locks the applicant so two submits at once cannot both see no pending application.
      await tx.$queryRaw`SELECT "id" FROM "account" WHERE "id" = ${accountId}::uuid FOR UPDATE`;
      const pending = await tx.contributorApplication.count({
        where: { accountId, status: 'pending' },
      });
      if (pending > 0) {
        return null;
      }
      return toContract(await tx.contributorApplication.create({ data: { accountId, note } }));
    });
  }

  async listPending(): Promise<ContributorApplicationReview[]> {
    const rows = await this.prisma.contributorApplication.findMany({
      where: { status: 'pending' },
      include: withAccount,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toReview);
  }

  /** Approving makes the applicant a Contributor in the same write. Null unless the application is pending. */
  async decide(
    id: string,
    decision: ContributorApplicationDecision,
    decidedById: string,
  ): Promise<ContributorApplicationReview | null> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.contributorApplication.updateMany({
        where: { id, status: 'pending' },
        data: { status: decidedStatus[decision], decidedById, decidedAt: new Date() },
      });
      if (count === 0) {
        return null;
      }
      const row = await tx.contributorApplication.findUniqueOrThrow({
        where: { id },
        include: withAccount,
      });
      if (decision === 'approve') {
        await tx.account.updateMany({
          where: { id: row.account.id, role: 'user' },
          data: { role: 'contributor' },
        });
      }
      return toReview(row);
    });
  }
}

function toContract(row: ContributorApplicationRow): ContributorApplication {
  return {
    id: row.id,
    note: row.note,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    decidedAt: row.decidedAt?.toISOString() ?? null,
  };
}

function toReview(row: ReviewRow): ContributorApplicationReview {
  return { ...toContract(row), account: row.account };
}
