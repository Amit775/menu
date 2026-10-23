import { Test } from '@nestjs/testing';
import { TagController } from './tag.controller';
import { TagService } from './tag.service';

describe('TagController', () => {
  it('lists the vocabulary through the service', async () => {
    const list = vi.fn().mockResolvedValue([]);
    const moduleRef = await Test.createTestingModule({
      controllers: [TagController],
      providers: [{ provide: TagService, useValue: { list } }],
    }).compile();
    await expect(moduleRef.get(TagController).list()).resolves.toEqual([]);
  });
});
