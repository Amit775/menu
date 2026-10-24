import { Service, type Signal, signal, type WritableSignal } from '@angular/core';

/** Data that one domain changes and another domain shows. */
export type ChangeTopic = 'entries';

/**
 * Tells other domains that data they show has changed, without importing
 * each other (ADR 0009). A domain that writes calls `notify`; a domain that
 * reads watches `version` and reloads when it moves.
 */
@Service()
export class DataChanges {
  private readonly versions: Record<ChangeTopic, WritableSignal<number>> = {
    entries: signal(0),
  };

  version(topic: ChangeTopic): Signal<number> {
    return this.versions[topic].asReadonly();
  }

  notify(topic: ChangeTopic): void {
    this.versions[topic].update((version) => version + 1);
  }
}
