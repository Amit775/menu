/** Configuration for the users domain. Read from the environment in this one place. */
export interface UsersConfig {
  /** Firebase uids that become Admin on sign-in, so the first Admin needs no database access. */
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
