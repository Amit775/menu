import { type Language } from '@menu/shared/contracts';

/** Who the sign-in provider says the caller is, before we look them up. */
export interface VerifiedIdentity {
  /** The provider's stable user id (Firebase uid). */
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
  language: Language;
  ownedVenueIds: readonly string[];
}

/** True for an Admin or an Owner of this venue: the spec's `Venue.canEditMenu(account)`. */
export function canEditVenue(principal: Principal | null, venueId: string): boolean {
  return principal !== null && (principal.isAdmin || principal.ownedVenueIds.includes(venueId));
}
