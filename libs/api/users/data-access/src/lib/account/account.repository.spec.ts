import { type PrismaService } from '@menu/api/shared/db';
import { AccountRepository } from './account.repository';

describe('AccountRepository', () => {
  const row = {
    id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    firebaseUid: 'uid-1',
    displayName: 'נועה',
    language: 'he' as const,
    isAdmin: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ownerships: [],
  };
  const account = {
    id: row.id,
    displayName: 'נועה',
    language: 'he',
    isAdmin: false,
    ownedVenueIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  function repositoryWith(model: Record<string, unknown>): AccountRepository {
    return new AccountRepository({ account: model } as unknown as PrismaService);
  }

  it('creates the account on first sign-in and maps it to the contract', async () => {
    const upsert = vi.fn().mockResolvedValue(row);
    const repository = repositoryWith({ findUnique: vi.fn().mockResolvedValue(null), upsert });
    await expect(
      repository.findOrCreateByFirebaseUid({
        firebaseUid: 'uid-1',
        displayName: 'נועה',
        isAdmin: false,
      }),
    ).resolves.toEqual(account);
    expect(upsert).toHaveBeenCalledWith({
      where: { firebaseUid: 'uid-1' },
      create: { firebaseUid: 'uid-1', displayName: 'נועה', isAdmin: false },
      update: {},
      include: { ownerships: { select: { venueId: true } } },
    });
  });

  it('returns an existing account without writing or changing its role', async () => {
    const upsert = vi.fn();
    const repository = repositoryWith({ findUnique: vi.fn().mockResolvedValue(row), upsert });
    await expect(
      repository.findOrCreateByFirebaseUid({
        firebaseUid: 'uid-1',
        displayName: '',
        isAdmin: true,
      }),
    ).resolves.toEqual(account);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('updates an account and returns it', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const repository = repositoryWith({
      updateMany,
      findUnique: vi.fn().mockResolvedValue({ ...row, language: 'en' }),
    });
    await expect(
      repository.update(row.id, { language: 'en', displayName: undefined }),
    ).resolves.toEqual({ ...account, language: 'en' });
    expect(updateMany).toHaveBeenCalledWith({ where: { id: row.id }, data: { language: 'en' } });
  });

  it('returns null when updating an unknown account', async () => {
    const repository = repositoryWith({ updateMany: vi.fn().mockResolvedValue({ count: 0 }) });
    await expect(repository.update(row.id, { language: 'en' })).resolves.toBeNull();
  });

  it('makes an account the Owner of the venues it was granted', async () => {
    const venueId = '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
    const repository = repositoryWith({
      findUnique: vi.fn().mockResolvedValue({ ...row, ownerships: [{ venueId }] }),
    });
    await expect(repository.findById(row.id)).resolves.toMatchObject({ ownedVenueIds: [venueId] });
  });

  it('returns null for an unknown account', async () => {
    const repository = repositoryWith({ findUnique: vi.fn().mockResolvedValue(null) });
    await expect(repository.findById(row.id)).resolves.toBeNull();
  });

  it('returns null when setting the Admin flag of an unknown account', async () => {
    const repository = repositoryWith({ updateMany: vi.fn().mockResolvedValue({ count: 0 }) });
    await expect(repository.setAdmin(row.id, true)).resolves.toBeNull();
  });

  it('lists accounts as summaries', async () => {
    const repository = repositoryWith({ findMany: vi.fn().mockResolvedValue([row]) });
    await expect(repository.list()).resolves.toEqual([
      { id: row.id, displayName: 'נועה', isAdmin: false, createdAt: '2026-01-01T00:00:00.000Z' },
    ]);
  });
});
