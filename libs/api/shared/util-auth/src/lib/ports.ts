import { type Principal, type VerifiedIdentity } from './principal';

/** Checks a bearer token with the sign-in provider. Throws when it is not valid. */
export interface TokenVerifier {
  verify(token: string): Promise<VerifiedIdentity>;
}

/** Turns a verified identity into a principal, creating the account on first sign-in. */
export interface PrincipalResolver {
  resolve(identity: VerifiedIdentity): Promise<Principal>;
}

export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');
export const PRINCIPAL_RESOLVER = Symbol('PRINCIPAL_RESOLVER');

/** Used until a real sign-in provider is wired: every token is refused. */
export class RejectingTokenVerifier implements TokenVerifier {
  verify(): Promise<VerifiedIdentity> {
    return Promise.reject(new Error('No sign-in provider is configured.'));
  }
}
