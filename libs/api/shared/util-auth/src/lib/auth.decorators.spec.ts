import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentPrincipal, OptionalPrincipal } from './auth.decorators';
import { type Principal } from './principal';

type Factory = (data: unknown, context: ExecutionContext) => unknown;

/** The function behind a Nest param decorator. */
function factoryOf(decorator: () => ParameterDecorator): Factory {
  class Probe {
    handler(): void {
      // only carries metadata
    }
  }
  decorator()(Probe.prototype, 'handler', 0);
  const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Probe, 'handler') as Record<
    string,
    { factory: Factory }
  >;
  const entry = Object.values(metadata)[0];
  if (!entry) {
    throw new Error('no param metadata');
  }
  return entry.factory;
}

function contextWith(principal?: Principal): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers: {}, principal }) }),
  } as unknown as ExecutionContext;
}

describe('principal decorators', () => {
  const principal: Principal = {
    accountId: 'a',
    isAdmin: false,
    language: 'he',
    ownedVenueIds: [],
  };

  it('CurrentPrincipal returns the caller and refuses a visitor', () => {
    const factory = factoryOf(CurrentPrincipal);
    expect(factory(undefined, contextWith(principal))).toBe(principal);
    expect(() => factory(undefined, contextWith())).toThrow(UnauthorizedException);
  });

  it('OptionalPrincipal returns null for a visitor', () => {
    const factory = factoryOf(OptionalPrincipal);
    expect(factory(undefined, contextWith())).toBeNull();
    expect(factory(undefined, contextWith(principal))).toBe(principal);
  });
});
