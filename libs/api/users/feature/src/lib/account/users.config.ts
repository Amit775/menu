export interface UsersConfig {
  /**
   * Firebase uids whose account is created as an Admin on first sign-in, so the
   * first Admin needs no database access. Only applies to new accounts: removing
   * an Admin through the API sticks, and removing a uid here changes nothing.
   */
  bootstrapAdminUids: readonly string[];
}

export const USERS_CONFIG = Symbol('USERS_CONFIG');

export function usersConfigFromEnv(env: NodeJS.ProcessEnv = process.env): UsersConfig {
  const uids = (env['ADMIN_FIREBASE_UIDS'] ?? '')
    .split(',')
    .map((uid) => uid.trim())
    .filter(Boolean);
  return { bootstrapAdminUids: uids };
}
