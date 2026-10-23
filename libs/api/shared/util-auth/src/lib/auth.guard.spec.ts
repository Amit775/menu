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
    verify: (token) => {
      if (token === 'good') return Promise.resolve({ uid: 'u1' });
      if (token === 'outage') return Promise.reject(new Error('keys unavailable'));
      return Promise.reject(new UnauthorizedException('bad token'));
    },
  };

  function run(
    headers: RequestWithPrincipal['headers'],
    requirements: (AuthRequirement | undefined)[] = [],
    resolved: Principal = principal,
  ): { result: Promise<boolean>; request: RequestWithPrincipal } {
    const resolver: PrincipalResolver = { resolve: () => Promise.resolve(resolved) };
    const reflector = { getAll: () => requirements } as unknown as Reflector;
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

  it.each(['Bearer', 'Bearer a b', 'Basic abc', ''])(
    'rejects the malformed header "%s"',
    async (authorization) => {
      await expect(run({ authorization }).result).rejects.toThrow(UnauthorizedException);
    },
  );

  it('keeps a provider outage a server error instead of signing the user out', async () => {
    const result = run({ authorization: 'Bearer outage' }).result;
    await expect(result).rejects.toThrow('keys unavailable');
    await expect(result).rejects.not.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a visitor on a signed-in route', async () => {
    await expect(run({}, ['signed-in']).result).rejects.toThrow(UnauthorizedException);
  });

  it('forbids a non-Admin on an Admin route', async () => {
    await expect(run({ authorization: 'Bearer good' }, ['admin']).result).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('keeps a class-level Admin rule when a method only asks for sign-in', async () => {
    await expect(
      run({ authorization: 'Bearer good' }, ['signed-in', 'admin']).result,
    ).rejects.toThrow(ForbiddenException);
  });

  it('lets an Admin through an Admin route', async () => {
    const admin = { ...principal, isAdmin: true };
    await expect(run({ authorization: 'Bearer good' }, ['admin'], admin).result).resolves.toBe(
      true,
    );
  });
});
