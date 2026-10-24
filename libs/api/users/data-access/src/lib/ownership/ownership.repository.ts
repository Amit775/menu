import { Injectable } from '@nestjs/common';
import { isPrismaError, PrismaErrorCode, PrismaService } from '@menu/api/shared/db';
import { type GrantOwnership, type Ownership } from '@menu/shared/contracts';

interface OwnershipRow {
  accountId: string;
  venueId: string;
  grantedAt: Date;
  account: { displayName: string };
}

const withAccount = { account: { select: { displayName: true } } } as const;

@Injectable()
export class OwnershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByVenue(venueId: string): Promise<Ownership[]> {
    const rows = await this.prisma.ownership.findMany({
      where: { venueId },
      include: withAccount,
      orderBy: { grantedAt: 'asc' },
    });
    return rows.map(toContract);
  }

  /** Grants once; granting again returns the existing grant. Null when the account or venue does not exist. */
  async grant(input: GrantOwnership, grantedById: string): Promise<Ownership | null> {
    try {
      const row = await this.prisma.ownership.upsert({
        where: { accountId_venueId: input },
        create: { ...input, grantedById },
        update: {},
        include: withAccount,
      });
      return toContract(row);
    } catch (error) {
      if (isPrismaError(error, PrismaErrorCode.ForeignKeyViolation)) {
        return null;
      }
      throw error;
    }
  }

  async revoke(accountId: string, venueId: string): Promise<boolean> {
    const { count } = await this.prisma.ownership.deleteMany({ where: { accountId, venueId } });
    return count > 0;
  }
}

function toContract(row: OwnershipRow): Ownership {
  return {
    accountId: row.accountId,
    venueId: row.venueId,
    displayName: row.account.displayName,
    grantedAt: row.grantedAt.toISOString(),
  };
}
