import { UnauthorizedException } from '@nestjs/common';
import { type Principal, type VerifiedIdentity } from './principal';

/**
 * Checks a bearer token with the sign-in provider. Throws `UnauthorizedException`
 * when the token is not valid; other errors mean the provider could not be reached.
 */
export interface TokenVerifier {
  verify(token: string): Promise<VerifiedIdentity>;
}

export interface PrincipalResolver {
  resolve(identity: VerifiedIdentity): Promise<Principal>;
}

export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');
export const PRINCIPAL_RESOLVER = Symbol('PRINCIPAL_RESOLVER');

export class RejectingTokenVerifier implements TokenVerifier {
  verify(): Promise<VerifiedIdentity> {
    return Promise.reject(new UnauthorizedException('Sign-in is not configured yet.'));
  }
}
