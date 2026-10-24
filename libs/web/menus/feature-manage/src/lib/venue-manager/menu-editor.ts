import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { type Item, type LocalizedText, type MenuSection } from '@menu/shared/contracts';
import { VenueManagerStore } from '@menu/web/menus/data-access';
import { formatShekels, I18n, injectMessages, LocalizePipe } from '@menu/web/shared/util-i18n';
import { venueManagerMessages } from '../venue-manager.messages';

const nameValidators = [Validators.required.bind(Validators), Validators.maxLength(80)];

/**
 * J6: the menu editor. Sections in order (rename, move, add), their approved
 * items (edit, take off the menu) and a way to add an item to each section.
 */
@Component({
  selector: 'menu-menu-editor',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    LocalizePipe,
  ],
  templateUrl: './menu-editor.html',
  styleUrl: './menu-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuEditor {
  protected readonly store = inject(VenueManagerStore);
  private readonly i18n = inject(I18n);
  protected readonly t = injectMessages(venueManagerMessages);

  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  protected readonly renaming = signal<string | null>(null);
  protected readonly confirmingArchive = signal<string | null>(null);
  protected readonly renameForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: nameValidators }),
  });
  protected readonly newSectionForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: nameValidators }),
  });

  protected readonly sections = computed(() =>
    this.store.menu().map((view, index, all) => ({
      ...view,
      first: index === 0,
      last: index === all.length - 1,
      label: this.i18n.pick(view.section.name),
      rows: view.items.map((item) => ({ item, facts: this.facts(item) })),
    })),
  );

  protected startRename(section: MenuSection): void {
    this.renameForm.reset({ name: this.i18n.pick(section.name) });
    this.renaming.set(section.id);
  }

  protected async rename(section: MenuSection): Promise<void> {
    if (this.renameForm.invalid) {
      return;
    }
    const name = this.named(section.name, this.renameForm.controls.name.value.trim());
    if (await this.run(() => this.store.renameSection(section.id, name))) {
      this.renaming.set(null);
    }
  }

  protected async move(section: MenuSection, step: -1 | 1): Promise<void> {
    await this.run(() => this.store.moveSection(section.id, step));
  }

  protected async addSection(): Promise<void> {
    if (this.newSectionForm.invalid) {
      this.newSectionForm.markAllAsTouched();
      return;
    }
    const name = this.named(null, this.newSectionForm.controls.name.value.trim());
    if (await this.run(() => this.store.addSection(name))) {
      this.newSectionForm.reset();
    }
  }

  protected async archive(item: Item): Promise<void> {
    if (this.confirmingArchive() !== item.id) {
      this.confirmingArchive.set(item.id);
      return;
    }
    this.confirmingArchive.set(null);
    await this.run(() => this.store.decide(item.id, 'archive'));
  }

  /** Writes the typed name in the current language; Hebrew is always set (the contract needs it). */
  private named(current: LocalizedText | null, typed: string): LocalizedText {
    if (this.i18n.language() === 'en') {
      return { he: current?.he ?? typed, en: typed };
    }
    return current?.en ? { he: typed, en: current.en } : { he: typed };
  }

  private async run(action: () => Promise<void>): Promise<boolean> {
    this.busy.set(true);
    this.failed.set(false);
    try {
      await action();
      return true;
    } catch {
      this.failed.set(true);
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  private facts(item: Item): string {
    const tags = item.tagIds
      .map((id) => this.store.tagsById().get(id))
      .filter((tag) => tag !== undefined)
      .map((tag) => this.i18n.pick(tag.name));
    return [
      item.listPrice === null ? this.t().noPrice : formatShekels(item.listPrice),
      ...tags,
    ].join(' · ');
  }
}
