import { type Language } from '@menu/shared/contracts';

export interface VerifiedIdentity {
  uid: string;
  name?: string;
}

/**
 * The caller of a request, resolved once by `AuthGuard`. Domains decide what a
 * principal may do from these fields alone, so none of them imports `users`.
 */
export interface Principal {
  accountId: string;
  isAdmin: boolean;
  isContributor: boolean;
  language: Language;
  ownedVenueIds: readonly string[];
}

export function canEditVenue(principal: Principal | null, venueId: string): boolean {
  return principal !== null && (principal.isAdmin || principal.ownedVenueIds.includes(venueId));
}

/** Contributors add and edit items at any venue; an Admin has every Contributor right. */
export function canContribute(principal: Principal | null): boolean {
  return principal !== null && (principal.isAdmin || principal.isContributor);
}
