import { type EnvironmentProviders, inject, Injector, provideAppInitializer } from '@angular/core';

/**
 * Starts the account store with the app, so a returning user's language applies
 * on every screen, not only after opening the profile. Imported lazily: the
 * store validates with Zod, which stays out of the initial bundle.
 */
export function provideAccountAtStartup(): EnvironmentProviders {
  return provideAppInitializer(() => {
    const injector = inject(Injector);
    void import('@menu/web/users/data-access').then(({ AccountStore }) =>
      injector.get(AccountStore),
    );
  });
}
