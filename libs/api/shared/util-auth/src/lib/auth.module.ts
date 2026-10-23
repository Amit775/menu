import { type DynamicModule, Module, type Provider, type Type } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import {
  PRINCIPAL_RESOLVER,
  type PrincipalResolver,
  TOKEN_VERIFIER,
  type TokenVerifier,
} from './ports';

export interface AuthModuleOptions {
  /** Module that provides and exports the resolver (the users domain). */
  resolverModule: Type;
  resolver: Type<PrincipalResolver>;
  verifier: Type<TokenVerifier>;
}

/** Registers `AuthGuard` globally with the app's verifier and resolver. Wired in `apps/api`. */
@Module({})
export class AuthModule {
  static forRoot(options: AuthModuleOptions): DynamicModule {
    const providers: Provider[] = [
      { provide: TOKEN_VERIFIER, useClass: options.verifier },
      { provide: PRINCIPAL_RESOLVER, useExisting: options.resolver },
      { provide: APP_GUARD, useClass: AuthGuard },
    ];
    return { module: AuthModule, imports: [options.resolverModule], providers };
  }
}
