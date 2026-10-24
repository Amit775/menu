import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth';

export const signedInGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  await auth.ready;
  return (
    auth.signedIn() || router.createUrlTree(['/sign-in'], { queryParams: { returnUrl: state.url } })
  );
};
