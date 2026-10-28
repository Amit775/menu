import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { type SharedEntryView } from '@menu/shared/contracts';
import { EntryService } from '../entry/entry.service';
import { SharePreviewService } from './share-preview.service';
import { WebShell } from './web-shell';

describe('SharePreviewService', () => {
  const token = 'abcdefghijklmnopqrstuv';
  const page = '<html><head><title>Menu</title></head><body><menu-root></menu-root></body></html>';
  const visible: SharedEntryView = {
    status: 'visible',
    entry: {
      id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
      itemId: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
      variationId: null,
      venueId: '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10',
      eatenAt: '2026-10-20T19:30:00.000Z',
      rating: 4,
      wouldOrderAgain: null,
      pricePaid: null,
      text: '',
      authorName: 'דנה',
      photoUrl: '/api/photos/bcdefghijklmnopqrstuvw',
      createdAt: '2026-10-20T20:00:00.000Z',
    },
    item: {
      id: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
      name: { he: 'פיצה', en: null },
      listPrice: null,
      venue: { id: '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10', name: { he: 'מוזס', en: null } },
      variations: [],
    },
  };

  async function setup(shared: unknown, html: string | null = page) {
    const get = vi.fn().mockResolvedValue(html);
    const moduleRef = await Test.createTestingModule({
      providers: [
        SharePreviewService,
        { provide: EntryService, useValue: { shared } },
        { provide: WebShell, useValue: { get } },
      ],
    }).compile();
    return { service: moduleRef.get(SharePreviewService), get };
  }

  it('puts a visible entry’s preview in the app’s page from the host the link was opened on', async () => {
    const shared = vi.fn().mockResolvedValue(visible);
    const { service, get } = await setup(shared);
    const html = await service.page(token, 'menu-b29eb--pr9-x.web.app');
    expect(shared).toHaveBeenCalledWith(token);
    expect(get).toHaveBeenCalledWith('https://menu-b29eb--pr9-x.web.app');
    expect(html).toContain('<meta property="og:title" content="פיצה · מוזס" />');
    expect(html).toContain(
      '<meta property="og:image" content="https://menu-b29eb--pr9-x.web.app/api/photos/bcdefghijklmnopqrstuvw" />',
    );
    expect(html).toContain('<menu-root></menu-root>');
  });

  it('gives a malformed token the generic preview without looking it up', async () => {
    const shared = vi.fn();
    const html = await (await setup(shared)).service.page('nope', undefined);
    expect(shared).not.toHaveBeenCalled();
    expect(html).toContain('<meta property="og:title" content="Menu" />');
  });

  it('still answers with the generic preview when the entry cannot be read', async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const shared = vi.fn().mockRejectedValue(new Error('db down'));
    const html = await (await setup(shared)).service.page(token, undefined);
    expect(html).toContain('<meta property="og:title" content="Menu" />');
    expect(html).not.toContain('og:image');
  });

  it('falls back to a small page with a link home when the app’s page is out of reach', async () => {
    const shared = vi.fn().mockResolvedValue({ status: 'removed' });
    const html = await (await setup(shared, null)).service.page(token, undefined);
    expect(html).toContain('og:title');
    expect(html).toContain('<a href="/">');
  });
});
