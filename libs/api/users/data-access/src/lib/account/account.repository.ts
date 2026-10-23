import { Injectable } from '@nestjs/common';
import { PrismaService } from '@menu/api/shared/db';
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

export interface NewAccount {
  firebaseUid: string;
  displayName: string;
  isAdmin: boolean;
}

/** Maps between Prisma rows and the shared contract. The only code that touches `prisma.account`. */
@Injectable()
export class AccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The account for this sign-in, created on first sight. `isAdmin: true` promotes an existing account too. */
  async upsertByFirebaseUid(input: NewAccount): Promise<Account> {
    const row = await this.prisma.account.upsert({
      where: { firebaseUid: input.firebaseUid },
      create: input,
      update: input.isAdmin ? { isAdmin: true } : {},
    });
    return toAccount(row);
  }

  async findById(id: string): Promise<Account | null> {
    const row = await this.prisma.account.findUnique({ where: { id } });
    return row ? toAccount(row) : null;
  }

  async update(id: string, input: UpdateAccount): Promise<Account> {
    const row = await this.prisma.account.update({ where: { id }, data: withoutUndefined(input) });
    return toAccount(row);
  }

  async list(): Promise<AccountSummary[]> {
    const rows = await this.prisma.account.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map(toSummary);
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

function toAccount(row: AccountRow): Account {
  return {
    id: row.id,
    displayName: row.displayName,
    language: row.language,
    isAdmin: row.isAdmin,
    ownedVenueIds: [],
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
