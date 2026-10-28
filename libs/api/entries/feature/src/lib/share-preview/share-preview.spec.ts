import { type SharedEntryView } from '@menu/shared/contracts';
import { previewMeta, renderPreview, webOrigin } from './share-preview';

describe('share previews', () => {
  const origin = 'https://menu-b29eb.web.app';
  const token = 'abcdefghijklmnopqrstuv';
  const visible: SharedEntryView = {
    status: 'visible',
    entry: {
      id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
      itemId: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
      variationId: null,
      venueId: '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10',
      eatenAt: '2026-10-20T19:30:00.000Z',
      rating: 5,
      wouldOrderAgain: true,
      pricePaid: null,
      text: 'מדיום מושלם',
      authorName: 'דנה',
      photoUrl: '/api/photos/bcdefghijklmnopqrstuvw',
      createdAt: '2026-10-20T20:00:00.000Z',
    },
    item: {
      id: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
      name: { he: 'המבורגר הבית', en: 'House burger' },
      listPrice: null,
      venue: { id: '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10', name: { he: 'מוזס', en: null } },
      variations: [],
    },
  };

  describe('previewMeta', () => {
    it('names the item, venue, rating, words and author of a visible entry, with its photo', () => {
      expect(previewMeta(visible, origin, token)).toEqual({
        title: 'המבורגר הבית · מוזס',
        description: '★ 5 · מדיום מושלם · דנה',
        image: `${origin}/api/photos/bcdefghijklmnopqrstuvw`,
        url: `${origin}/e/${token}`,
      });
    });

    it('cuts long words short', () => {
      const long = { ...visible, entry: { ...visible.entry, text: 'א'.repeat(300) } };
      expect(previewMeta(long, origin, token).description).toBe(`★ 5 · ${'א'.repeat(120)}… · דנה`);
    });

    it('gives a private or removed entry the same generic preview, revealing nothing', () => {
      const generic = {
        title: 'Menu',
        description: 'מה שווה להזמין במסעדות ובברים, מרשומות של סועדים.',
        image: null,
        url: `${origin}/e/${token}`,
      };
      expect(previewMeta({ status: 'private' }, origin, token)).toEqual(generic);
      expect(previewMeta({ status: 'removed' }, origin, token)).toEqual(generic);
    });
  });

  describe('renderPreview', () => {
    const shell =
      '<!doctype html><html lang="he"><head><meta charset="utf-8" /><title>Menu</title></head><body><menu-root></menu-root></body></html>';

    it('puts the tags in the app’s page, which keeps loading the app', () => {
      const html = renderPreview(shell, {
        title: 'פיצה "מרגריטה" <b>',
        description: 'טעים & חם',
        image: `${origin}/api/photos/bcdefghijklmnopqrstuvw`,
        url: `${origin}/e/${token}`,
      });
      expect(html).toContain('<title>פיצה &quot;מרגריטה&quot; &lt;b&gt;</title>');
      expect(html).toContain(
        '<meta property="og:title" content="פיצה &quot;מרגריטה&quot; &lt;b&gt;" />',
      );
      expect(html).toContain('<meta property="og:description" content="טעים &amp; חם" />');
      expect(html).toContain(
        `<meta property="og:image" content="${origin}/api/photos/bcdefghijklmnopqrstuvw" />`,
      );
      expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
      expect(html).toContain('<meta name="robots" content="noindex" />');
      expect(html).toContain('<menu-root></menu-root>');
      expect(html.match(/<title>/g)).toHaveLength(1);
    });

    it('writes dollar signs in a diner’s words as they are', () => {
      const html = renderPreview(shell, {
        title: "a $' b $& c",
        description: '$` $$',
        image: null,
        url: origin,
      });
      expect(html).toContain("<title>a $' b $&amp; c</title>");
      expect(html).toContain('<meta property="og:description" content="$` $$" />');
      expect(html.match(/<menu-root>/g)).toHaveLength(1);
    });

    it('leaves out the image tags when there is no photo', () => {
      const html = renderPreview(shell, {
        title: 'Menu',
        description: 'x',
        image: null,
        url: origin,
      });
      expect(html).not.toContain('og:image');
      expect(html).toContain('<meta name="twitter:card" content="summary" />');
    });
  });

  describe('webOrigin', () => {
    it('trusts the site and its preview channels only', () => {
      expect(webOrigin('menu-b29eb.web.app', 'menu-b29eb')).toBe('https://menu-b29eb.web.app');
      expect(webOrigin('menu-b29eb--pr32-abc123.web.app', 'menu-b29eb')).toBe(
        'https://menu-b29eb--pr32-abc123.web.app',
      );
      expect(webOrigin('menu-b29eb.firebaseapp.com', 'menu-b29eb')).toBe(
        'https://menu-b29eb.firebaseapp.com',
      );
    });

    it('falls back to the site for any other host', () => {
      for (const host of [undefined, 'evil.example', 'menu-b29eb.web.app.evil.example', '']) {
        expect(webOrigin(host, 'menu-b29eb')).toBe('https://menu-b29eb.web.app');
      }
    });
  });
});
