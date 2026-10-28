import { type ItemRevisionRecord } from '@menu/api/discover/data-access';
import {
  type ItemChange,
  type ItemHistoryEvent,
  type ItemSnapshot,
  type MenuSection,
  type Price,
  type Tag,
  type Text,
} from '@menu/shared/contracts';

/**
 * The public history of an item, newest first. It starts when the item reached
 * the menu, so what changed while it was pending stays with its submitter and
 * approvers.
 */
export function itemHistory(
  revisions: readonly ItemRevisionRecord[],
  sections: readonly Pick<MenuSection, 'id' | 'name'>[],
  tags: readonly Tag[],
): ItemHistoryEvent[] {
  const start = revisions.findIndex(
    (revision) => revision.kind === 'created' || revision.kind === 'approved',
  );
  if (start === -1) {
    return [];
  }
  const sectionName = (id: string): Text | null =>
    sections.find((section) => section.id === id)?.name ?? null;
  const tagNames = (ids: readonly string[]): Text[] =>
    ids.flatMap((id) => tags.filter((tag) => tag.id === id).map((tag) => tag.name));
  const [first, ...rest] = revisions.slice(start);
  if (!first) {
    return [];
  }
  const events: ItemHistoryEvent[] = [
    { kind: 'added', at: first.changedAt, listPrice: first.snapshot.listPrice },
  ];
  let previous = first.snapshot;
  for (const revision of rest) {
    if (revision.kind === 'archived') {
      events.push({ kind: 'archived', at: revision.changedAt });
    } else {
      const changes = diff(previous, revision.snapshot, sectionName, tagNames);
      if (changes.length > 0) {
        events.push({ kind: 'changed', at: revision.changedAt, changes });
      }
    }
    previous = revision.snapshot;
  }
  return events.reverse();
}

function diff(
  before: ItemSnapshot,
  after: ItemSnapshot,
  sectionName: (id: string) => Text | null,
  tagNames: (ids: readonly string[]) => Text[],
): ItemChange[] {
  const changes: ItemChange[] = [];
  if (!sameText(before.name, after.name)) {
    changes.push({ field: 'name', from: before.name, to: after.name });
  }
  if (!sameOptionalText(before.description, after.description)) {
    changes.push({ field: 'description' });
  }
  if (!samePrice(before.listPrice, after.listPrice)) {
    changes.push({ field: 'listPrice', from: before.listPrice, to: after.listPrice });
  }
  if (before.sectionId !== after.sectionId) {
    changes.push({
      field: 'section',
      from: sectionName(before.sectionId),
      to: sectionName(after.sectionId),
    });
  }
  const added = tagNames(after.tagIds.filter((id) => !before.tagIds.includes(id)));
  const removed = tagNames(before.tagIds.filter((id) => !after.tagIds.includes(id)));
  if (added.length > 0 || removed.length > 0) {
    changes.push({ field: 'tags', added, removed });
  }
  return changes;
}

function sameText(a: Text, b: Text): boolean {
  return a.he === b.he && a.en === b.en;
}

function sameOptionalText(a: Text | null, b: Text | null): boolean {
  return a === null || b === null ? a === b : sameText(a, b);
}

function samePrice(a: Price | null, b: Price | null): boolean {
  return priceKey(a) === priceKey(b);
}

function priceKey(price: Price | null): string | null {
  return price && `${String(price.value)} ${price.currency}`;
}
