import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AUTH_REQUIREMENT,
  type AuthRequirement,
  type RequestWithPrincipal,
} from './auth.decorators';
import {
  PRINCIPAL_RESOLVER,
  type PrincipalResolver,
  TOKEN_VERIFIER,
  type TokenVerifier,
} from './ports';

/**
 * Global guard. A request with `Authorization: Bearer <token>` gets a principal
 * (an invalid token or malformed header is a 401 even on public routes, so
 * clients notice expiry); a request without one is a visitor. Verifiers throw
 * `UnauthorizedException` for a bad token; any other error (a provider outage)
 * stays a 500 so clients do not sign users out. Routes opt into stricter rules with
 * `@Authenticated()` and `@AdminOnly()`.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_VERIFIER) private readonly verifier: TokenVerifier,
    @Inject(PRINCIPAL_RESOLVER) private readonly resolver: PrincipalResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithPrincipal>();
    const token = bearerToken(request);
    if (token) {
      const identity = await this.verifier.verify(token);
      request.principal = await this.resolver.resolve(identity);
    }

    // The stricter of the method and class requirements wins.
    const requirements = this.reflector.getAll<(AuthRequirement | undefined)[]>(AUTH_REQUIREMENT, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requirement = requirements.includes('admin')
      ? 'admin'
      : requirements.includes('signed-in')
        ? 'signed-in'
        : undefined;
    if (requirement && !request.principal) {
      throw new UnauthorizedException('Sign in to continue.');
    }
    if (requirement === 'admin' && !request.principal?.isAdmin) {
      throw new ForbiddenException('Only an Admin can do this.');
    }
    return true;
  }
}

function bearerToken(request: RequestWithPrincipal): string | null {
  const header = request.headers['authorization'];
  if (header === undefined) {
    return null;
  }
  const match = typeof header === 'string' ? /^Bearer +(\S+)$/i.exec(header) : null;
  if (!match?.[1]) {
    throw new UnauthorizedException('Malformed Authorization header.');
  }
  return match[1];
}
