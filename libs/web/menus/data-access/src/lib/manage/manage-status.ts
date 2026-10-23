import { HttpErrorResponse } from '@angular/common/http';

export type ManageStatus = 'loading' | 'loaded' | 'not-found' | 'error';

/** A 404 or 403 (not yours to manage), or a 400 for an id that is not one: nothing to retry. */
export function failure(error: unknown): ManageStatus {
  return error instanceof HttpErrorResponse && [400, 403, 404].includes(error.status)
    ? 'not-found'
    : 'error';
}
