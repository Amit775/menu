import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

export const DEFAULT_DATABASE_URL = 'postgresql://menu:menu@localhost:5432/menu';

/**
 * The only PrismaClient in the API. Repositories in `libs/api/<domain>/data-access`
 * inject this service; nothing else talks to the database.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({
      adapter: new PrismaPg({
        connectionString: process.env['DATABASE_URL'] ?? DEFAULT_DATABASE_URL,
      }),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
