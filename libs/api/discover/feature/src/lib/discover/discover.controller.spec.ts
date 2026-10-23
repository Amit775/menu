import { Test } from '@nestjs/testing';
import { AUTH_REQUIREMENT } from '@menu/api/shared/util-auth';
import { DiscoverController } from './discover.controller';
import { DiscoverService } from './discover.service';

describe('DiscoverController', () => {
  it('passes the search text to the service', async () => {
    const search = vi.fn().mockResolvedValue({ items: [], venues: [], tags: [] });
    const moduleRef = await Test.createTestingModule({
      controllers: [DiscoverController],
      providers: [{ provide: DiscoverService, useValue: { search } }],
    }).compile();
    await moduleRef.get(DiscoverController).search(null, { q: 'בורגר' });
    expect(search).toHaveBeenCalledWith(null, 'בורגר');
  });

  it('opens every view to visitors except insights', () => {
    const requirement = (method: string): unknown =>
      Reflect.getMetadata(
        AUTH_REQUIREMENT,
        Object.getOwnPropertyDescriptor(DiscoverController.prototype, method)?.value as object,
      );
    expect(['feed', 'map', 'search', 'venue', 'item'].map(requirement)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
    expect(requirement('insights')).toBe('signed-in');
  });
});
