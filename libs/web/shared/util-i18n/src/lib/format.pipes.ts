import { inject, Pipe, type PipeTransform } from '@angular/core';
import { type Agorot } from '@menu/shared/contracts';
import { formatDistance, formatRelativeDate, formatShekels } from './format';
import { I18n } from './i18n';
import { type Messages } from './messages';

/** `{{ price | shekels }}`: agorot as whole shekels. */
@Pipe({ name: 'shekels' })
export class ShekelsPipe implements PipeTransform {
  transform(agorot: Agorot): string {
    return formatShekels(agorot);
  }
}

/** `{{ meters | distance }}` in the current language; impure so it follows a language switch. */
@Pipe({ name: 'distance', pure: false })
export class DistancePipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(meters: number): string {
    return formatDistance(meters, this.i18n.language());
  }
}

/** `{{ entry.createdAt | relativeDate }}`: "yesterday", "2 weeks ago", in the current language. */
@Pipe({ name: 'relativeDate', pure: false })
export class RelativeDatePipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(iso: string): string {
    return formatRelativeDate(iso, this.i18n.language());
  }
}

/**
 * `@let t = messages | messages;` in presentational components, which inject no
 * services: the lib's strings in the current language.
 */
@Pipe({ name: 'messages', pure: false })
export class MessagesPipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform<T>(messages: Messages<T>): T {
    return messages[this.i18n.language()];
  }
}
