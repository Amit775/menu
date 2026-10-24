import { HttpErrorResponse } from '@angular/common/http';
import { computed, type Resource, type Signal } from '@angular/core';

export type LoadStatus = 'loading' | 'loaded' | 'not-found' | 'error';

export function loadStatus(ref: Resource<unknown>): Signal<LoadStatus> {
  return computed(() => {
    const error = ref.error();
    if (error) {
      return isNotFound(error) ? 'not-found' : 'error';
    }
    return ref.hasValue() ? 'loaded' : 'loading';
  });
}

// 400 is an id that is not one and 403 is not the caller's: retrying cannot help either.
function isNotFound(error: Error): boolean {
  const http: unknown = error instanceof HttpErrorResponse ? error : error.cause;
  return http instanceof HttpErrorResponse && [400, 403, 404].includes(http.status);
}
