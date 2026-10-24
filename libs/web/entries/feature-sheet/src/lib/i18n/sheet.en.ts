import type { he } from './sheet.he';

export const en = {
  close: 'Close',
  title: '{count, plural, =1 {What people say · 1 public} other {What people say · # public}}',
  yours: 'Your entries',
  everyone: 'Everyone · newest first',
  noneYet: 'No public entries on this item yet.',
  edit: 'Edit',
  makePublic: 'Make public',
  confirmPublic: 'Confirm: everyone sees it',
  publicHint: 'Everyone will see this entry under your name. Tap again to confirm.',
  hide: 'Hide',
  confirmHide: 'Hide it?',
  hideHint:
    'Admin: the entry is hidden from everyone; its author still sees it. Tap again to confirm.',
  share: 'Share',
  copied: 'Link copied',
  shareFailed: 'Could not share. Try again.',
  updateFailed: 'The change was not saved. Try again.',
  logAgain: 'I had it again · new entry',
  logFirst: 'I had this · new entry',
  loading: 'Loading…',
  loadFailed: 'Could not load the entries.',
  retry: 'Try again',
  notFound: 'This item was not found.',
  toFeed: 'To discover',
} satisfies typeof he;
