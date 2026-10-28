import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { form, FormField, validate } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { type CreateItemReportInput, ShekelsSchema } from '@menu/shared/contracts';
import { ItemPageStore } from '@menu/web/discover/data-access';
import { injectTranslate } from '@menu/web/shared/util-i18n';
import { itemI18n } from '../item.i18n';

type Step = 'closed' | 'choosing' | 'price' | 'sent';

@Component({
  selector: 'menu-item-report-form',
  imports: [FormField, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './item-report-form.html',
  styleUrl: './item-report-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemReportForm {
  private readonly store = inject(ItemPageStore);
  protected readonly t = injectTranslate(itemI18n);

  protected readonly step = signal<Step>('closed');
  protected readonly sending = signal(false);
  protected readonly failed = signal(false);
  private readonly model = signal<{ price: number | null }>({ price: null });
  protected readonly form = form(
    this.model,
    (path) => {
      validate(path.price, ({ value }) => {
        const price = value();
        return price === null || ShekelsSchema.safeParse(price).success ? null : { kind: 'price' };
      });
    },
    { name: 'itemReport' },
  );

  protected go(step: Step): void {
    this.failed.set(false);
    this.model.set({ price: null });
    this.step.set(step);
  }

  protected reportGone(): Promise<void> {
    return this.send({ kind: 'gone' });
  }

  protected reportPrice(): Promise<void> {
    if (this.form().invalid()) {
      this.form.price().focusBoundControl();
      return Promise.resolve();
    }
    const value = this.model().price;
    return this.send({ kind: 'price', price: value === null ? null : { value, currency: 'ILS' } });
  }

  private async send(input: CreateItemReportInput): Promise<void> {
    if (this.sending()) {
      return;
    }
    this.sending.set(true);
    this.failed.set(false);
    try {
      await this.store.report(input);
      this.step.set('sent');
    } catch {
      this.failed.set(true);
    } finally {
      this.sending.set(false);
    }
  }
}
