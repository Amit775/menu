import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { type ItemRecord } from '@menu/api/menus/data-access';
import { type Principal } from '@menu/api/shared/util-auth';
import { MenuItem } from './menu-item';

describe('MenuItem', () => {
  const venueId = '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
  const record: ItemRecord = {
    id: 'i1',
    venueId,
    sectionId: 's1',
    name: { he: 'המבורגר', en: null },
    description: null,
    listPrice: null,
    tagIds: [],
    variations: [],
    state: 'pending',
    mergedIntoId: null,
    submittedById: 'submitter',
    position: 0,
    photoUrl: null,
    photoId: null,
    photoType: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
  const user = (accountId: string): Principal => ({
    accountId,
    isAdmin: false,
    isContributor: false,
    language: 'he',
    ownedVenueIds: [],
  });
  const submitter = user('submitter');
  const stranger = user('stranger');
  const owner: Principal = { ...user('owner'), ownedVenueIds: [venueId] };
  const admin: Principal = { ...user('admin'), isAdmin: true };
  const contributor: Principal = { ...user('contributor'), isContributor: true };
  const pending = new MenuItem(record);
  const approved = new MenuItem({ ...record, state: 'approved' });

  it('shows a pending item to its submitter and approvers only', () => {
    expect(pending.isVisibleTo(submitter)).toBe(true);
    expect(pending.isVisibleTo(owner)).toBe(true);
    expect(pending.isVisibleTo(admin)).toBe(true);
    expect(pending.isVisibleTo(stranger)).toBe(false);
    expect(pending.isVisibleTo(null)).toBe(false);
  });

  it('keeps pending items from a Contributor who did not submit them', () => {
    expect(pending.isVisibleTo(contributor)).toBe(false);
  });

  it('lets a Contributor edit an approved item at any venue', () => {
    expect(() => {
      approved.assertEditableBy(contributor);
    }).not.toThrow();
    expect(() => {
      approved.assertEditableBy(stranger);
    }).toThrow(ForbiddenException);
  });

  it('lets a Contributor edit only approved items, even a pending one they sent', () => {
    const own = new MenuItem({ ...record, submittedById: 'contributor' });
    expect(() => {
      own.assertEditableBy(contributor);
    }).toThrow(ConflictException);
  });

  it('never lets a Contributor decide, archive or merge', () => {
    expect(() => pending.assertDecision(contributor, 'approve')).toThrow(ForbiddenException);
    expect(() => pending.assertDecision(contributor, 'merge')).toThrow(ForbiddenException);
    expect(() => approved.assertDecision(contributor, 'archive')).toThrow(ForbiddenException);
  });

  it('shows approved items to everyone', () => {
    expect(approved.isVisibleTo(null)).toBe(true);
  });

  it('accepts entries on a pending item from its submitter only', () => {
    expect(pending.acceptsEntryFrom(submitter)).toBe(true);
    expect(pending.acceptsEntryFrom(owner)).toBe(false);
    expect(approved.acceptsEntryFrom(stranger)).toBe(true);
    expect(new MenuItem({ ...record, state: 'archived' }).acceptsEntryFrom(stranger)).toBe(false);
  });

  it('lets approvers decide on a pending item', () => {
    expect(pending.assertDecision(owner, 'approve')).toBe('pending');
    expect(pending.assertDecision(admin, 'reject')).toBe('pending');
  });

  it('forbids anyone else from deciding, the submitter included', () => {
    expect(() => pending.assertDecision(submitter, 'approve')).toThrow(ForbiddenException);
  });

  it('refuses a decision that does not fit the state', () => {
    expect(() => approved.assertDecision(owner, 'approve')).toThrow(ConflictException);
    expect(() => pending.assertDecision(owner, 'archive')).toThrow(ConflictException);
    expect(approved.assertDecision(owner, 'archive')).toBe('approved');
  });

  it('merges only into an approved item of the same venue', () => {
    expect(() => {
      pending.assertCanMergeInto(approved);
    }).not.toThrow();
    expect(() => {
      pending.assertCanMergeInto(pending);
    }).toThrow(BadRequestException);
    expect(() => {
      pending.assertCanMergeInto(new MenuItem({ ...record, state: 'approved', venueId: 'other' }));
    }).toThrow(BadRequestException);
  });

  it('never exposes the submitter, only whether the caller is them', () => {
    expect(pending.toContract(owner)).not.toHaveProperty('submittedById');
    expect(pending.toContract(owner).submittedByMe).toBe(false);
    expect(pending.toContract(submitter).submittedByMe).toBe(true);
  });
});
