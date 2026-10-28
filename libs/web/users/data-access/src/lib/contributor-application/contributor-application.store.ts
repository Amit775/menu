import { computed, inject, resource } from '@angular/core';
import { type MyContributorApplication } from '@menu/shared/contracts';
import { loadStatus } from '@menu/web/shared/util-data';
import { signalStore, withComputed, withMethods, withProps } from '@ngrx/signals';
import { ContributorApplicationApiClient } from './contributor-application.api-client';

export const ContributorApplicationStore = signalStore(
  withProps((_, api = inject(ContributorApplicationApiClient)) => ({
    _mine: resource({ loader: () => api.mine() }),
  })),
  withComputed(({ _mine }) => {
    const mine = computed(() => (_mine.hasValue() ? _mine.value() : null));
    return {
      status: loadStatus(_mine),
      application: computed(() => mine()?.application ?? null),
      canApplyFrom: computed(() => mine()?.canApplyFrom ?? null),
    };
  }),
  withMethods((store, api = inject(ContributorApplicationApiClient)) => ({
    reload(): void {
      store._mine.reload();
    },
    async apply(note: string): Promise<void> {
      const application = await api.apply(note);
      store._mine.set({ application, canApplyFrom: null } satisfies MyContributorApplication);
    },
  })),
);
