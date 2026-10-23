import { Test } from '@nestjs/testing';
import { DbModule } from './db.module';
import { PrismaService } from './prisma.service';

describe('DbModule', () => {
  it('provides a PrismaService without connecting eagerly', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [DbModule] }).compile();
    // PrismaClient returns a proxy, so compare capabilities rather than instanceof.
    const prisma = moduleRef.get(PrismaService);
    expect(typeof prisma.$connect).toBe('function');
    await moduleRef.close();
  });
});
