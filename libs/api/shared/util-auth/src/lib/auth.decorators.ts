import {
  applyDecorators,
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { type Principal } from './principal';

export const AUTH_REQUIREMENT = 'menu:auth-requirement';

export type AuthRequirement = 'signed-in' | 'admin';

/** The route needs a signed-in caller (401 otherwise). */
export const Authenticated = (): MethodDecorator & ClassDecorator =>
  applyDecorators(SetMetadata(AUTH_REQUIREMENT, 'signed-in' satisfies AuthRequirement));

/** The route needs an Admin (401 when signed out, 403 for other accounts). */
export const AdminOnly = (): MethodDecorator & ClassDecorator =>
  applyDecorators(SetMetadata(AUTH_REQUIREMENT, 'admin' satisfies AuthRequirement));

export interface RequestWithPrincipal {
  headers: Record<string, string | string[] | undefined>;
  principal?: Principal;
}

export function principalOf(context: ExecutionContext): Principal | null {
  return context.switchToHttp().getRequest<RequestWithPrincipal>().principal ?? null;
}

/** The signed-in caller. Use on routes marked `@Authenticated()` or `@AdminOnly()`. */
export const CurrentPrincipal = createParamDecorator(
  (_: unknown, context: ExecutionContext): Principal => {
    const principal = principalOf(context);
    if (!principal) {
      throw new UnauthorizedException('Sign in to continue.');
    }
    return principal;
  },
);

/** The caller when signed in, or null for a visitor. For public routes that personalise. */
export const OptionalPrincipal = createParamDecorator(
  (_: unknown, context: ExecutionContext): Principal | null => principalOf(context),
);
