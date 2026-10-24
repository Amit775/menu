import type { he } from './sign-in.he';

export const en = {
  title: 'Sign in',
  intro: 'To keep what you ate, where, and what it cost.',
  google: 'Continue with Google',
  or: 'or',
  phone: 'Phone number',
  phoneHint: 'We will text you a code',
  sendCode: 'Send code',
  code: 'The code you got',
  confirm: 'Sign in',
  changePhone: 'Another number',
  errorInvalidPhone: 'That number does not look right.',
  errorInvalidCode: 'That code is wrong. Try again.',
  errorTooMany: 'Too many tries. Try again in a few minutes.',
  errorFailed: 'Sign-in did not work. Try again.',
} satisfies typeof he;
