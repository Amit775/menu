import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { type ItemRecord } from '@menu/api/menus/data-access';
import { canEditVenue, type Principal } from '@menu/api/shared/util-auth';
import { type Item, type ItemState } from '@menu/shared/contracts';

export class MenuItem {
  constructor(readonly record: ItemRecord) {}

  get id(): string {
    return this.record.id;
  }

  get state(): ItemState {
    return this.record.state;
  }

  canBeEditedBy(principal: Principal | null): boolean {
    return canEditVenue(principal, this.record.venueId);
  }

  isSubmittedBy(principal: Principal | null): boolean {
    return principal !== null && this.record.submittedById === principal.accountId;
  }

  /**
   * Approved, archived and merged items are public (merged ones so old links can
   * follow `mergedIntoId`). Pending and rejected items are seen by their submitter
   * and by the venue's approvers.
   */
  isVisibleTo(principal: Principal | null): boolean {
    if (this.state === 'pending' || this.state === 'rejected') {
      return this.isSubmittedBy(principal) || this.canBeEditedBy(principal);
    }
    return true;
  }

  acceptsEntryFrom(principal: Principal): boolean {
    if (this.state === 'approved') {
      return true;
    }
    return (this.state === 'pending' || this.state === 'rejected') && this.isSubmittedBy(principal);
  }

  assertEditableBy(principal: Principal): void {
    if (!this.canBeEditedBy(principal)) {
      throw new ForbiddenException('Only the venue’s Owner or an Admin can edit its items.');
    }
    if (this.state !== 'pending' && this.state !== 'approved') {
      throw new ConflictException(`A ${this.state} item cannot be edited.`);
    }
  }

  assertDecision(
    principal: Principal,
    decision: 'approve' | 'reject' | 'merge' | 'archive',
  ): ItemState {
    if (!this.canBeEditedBy(principal)) {
      throw new ForbiddenException('Only the venue’s Owner or an Admin can decide on its items.');
    }
    const from: ItemState = decision === 'archive' ? 'approved' : 'pending';
    if (this.state !== from) {
      throw new ConflictException(
        `Only a ${from} item can be ${decision === 'merge' ? 'merged' : `${decision}d`}.`,
      );
    }
    return from;
  }

  assertCanMergeInto(target: MenuItem): void {
    if (target.record.venueId !== this.record.venueId || target.state !== 'approved') {
      throw new BadRequestException('Merge into an approved item of the same venue.');
    }
  }

  /** The contract shape for this caller: approvers never learn who submitted it. */
  toContract(principal: Principal | null): Item {
    const { id, venueId, sectionId, name, description, listPrice, tagIds } = this.record;
    const { variations, state, mergedIntoId, position, photoUrl, createdAt } = this.record;
    return {
      ...{ id, venueId, sectionId, name, description, listPrice, tagIds, variations, state },
      ...{ mergedIntoId, position, photoUrl, createdAt },
      submittedByMe: principal !== null && this.record.submittedById === principal.accountId,
    };
  }
}
