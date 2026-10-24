import { Service } from '@angular/core';
import { type Observable, Subject } from 'rxjs';

export type ChangeTopic = 'entries';

@Service()
export class DataChanges {
  private readonly topics: Record<ChangeTopic, Subject<void>> = { entries: new Subject() };

  on(topic: ChangeTopic): Observable<void> {
    return this.topics[topic].asObservable();
  }

  notify(topic: ChangeTopic): void {
    this.topics[topic].next();
  }
}
