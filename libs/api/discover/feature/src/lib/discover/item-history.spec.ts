import { type ItemRevisionRecord } from '@menu/api/discover/data-access';
import { type ItemSnapshot, type ItemVariation, type Tag } from '@menu/shared/contracts';
import { itemHistory } from './item-history';

describe('itemHistory', () => {
  const mains = '1b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
  const drinks = '2b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
  const sections = [
    { id: mains, name: { he: 'עיקריות', en: 'Mains' } },
    { id: drinks, name: { he: 'שתייה', en: 'Drinks' } },
  ];
  const burger: Tag = {
    id: 't1',
    slug: 'burger',
    name: { he: 'המבורגר', en: 'Burger' },
    kind: 'dish',
  };
  const vegan: Tag = { id: 't2', slug: 'vegan', name: { he: 'טבעוני', en: 'Vegan' }, kind: 'diet' };
  const base: ItemSnapshot = {
    name: { he: 'המבורגר', en: 'Burger' },
    description: null,
    listPrice: { value: 58, currency: 'ILS' },
    sectionId: mains,
    tagIds: ['t1'],
    variations: [],
  };

  function revision(
    kind: ItemRevisionRecord['kind'],
    day: number,
    snapshot: Partial<ItemSnapshot> = {},
  ): ItemRevisionRecord {
    return {
      kind,
      snapshot: { ...base, ...snapshot },
      changedAt: `2026-10-${String(day).padStart(2, '0')}T10:00:00.000Z`,
    };
  }

  function history(revisions: ItemRevisionRecord[]) {
    return itemHistory(revisions, sections, [burger, vegan]);
  }

  it('starts with the item reaching the menu at its price', () => {
    expect(history([revision('created', 1)])).toEqual([
      { kind: 'added', at: '2026-10-01T10:00:00.000Z', listPrice: { value: 58, currency: 'ILS' } },
    ]);
  });

  it('hides what happened while the item was pending', () => {
    const events = history([
      revision('submitted', 1, { listPrice: null }),
      revision('updated', 2, { name: { he: 'בורגר', en: null } }),
      revision('approved', 3),
    ]);
    expect(events).toEqual([
      { kind: 'added', at: '2026-10-03T10:00:00.000Z', listPrice: { value: 58, currency: 'ILS' } },
    ]);
  });

  it('shows nothing for an item that never reached the menu', () => {
    expect(history([revision('submitted', 1), revision('rejected', 2)])).toEqual([]);
  });

  it('lists changes newest first, with section and tag names', () => {
    const events = history([
      revision('created', 1),
      revision('updated', 2, { listPrice: { value: 64, currency: 'ILS' } }),
      revision('updated', 3, {
        listPrice: { value: 64, currency: 'ILS' },
        sectionId: drinks,
        tagIds: ['t2'],
      }),
    ]);
    expect(events.map((event) => event.at)).toEqual([
      '2026-10-03T10:00:00.000Z',
      '2026-10-02T10:00:00.000Z',
      '2026-10-01T10:00:00.000Z',
    ]);
    expect(events[1]).toEqual({
      kind: 'changed',
      at: '2026-10-02T10:00:00.000Z',
      changes: [
        {
          field: 'listPrice',
          from: { value: 58, currency: 'ILS' },
          to: { value: 64, currency: 'ILS' },
        },
      ],
    });
    expect(events[0]).toMatchObject({
      changes: [
        {
          field: 'section',
          from: { he: 'עיקריות', en: 'Mains' },
          to: { he: 'שתייה', en: 'Drinks' },
        },
        { field: 'tags', added: [vegan.name], removed: [burger.name] },
      ],
    });
  });

  it('says a name and description changed', () => {
    const [event] = history([
      revision('created', 1),
      revision('updated', 2, {
        name: { he: 'המבורגר', en: 'Hamburger' },
        description: { he: 'קציצת בקר', en: null },
      }),
    ]);
    expect(event).toMatchObject({
      changes: [
        { field: 'name', from: base.name, to: { he: 'המבורגר', en: 'Hamburger' } },
        { field: 'description' },
      ],
    });
  });

  it('skips an edit that changed nothing shown, such as tag order or a deleted tag', () => {
    const events = history([
      revision('created', 1, { tagIds: ['t1', 't2'] }),
      revision('updated', 2, { tagIds: ['t2', 't1'] }),
      revision('updated', 3, { tagIds: ['t2', 't1', 'gone'] }),
    ]);
    expect(events).toHaveLength(1);
  });

  it('tells which variations came, went, or stopped and started being offered, and their prices', () => {
    const variation = (id: string, he: string, overrides: Partial<ItemVariation> = {}) => ({
      id,
      name: { he, en: null },
      price: null,
      tagIds: [],
      available: true,
      ...overrides,
    });
    const [event] = history([
      revision('created', 1, {
        variations: [
          variation('v1', 'בקר'),
          variation('v2', 'עוף'),
          variation('v3', 'דלעת', { available: false }),
        ],
      }),
      revision('updated', 2, {
        variations: [
          variation('v1', 'בקר', { price: { value: 64, currency: 'ILS' }, available: false }),
          variation('v3', 'דלעת'),
          variation('v4', 'טבעוני', { tagIds: ['t2'] }),
        ],
      }),
    ]);
    expect(event).toMatchObject({
      changes: [
        {
          field: 'variations',
          added: [{ he: 'טבעוני', en: null }],
          removed: [{ he: 'עוף', en: null }],
          nowAvailable: [{ he: 'דלעת', en: null }],
          nowUnavailable: [{ he: 'בקר', en: null }],
        },
        {
          field: 'variationPrice',
          variation: { he: 'בקר', en: null },
          from: null,
          to: { value: 64, currency: 'ILS' },
        },
      ],
    });
  });

  it('marks the item leaving the menu', () => {
    const [event] = history([revision('created', 1), revision('archived', 9)]);
    expect(event).toEqual({ kind: 'archived', at: '2026-10-09T10:00:00.000Z' });
  });

  it('shows a section that no longer exists as unnamed', () => {
    const [event] = history([
      revision('created', 1, { sectionId: '9b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10' }),
      revision('updated', 2),
    ]);
    expect(event).toMatchObject({
      changes: [{ field: 'section', from: null, to: { he: 'עיקריות', en: 'Mains' } }],
    });
  });
});
