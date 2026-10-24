import { HttpErrorResponse } from '@angular/common/http';
import { Injector, resource, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { loadStatus } from './load-status';

describe('loadStatus', () => {
  function track<T>(loader: () => Promise<T>) {
    const injector = TestBed.inject(Injector);
    const ref = runInInjectionContext(injector, () => resource({ loader }));
    return { ref, status: runInInjectionContext(injector, () => loadStatus(ref)) };
  }

  it('is loading until the first value arrives, then loaded', async () => {
    const { status } = track(() => Promise.resolve(1));
    expect(status()).toBe('loading');
    await new Promise((resolve) => setTimeout(resolve));
    expect(status()).toBe('loaded');
  });

  it('reports a 404, a 403 or a 400 as not found', async () => {
    const { status } = track(
      vi.fn().mockRejectedValue(new HttpErrorResponse({ status: 404, statusText: 'Not Found' })),
    );
    await new Promise((resolve) => setTimeout(resolve));
    expect(status()).toBe('not-found');
  });

  it('reports any other failure as an error to retry', async () => {
    const { status } = track(() => Promise.reject(new Error('offline')));
    await new Promise((resolve) => setTimeout(resolve));
    expect(status()).toBe('error');
  });
});
