import { NotFoundException } from '@nestjs/common';
import { type EntryRecord } from '@menu/api/entries/data-access';
import { type Principal } from '@menu/api/shared/util-auth';
import { DiaryEntry } from './diary-entry';

describe('DiaryEntry', () => {
  const itemRef = {
    id: 'i1',
    name: { he: 'המבורגר' },
    listPrice: 6800,
    venue: { id: 'v1', name: { he: 'מוזס' } } };
  const author: Principal = { accountId: 'a1', isAdmin: false, language: 'he', ownedVenueIds: [] };
  const admin: Principal = { ...author, accountId: 'x', isAdmin: true };
  const record: EntryRecord = {
    id: 'e1',
    authorId: 'a1',
    itemId: 'i1',
    venueId: 'v1',
    eatenAt: '2026-10-20T19:30:00.000Z',
    rating: 4,
    wouldOrderAgain: true,
    pricePaid: 6800,
    text: 'טעים',
    visibility: 'shared',
    shareToken: 'abcdefghijklmnopqrstuv',
    hidden: false,
    createdAt: '2026-10-20T20:00:00.000Z',
    updatedAt: '2026-10-20T20:00:00.000Z',
  };

  it('hides its existence from anyone but the author, Admins included', () => {
    expect(() => {
      new DiaryEntry(record).assertAuthor(admin);
    }).toThrow(NotFoundException);
    expect(() => {
      new DiaryEntry(record).assertAuthor(author);
    }).not.toThrow();
  });

  it('never exposes the author’s id', () => {
    expect(new DiaryEntry(record).toContract()).not.toHaveProperty('authorId');
    expect(new DiaryEntry(record).toPublic('נועה')).not.toHaveProperty('authorId');
  });

  it('needs a share token once it is no longer private', () => {
    expect(new DiaryEntry({ ...record, shareToken: null }).needsShareToken()).toBe(true);
    expect(
      new DiaryEntry({ ...record, visibility: 'private', shareToken: null }).needsShareToken(),
    ).toBe(false);
  });

  describe('by its share link', () => {
    it('shows a shared entry with its author’s name', () => {
      expect(new DiaryEntry(record).sharedView('נועה', itemRef)).toMatchObject({
        status: 'visible',
        entry: { authorName: 'נועה', text: 'טעים' },
      });
    });

    it('says an entry made private is private, and nothing else', () => {
      expect(
        new DiaryEntry({ ...record, visibility: 'private' }).sharedView('נועה', itemRef),
      ).toEqual({
        status: 'private',
      });
    });

    it('treats an entry on an item that is not public as private', () => {
      expect(new DiaryEntry(record).sharedView('נועה', null)).toEqual({ status: 'private' });
    });

    it('reads as private when it is private, hidden or not', () => {
      const hiddenPrivate = { ...record, visibility: 'private' as const, hidden: true };
      expect(new DiaryEntry(hiddenPrivate).sharedView('נועה', itemRef)).toEqual({
        status: 'private',
      });
    });

    it('reads as removed once an Admin hid it', () => {
      expect(new DiaryEntry({ ...record, hidden: true }).sharedView('נועה', itemRef)).toEqual({
        status: 'removed',
      });
    });
  });
});
