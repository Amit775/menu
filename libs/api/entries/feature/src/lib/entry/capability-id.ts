import { randomBytes } from 'node:crypto';

/** 16 random bytes: 22 URL-safe characters, unguessable. Share tokens and photo ids. */
export function newCapabilityId(): string {
  return randomBytes(16).toString('base64url');
}
