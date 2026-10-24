import { Inject, Injectable, Optional, UnauthorizedException } from '@nestjs/common';
import { type TokenVerifier } from './ports';
import { type VerifiedIdentity } from './principal';

export interface IdTokenDecoder {
  verifyIdToken(token: string): Promise<{ uid: string; name?: unknown }>;
}

export const ID_TOKEN_DECODER = Symbol('ID_TOKEN_DECODER');

export const DEFAULT_FIREBASE_PROJECT_ID = 'menu-b29eb';

/** `FIREBASE_PROJECT_ID`, or the default when unset or empty (as `.env.example` ships it). */
export function firebaseProjectId(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env['FIREBASE_PROJECT_ID']?.trim();
  return configured !== undefined && configured.length > 0
    ? configured
    : DEFAULT_FIREBASE_PROJECT_ID;
}

async function firebaseDecoder(projectId: string): Promise<IdTokenDecoder> {
  const { getApps, initializeApp } = await import('firebase-admin/app');
  const { getAuth } = await import('firebase-admin/auth');
  // Verifying ID tokens needs only the project id: the public keys are fetched, no credentials.
  return getAuth(getApps()[0] ?? initializeApp({ projectId }));
}

/**
 * Errors that mean "this token is not valid". Anything else (Firebase out of
 * reach, a missing project id) is a server fault and stays a 500, so clients do
 * not sign users out over it.
 */
const TOKEN_ERRORS = new Set([
  'auth/argument-error',
  'auth/id-token-expired',
  'auth/id-token-revoked',
  'auth/user-disabled',
  'auth/user-not-found',
]);

function isTokenError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' && TOKEN_ERRORS.has(code);
}

@Injectable()
export class FirebaseTokenVerifier implements TokenVerifier {
  private decoder: Promise<IdTokenDecoder> | undefined;

  constructor(@Optional() @Inject(ID_TOKEN_DECODER) decoder: IdTokenDecoder | null = null) {
    if (decoder) {
      this.decoder = Promise.resolve(decoder);
    }
  }

  async verify(token: string): Promise<VerifiedIdentity> {
    this.decoder ??= firebaseDecoder(firebaseProjectId());
    try {
      const decoded = await (await this.decoder).verifyIdToken(token);
      return typeof decoded.name === 'string'
        ? { uid: decoded.uid, name: decoded.name }
        : { uid: decoded.uid };
    } catch (error) {
      if (isTokenError(error)) {
        throw new UnauthorizedException('Sign in again.');
      }
      throw error;
    }
  }
}

/**
 * Local development and e2e only: accepts `dev:<uid>` or `dev:<uid>:<name>`.
 * `verifierFromEnv` never picks it in production.
 */
@Injectable()
export class DevTokenVerifier implements TokenVerifier {
  verify(token: string): Promise<VerifiedIdentity> {
    const match = /^dev:([\w-]{1,64})(?::(.{1,60}))?$/.exec(token);
    if (!match?.[1]) {
      return Promise.reject(new UnauthorizedException('Not a development token.'));
    }
    return Promise.resolve(match[2] ? { uid: match[1], name: match[2] } : { uid: match[1] });
  }
}

export function verifierFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): typeof FirebaseTokenVerifier | typeof DevTokenVerifier {
  return env['AUTH_DEV_TOKENS'] === 'true' && env['NODE_ENV'] !== 'production'
    ? DevTokenVerifier
    : FirebaseTokenVerifier;
}
