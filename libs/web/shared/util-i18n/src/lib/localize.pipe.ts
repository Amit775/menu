import { inject, Pipe, type PipeTransform } from '@angular/core';
import { type LocalizedText } from '@menu/shared/contracts';
import { I18n } from './i18n';

/** `{{ item.name | localize }}`: impure so it follows a language switch. */
@Pipe({ name: 'localize', pure: false })
export class LocalizePipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(text: LocalizedText): string {
    return this.i18n.pick(text);
  }
}
