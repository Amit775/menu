import { type INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthModule, type TokenVerifier, type VerifiedIdentity } from '@menu/api/shared/util-auth';
import { AccountRepository, ContributorApplicationRepository } from '@menu/api/users/data-access';
import { ContributorApplicationModule } from '../contributor-application/contributor-application.module';
import { AccountModule } from './account.module';
import { AccountService } from './account.service';

class FakeVerifier implements TokenVerifier {
  verify(token: string): Promise<VerifiedIdentity> {
    return token.startsWith('uid-')
      ? Promise.resolve({ uid: token })
      : Promise.reject(new UnauthorizedException('bad token'));
  }
}

// Boots the real guard wiring (AuthModule.forRoot + AccountModule) over HTTP,
// so a forgotten decorator or broken APP_GUARD registration fails here.
describe('accounts over HTTP', () => {
  let app: INestApplication;
  let baseUrl: string;
  const accounts = {
    'uid-admin': {
      id: '11111111-1111-4111-8111-111111111111',
      isAdmin: true,
      isContributor: false,
    },
    'uid-user': {
      id: '22222222-2222-4222-8222-222222222222',
      isAdmin: false,
      isContributor: false,
    },
  };

  beforeAll(async () => {
    const repository: Partial<Record<keyof AccountRepository, unknown>> = {
      findOrCreateByFirebaseUid: ({ firebaseUid }: { firebaseUid: keyof typeof accounts }) =>
        Promise.resolve({
          ...accounts[firebaseUid],
          displayName: '',
          language: 'he',
          ownedVenueIds: [],
          createdAt: '2026-01-01T00:00:00.000Z',
        }),
      list: () => Promise.resolve([]),
    };
    const moduleRef = await Test.createTestingModule({
      imports: [
        AccountModule,
        ContributorApplicationModule,
        AuthModule.forRoot({
          resolverModule: AccountModule,
          resolver: AccountService,
          verifier: FakeVerifier,
        }),
      ],
    })
      .overrideProvider(AccountRepository)
      .useValue(repository)
      .overrideProvider(ContributorApplicationRepository)
      .useValue({ latestFor: () => Promise.resolve(null), listPending: () => Promise.resolve([]) })
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');
    baseUrl = `${await app.getUrl()}/api`;
  });

  afterAll(async () => {
    await app.close();
  });

  async function status(path: string, token?: string, method = 'GET'): Promise<number> {
    const response = await fetch(`${baseUrl}/${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      ...(method === 'GET' ? {} : { body: JSON.stringify({ isContributor: true }) }),
    });
    return response.status;
  }

  it('refuses the Admin list to a visitor', async () => {
    expect(await status('accounts')).toBe(401);
  });

  it('forbids the Admin list to a user', async () => {
    expect(await status('accounts', 'uid-user')).toBe(403);
  });

  it('shows the Admin list to an Admin', async () => {
    expect(await status('accounts', 'uid-admin')).toBe(200);
  });

  it('refuses an invalid token', async () => {
    expect(await status('accounts/me', 'garbage')).toBe(401);
  });

  it('shows a user their own contributor application', async () => {
    expect(await status('accounts/me/contributor-application')).toBe(401);
    expect(await status('accounts/me/contributor-application', 'uid-user')).toBe(200);
  });

  it('keeps applications and the Contributor role to Admins', async () => {
    expect(await status('contributor-applications', 'uid-user')).toBe(403);
    expect(await status('contributor-applications', 'uid-admin')).toBe(200);
    const id = accounts['uid-user'].id;
    expect(await status(`accounts/${id}/contributor`, 'uid-user', 'PUT')).toBe(403);
    expect(await status(`contributor-applications/${id}/approve`, 'uid-user', 'POST')).toBe(403);
  });
});
