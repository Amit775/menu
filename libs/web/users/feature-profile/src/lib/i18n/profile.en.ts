import type { he } from './profile.he';

export const en = {
  title: 'Profile',
  signedOutTitle: 'Your diary is waiting',
  signedOutText: 'Sign in to keep what you ate, rate it and share it.',
  signIn: 'Sign in',
  diary: 'My diary',
  wantToTry: 'Want to try',
  name: 'Name shown beside your public entries',
  save: 'Save',
  saved: 'Saved',
  saveFailed: 'Could not save.',
  loadFailed: 'Could not load your account.',
  language: 'Language',
  hebrew: 'עברית',
  english: 'English',
  contributorTitle: 'Become a Contributor',
  contributorIntro:
    'Contributors add items to any menu without waiting for approval, edit items and their variations, and add photos. Tell us briefly why.',
  contributorNote: 'Why would you like to contribute?',
  contributorNoteHint: 'Up to 500 characters. Only Admins see it.',
  contributorApply: 'Apply',
  contributorApplyFailed: 'The application was not sent. Try again.',
  contributorPending: 'Your application is with the Admins. This shows when it is approved.',
  contributorRejected: 'Your application was not approved this time. You can apply again {date}.',
  contributorLoadFailed: 'Could not load your application.',
  contributorYes:
    'You are a Contributor: you can add items to any menu at once, edit items and add their photos.',
  retry: 'Try again',
  signOut: 'Sign out',
} satisfies typeof he;
