import { usersConfigFromEnv } from './users.config';

describe('usersConfigFromEnv', () => {
  it('reads a comma-separated list of bootstrap Admin uids', () => {
    expect(usersConfigFromEnv({ ADMIN_FIREBASE_UIDS: ' a, b ,,' }).bootstrapAdminUids).toEqual([
      'a',
      'b',
    ]);
  });

  it('has no bootstrap Admins by default', () => {
    expect(usersConfigFromEnv({}).bootstrapAdminUids).toEqual([]);
  });
});
