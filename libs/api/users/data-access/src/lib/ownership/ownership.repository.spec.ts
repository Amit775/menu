import { type PrismaService } from '@menu/api/shared/db';
import { OwnershipRepository } from './ownership.repository';

describe('OwnershipRepository', () => {
  const ids = {
    accountId: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    venueId: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
  };
  const row = {
    ...ids,
    grantedAt: new Date('2026-01-01T00:00:00.000Z'),
    account: { displayName: 'יוסי' },
  };
  const ownership = { ...ids, displayName: 'יוסי', grantedAt: '2026-01-01T00:00:00.000Z' };

  function repositoryWith(model: Record<string, unknown>): OwnershipRepository {
    return new OwnershipRepository({ ownership: model } as unknown as PrismaService);
  }

  it('lists the Owners of a venue with their names', async () => {
    const repository = repositoryWith({ findMany: vi.fn().mockResolvedValue([row]) });
    await expect(repository.listByVenue(ids.venueId)).resolves.toEqual([ownership]);
  });

  it('grants idempotently and records who granted it', async () => {
    const upsert = vi.fn().mockResolvedValue(row);
    await expect(repositoryWith({ upsert }).grant(ids, 'admin-id')).resolves.toEqual(ownership);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: { ...ids, grantedById: 'admin-id' }, update: {} }),
    );
  });

  it('returns null when the account or venue does not exist', async () => {
    const repository = repositoryWith({ upsert: vi.fn().mockRejectedValue({ code: 'P2003' }) });
    await expect(repository.grant(ids, 'admin-id')).resolves.toBeNull();
  });

  it('reports whether a grant was revoked', async () => {
    const repository = repositoryWith({ deleteMany: vi.fn().mockResolvedValue({ count: 0 }) });
    await expect(repository.revoke(ids.accountId, ids.venueId)).resolves.toBe(false);
  });
});
