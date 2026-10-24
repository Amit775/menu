import { computed, inject, Injectable, signal } from '@angular/core';
import { type ActivatedRouteSnapshot, type CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth';

/** What the signed-in account may manage: every venue as an Admin, or the venues it owns. */
export interface RoleGrants {
  isAdmin: boolean;
  ownedVenueIds: readonly string[];
}

export const NO_ROLES: RoleGrants = { isAdmin: false, ownedVenueIds: [] };

/**
 * The signed-in account's roles, for every web domain (ADR 0010). The users
 * domain sets them when the account loads and clears them on sign-out; the
 * other domains read them here instead of importing users. The API enforces
 * every permission again; these only shape the UI.
 */
@Injectable({ providedIn: 'root' })
export class Roles {
  private readonly grants = signal<RoleGrants | null>(null);
  private waiting: (() => void)[] = [];

  /** False until the account has loaded (or failed to). */
  readonly known = computed(() => this.grants() !== null);
  readonly isAdmin = computed(() => this.grants()?.isAdmin ?? false);
  readonly ownedVenueIds = computed(() => this.grants()?.ownedVenueIds ?? []);
  /** An Admin or the Owner of at least one venue. */
  readonly canManage = computed(() => this.isAdmin() || this.ownedVenueIds().length > 0);

  set(grants: RoleGrants | null): void {
    this.grants.set(grants);
    if (grants) {
      const waiting = this.waiting;
      this.waiting = [];
      for (const resolve of waiting) {
        resolve();
      }
    }
  }

  canEditVenue(venueId: string): boolean {
    return this.isAdmin() || this.ownedVenueIds().includes(venueId);
  }

  /** Resolves once the account's roles are known. */
  whenKnown(): Promise<void> {
    return this.known()
      ? Promise.resolve()
      : new Promise((resolve) => {
          this.waiting.push(resolve);
        });
  }
}

function roleGuard(
  allowed: (roles: Roles, route: ActivatedRouteSnapshot) => boolean,
  fallback: string,
): CanActivateFn {
  return async (route, state) => {
    const auth = inject(Auth);
    const roles = inject(Roles);
    const router = inject(Router);
    await auth.ready;
    if (!auth.signedIn()) {
      return router.createUrlTree(['/sign-in'], { queryParams: { returnUrl: state.url } });
    }
    await roles.whenKnown();
    return allowed(roles, route) || router.createUrlTree([fallback]);
  };
}

/** The manage pages: Owners and Admins. Others go back to their profile. */
export const managerGuard: CanActivateFn = roleGuard((roles) => roles.canManage(), '/profile');

/** Admin-only pages (venues, tags, people). Owners go back to their venues. */
export const adminGuard: CanActivateFn = roleGuard((roles) => roles.isAdmin(), '/manage');

/**
 * One venue's manage pages (`:id`): its Owners and Admins. Other Owners go back
 * to their venues; the API would refuse their changes anyway.
 */
export const venueManagerGuard: CanActivateFn = roleGuard(
  (roles, route) => roles.canEditVenue(route.paramMap.get('id') ?? ''),
  '/manage',
);
