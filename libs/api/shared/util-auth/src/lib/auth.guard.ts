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
 * (an invalid token is a 401 even on public routes, so clients notice expiry);
 * a request without one is a visitor. Routes opt into stricter rules with
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
      const identity = await this.verifier.verify(token).catch(() => {
        throw new UnauthorizedException('Your session has expired. Sign in again.');
      });
      request.principal = await this.resolver.resolve(identity);
    }

    const requirement = this.reflector.getAllAndOverride<AuthRequirement | undefined>(
      AUTH_REQUIREMENT,
      [context.getHandler(), context.getClass()],
    );
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
  if (typeof header !== 'string') {
    return null;
  }
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return match?.[1] ?? null;
}
