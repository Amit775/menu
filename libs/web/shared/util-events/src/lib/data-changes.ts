import { Service } from '@angular/core';
import { type Observable, Subject } from 'rxjs';

export interface SavedChange {
  itemId: string;
  saved: boolean;
}

interface Changes {
  entries: undefined;
  saved: SavedChange;
}

export type ChangeTopic = keyof Changes;

@Service()
export class DataChanges {
  private readonly topics: { [T in ChangeTopic]: Subject<Changes[T]> } = {
    entries: new Subject(),
    saved: new Subject(),
  };

  on<T extends ChangeTopic>(topic: T): Observable<Changes[T]> {
    return this.topics[topic].asObservable();
  }

  notify(topic: 'entries'): void;
  notify(topic: 'saved', change: SavedChange): void;
  notify(topic: ChangeTopic, change?: SavedChange): void {
    if (topic === 'saved') {
      if (change) {
        this.topics.saved.next(change);
      }
    } else {
      this.topics.entries.next(undefined);
    }
  }
}
