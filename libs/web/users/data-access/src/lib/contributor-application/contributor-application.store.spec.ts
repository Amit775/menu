import { HttpErrorResponse } from '@angular/common/http';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ContributorApplicationApiClient } from './contributor-application.api-client';
import { ContributorApplicationStore } from './contributor-application.store';

const application = {
  id: '5f9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
  note: 'I eat out every week',
  status: 'pending' as const,
  createdAt: '2026-10-22T20:00:00.000Z',
  decidedAt: null,
};

describe('ContributorApplicationStore', () => {
  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  function setup(api: Partial<ContributorApplicationApiClient>) {
    TestBed.configureTestingModule({
      providers: [
        ContributorApplicationStore,
        { provide: ContributorApplicationApiClient, useValue: api },
      ],
    });
    return TestBed.inject(ContributorApplicationStore);
  }

  it('loads when the caller may apply', async () => {
    const store = setup({
      mine: vi
        .fn()
        .mockResolvedValue({ application: null, canApplyFrom: '2026-10-28T12:00:00.000Z' }),
    });
    await settle();
    expect(store.status()).toBe('loaded');
    expect(store.application()).toBeNull();
    expect(store.canApplyFrom()).toBe('2026-10-28T12:00:00.000Z');
  });

  it('records a failed load', async () => {
    const store = setup({
      mine: vi.fn().mockRejectedValue(new HttpErrorResponse({ status: 500 })),
    });
    await settle();
    expect(store.status()).toBe('error');
  });

  it('shows the new application as pending once filed', async () => {
    const apply = vi.fn().mockResolvedValue(application);
    const store = setup({
      mine: vi
        .fn()
        .mockResolvedValue({ application: null, canApplyFrom: '2026-10-28T12:00:00.000Z' }),
      apply,
    });
    await settle();
    await store.apply(application.note);
    expect(apply).toHaveBeenCalledWith(application.note);
    expect(store.application()).toEqual(application);
    expect(store.canApplyFrom()).toBeNull();
  });

  it('keeps the form open when filing fails', async () => {
    const store = setup({
      mine: vi
        .fn()
        .mockResolvedValue({ application: null, canApplyFrom: '2026-10-28T12:00:00.000Z' }),
      apply: vi.fn().mockRejectedValue(new HttpErrorResponse({ status: 409 })),
    });
    await settle();
    await expect(store.apply('note')).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(store.canApplyFrom()).toBe('2026-10-28T12:00:00.000Z');
  });
});
