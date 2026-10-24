import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { injectTranslate } from '@menu/web/shared/util-i18n';
import { uiI18n } from '../ui.i18n';

let nextId = 0;

/**
 * One to five stars, optional: native radios, so arrow keys and screen readers
 * work. Choosing the selected star again, or the clear button, clears the rating.
 */
@Component({
  selector: 'menu-rating-input',

  templateUrl: './rating-input.html',
  styleUrl: './rating-input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatingInput {
  readonly value = model<number | null>(null);
  readonly disabled = input(false);

  protected readonly name = `menu-rating-${String(nextId++)}`;
  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly t = injectTranslate(uiI18n);

  protected choose(star: number, event: MouseEvent): void {
    // A keyboard selection also fires click, with no pointer position.
    const fromPointer = event.detail > 0;
    this.value.set(fromPointer && this.value() === star ? null : star);
  }
}
