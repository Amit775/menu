import { type ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { type Reflector } from '@nestjs/core';
import { type AuthRequirement, type RequestWithPrincipal } from './auth.decorators';
import { AuthGuard } from './auth.guard';
import { type PrincipalResolver, type TokenVerifier } from './ports';
import { type Principal } from './principal';

describe('AuthGuard', () => {
  const principal: Principal = {
    accountId: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    isAdmin: false,
    language: 'he',
    ownedVenueIds: [],
  };
  const verifier: TokenVerifier = {
    verify: (token) =>
      token === 'good' ? Promise.resolve({ uid: 'u1' }) : Promise.reject(new Error('bad')),
  };

  function run(
    headers: RequestWithPrincipal['headers'],
    requirement?: AuthRequirement,
    resolved: Principal = principal,
  ): { result: Promise<boolean>; request: RequestWithPrincipal } {
    const resolver: PrincipalResolver = { resolve: () => Promise.resolve(resolved) };
    const reflector = { getAllAndOverride: () => requirement } as unknown as Reflector;
    const guard = new AuthGuard(reflector, verifier, resolver);
    const request: RequestWithPrincipal = { headers };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;
    return { result: guard.canActivate(context), request };
  }

  it('lets a visitor through a public route', async () => {
    const { result, request } = run({});
    await expect(result).resolves.toBe(true);
    expect(request.principal).toBeUndefined();
  });

  it('attaches the principal for a valid bearer token', async () => {
    const { result, request } = run({ authorization: 'Bearer good' });
    await expect(result).resolves.toBe(true);
    expect(request.principal).toEqual(principal);
  });

  it('rejects an invalid token even on a public route', async () => {
    await expect(run({ authorization: 'Bearer bad' }).result).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a visitor on a signed-in route', async () => {
    await expect(run({}, 'signed-in').result).rejects.toThrow(UnauthorizedException);
  });

  it('forbids a non-Admin on an Admin route', async () => {
    await expect(run({ authorization: 'Bearer good' }, 'admin').result).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('lets an Admin through an Admin route', async () => {
    const admin = { ...principal, isAdmin: true };
    await expect(run({ authorization: 'Bearer good' }, 'admin', admin).result).resolves.toBe(true);
  });
});
