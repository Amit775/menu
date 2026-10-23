import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TagRepository } from '@menu/api/menus/data-access';
import { TagService } from './tag.service';

describe('TagService', () => {
  const input = { slug: 'vegan', name: { he: 'טבעוני' }, kind: 'diet' as const };

  async function setup(repository: Partial<Record<keyof TagRepository, unknown>>): Promise<TagService> {
    const moduleRef = await Test.createTestingModule({
      providers: [TagService, { provide: TagRepository, useValue: repository }],
    }).compile();
    return moduleRef.get(TagService);
  }

  it('creates a tag', async () => {
    const service = await setup({ create: vi.fn().mockResolvedValue({ id: 't', ...input }) });
    await expect(service.create(input)).resolves.toMatchObject({ slug: 'vegan' });
  });

  it('fails with 409 for a taken slug', async () => {
    const service = await setup({ create: vi.fn().mockResolvedValue(null) });
    await expect(service.create(input)).rejects.toThrow(ConflictException);
  });

  it('fails with 404 when updating an unknown tag', async () => {
    const service = await setup({ update: vi.fn().mockResolvedValue(null) });
    await expect(service.update('t', { kind: 'dish' })).rejects.toThrow(NotFoundException);
  });
});
