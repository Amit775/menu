import { Injectable } from '@nestjs/common';
import { isPrismaError, PrismaErrorCode, PrismaService } from '@menu/api/shared/db';
import { withoutUndefined } from '@menu/api/shared/util';
import {
  type Account,
  type AccountSummary,
  type Language,
  type UpdateAccount,
} from '@menu/shared/contracts';

interface AccountRow {
  id: string;
  displayName: string;
  language: Language;
  isAdmin: boolean;
  createdAt: Date;
}

interface AccountWithOwnerships extends AccountRow {
  ownerships: { venueId: string }[];
}

/** Loads the venues an account owns with it: that is what makes it an Owner. */
const withOwnerships = { ownerships: { select: { venueId: true } } } as const;

export interface NewAccount {
  firebaseUid: string;
  displayName: string;
  isAdmin: boolean;
}

/** Maps between Prisma rows and the shared contract. The only code that touches `prisma.account`. */
@Injectable()
export class AccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The account for this sign-in, created on first sight. Reads first so a
   * signed-in request does not write; `input` only applies to a new account.
   */
  async findOrCreateByFirebaseUid(input: NewAccount): Promise<Account> {
    const existing = await this.findByFirebaseUid(input.firebaseUid);
    if (existing) {
      return existing;
    }
    try {
      const row = await this.prisma.account.upsert({
        where: { firebaseUid: input.firebaseUid },
        create: input,
        update: {},
        include: withOwnerships,
      });
      return toAccount(row);
    } catch (error) {
      // A new user's first requests arrive together; one of them creates the account.
      const created = isPrismaError(error, PrismaErrorCode.UniqueViolation)
        ? await this.findByFirebaseUid(input.firebaseUid)
        : null;
      if (!created) {
        throw error;
      }
      return created;
    }
  }

  private async findByFirebaseUid(firebaseUid: string): Promise<Account | null> {
    const row = await this.prisma.account.findUnique({
      where: { firebaseUid },
      include: withOwnerships,
    });
    return row ? toAccount(row) : null;
  }

  async findById(id: string): Promise<Account | null> {
    const row = await this.prisma.account.findUnique({ where: { id }, include: withOwnerships });
    return row ? toAccount(row) : null;
  }

  async update(id: string, input: UpdateAccount): Promise<Account | null> {
    const { count } = await this.prisma.account.updateMany({
      where: { id },
      data: withoutUndefined(input),
    });
    return count === 0 ? null : this.findById(id);
  }

  async list(): Promise<AccountSummary[]> {
    const rows = await this.prisma.account.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map(toSummary);
  }

  async displayNames(ids: readonly string[]): Promise<Map<string, string>> {
    const rows = await this.prisma.account.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, displayName: true },
    });
    return new Map(rows.map((row) => [row.id, row.displayName]));
  }

  async setAdmin(id: string, isAdmin: boolean): Promise<AccountSummary | null> {
    const { count } = await this.prisma.account.updateMany({ where: { id }, data: { isAdmin } });
    if (count === 0) {
      return null;
    }
    const row = await this.prisma.account.findUniqueOrThrow({ where: { id } });
    return toSummary(row);
  }
}

function toAccount(row: AccountWithOwnerships): Account {
  return {
    id: row.id,
    displayName: row.displayName,
    language: row.language,
    isAdmin: row.isAdmin,
    ownedVenueIds: row.ownerships.map((ownership) => ownership.venueId),
    createdAt: row.createdAt.toISOString(),
  };
}

function toSummary(row: AccountRow): AccountSummary {
  return {
    id: row.id,
    displayName: row.displayName,
    isAdmin: row.isAdmin,
    createdAt: row.createdAt.toISOString(),
  };
}
