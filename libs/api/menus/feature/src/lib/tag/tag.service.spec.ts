import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ItemRepository, TagRepository } from '@menu/api/menus/data-access';
import { TagService } from './tag.service';

describe('TagService', () => {
  const input = { slug: 'vegan', name: { he: 'טבעוני' }, kind: 'diet' as const };

  async function setup(
    repository: Partial<Record<keyof TagRepository, unknown>>,
    items: Partial<Record<keyof ItemRepository, unknown>> = {},
  ): Promise<TagService> {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TagService,
        { provide: TagRepository, useValue: repository },
        { provide: ItemRepository, useValue: items },
      ],
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

  it('merges a duplicate tag into another', async () => {
    const mergeTag = vi.fn().mockResolvedValue(undefined);
    const service = await setup({}, { tagsExist: vi.fn().mockResolvedValue(true), mergeTag });
    await service.merge('t1', 't2');
    expect(mergeTag).toHaveBeenCalledWith('t1', 't2');
  });

  it('fails with 404 when merging an unknown tag', async () => {
    const service = await setup(
      {},
      { tagsExist: vi.fn().mockResolvedValue(false), mergeTag: vi.fn() },
    );
    await expect(service.merge('t1', 't2')).rejects.toThrow(NotFoundException);
  });

  it('rejects merging a tag into itself', async () => {
    const service = await setup({}, { tagsExist: vi.fn(), mergeTag: vi.fn() });
    await expect(service.merge('t1', 't1')).rejects.toThrow(BadRequestException);
  });
});
