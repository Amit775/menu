import { UnauthorizedException } from '@nestjs/common';
import {
  DEFAULT_FIREBASE_PROJECT_ID,
  DevTokenVerifier,
  FirebaseTokenVerifier,
  firebaseProjectId,
  verifierFromEnv,
} from './verifiers';

describe('FirebaseTokenVerifier', () => {
  it('returns the uid and name of a valid token', async () => {
    const verifier = new FirebaseTokenVerifier({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'u1', name: 'נועה' }),
    });
    await expect(verifier.verify('t')).resolves.toEqual({ uid: 'u1', name: 'נועה' });
  });

  it('leaves out a missing name (phone sign-in)', async () => {
    const verifier = new FirebaseTokenVerifier({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'u1' }),
    });
    await expect(verifier.verify('t')).resolves.toEqual({ uid: 'u1' });
  });

  it('turns an invalid or expired token into a 401', async () => {
    const verifier = new FirebaseTokenVerifier({
      verifyIdToken: vi.fn().mockRejectedValue({ code: 'auth/id-token-expired' }),
    });
    await expect(verifier.verify('t')).rejects.toThrow(UnauthorizedException);
  });

  it('keeps a setup fault a server error, not a 401', async () => {
    const verifier = new FirebaseTokenVerifier({
      verifyIdToken: vi.fn().mockRejectedValue({ code: 'auth/invalid-credential' }),
    });
    await expect(verifier.verify('t')).rejects.toEqual({ code: 'auth/invalid-credential' });
  });

  it('lets other failures through as server errors', async () => {
    const verifier = new FirebaseTokenVerifier({
      verifyIdToken: vi.fn().mockRejectedValue(new Error('network down')),
    });
    await expect(verifier.verify('t')).rejects.toThrow('network down');
  });
});

describe('DevTokenVerifier', () => {
  const verifier = new DevTokenVerifier();

  it('accepts dev:<uid>:<name>', async () => {
    await expect(verifier.verify('dev:noa:נועה')).resolves.toEqual({ uid: 'noa', name: 'נועה' });
  });

  it('refuses anything else', async () => {
    await expect(verifier.verify('eyJhbGciOi')).rejects.toThrow(UnauthorizedException);
  });
});

describe('verifierFromEnv', () => {
  it('uses Firebase by default', () => {
    expect(verifierFromEnv({})).toBe(FirebaseTokenVerifier);
  });

  it('uses development tokens only when asked and not in production', () => {
    expect(verifierFromEnv({ AUTH_DEV_TOKENS: 'true' })).toBe(DevTokenVerifier);
    expect(verifierFromEnv({ AUTH_DEV_TOKENS: 'true', NODE_ENV: 'production' })).toBe(
      FirebaseTokenVerifier,
    );
  });
});

describe('firebaseProjectId', () => {
  it('falls back to the default when unset or empty', () => {
    expect(firebaseProjectId({})).toBe(DEFAULT_FIREBASE_PROJECT_ID);
    expect(firebaseProjectId({ FIREBASE_PROJECT_ID: '' })).toBe(DEFAULT_FIREBASE_PROJECT_ID);
  });

  it('uses the configured project', () => {
    expect(firebaseProjectId({ FIREBASE_PROJECT_ID: 'other-project' })).toBe('other-project');
  });
});
