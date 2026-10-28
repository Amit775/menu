import { NotFoundException } from '@nestjs/common';
import { type EntryRecord } from '@menu/api/entries/data-access';
import { type Principal } from '@menu/api/shared/util-auth';
import {
  type Entry,
  type EntryVisibility,
  type ItemRef,
  type PublicEntry,
  type SharedEntryView,
} from '@menu/shared/contracts';

export class DiaryEntry {
  constructor(readonly record: EntryRecord) {}

  isAuthoredBy(principal: Principal | null): boolean {
    return principal !== null && principal.accountId === this.record.authorId;
  }

  /** Someone else's entry reads as missing, so its existence is not revealed. */
  assertAuthor(principal: Principal): void {
    if (!this.isAuthoredBy(principal)) {
      throw new NotFoundException('Entry not found.');
    }
  }

  private static readonly audience: Record<EntryVisibility, number> = {
    private: 0,
    shared: 1,
    public: 2,
  };

  /**
   * True when moving to `visibility` takes readers away, so the photo needs a
   * new id: ids handed to the old audience stop working (ADR 0011).
   */
  narrowsTo(visibility: EntryVisibility): boolean {
    return (
      this.record.photoId !== null &&
      DiaryEntry.audience[visibility] < DiaryEntry.audience[this.record.visibility]
    );
  }

  needsShareToken(): boolean {
    return this.record.visibility !== 'private' && this.record.shareToken === null;
  }

  /**
   * What the share link shows. Private (or on an item that is not public) reads
   * as private, even when hidden; a hidden shared or public entry as removed.
   */
  sharedView(authorName: string, publicItem: ItemRef | null): SharedEntryView {
    if (this.record.visibility === 'private' || !publicItem) {
      return { status: 'private' };
    }
    if (this.record.hidden) {
      return { status: 'removed' };
    }
    return { status: 'visible', entry: this.toPublic(authorName), item: publicItem };
  }

  toContract(): Entry {
    const { id, itemId, variationId, venueId, eatenAt, rating, wouldOrderAgain } = this.record;
    const { pricePaid, text, visibility, shareToken, hidden, photoUrl } = this.record;
    const { createdAt, updatedAt } = this.record;
    return {
      ...{ id, itemId, variationId, venueId, eatenAt, rating, wouldOrderAgain, pricePaid, text },
      ...{ visibility, shareToken, hidden, photoUrl, createdAt, updatedAt },
    };
  }

  toPublic(authorName: string): PublicEntry {
    const { id, itemId, variationId, venueId, eatenAt, rating, wouldOrderAgain } = this.record;
    const { pricePaid, text, photoUrl, createdAt } = this.record;
    return {
      id,
      itemId,
      variationId,
      venueId,
      eatenAt,
      rating,
      wouldOrderAgain,
      pricePaid,
      text,
      authorName,
      photoUrl,
      createdAt,
    };
  }
}
