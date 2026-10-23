import { HttpErrorResponse } from '@angular/common/http';

export type LoadStatus = 'loading' | 'loaded' | 'not-found' | 'error';

/** A 404, or a 400 for an id that is not one, means there is nothing to retry. */
export function failure(error: unknown): LoadStatus {
  return error instanceof HttpErrorResponse && (error.status === 404 || error.status === 400)
    ? 'not-found'
    : 'error';
}
