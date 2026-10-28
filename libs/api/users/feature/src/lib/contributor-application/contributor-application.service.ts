import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ContributorApplicationRepository } from '@menu/api/users/data-access';
import { canContribute, type Principal } from '@menu/api/shared/util-auth';
import {
  type ContributorApplication,
  type ContributorApplicationDecision,
  type ContributorApplicationReview,
  type MyContributorApplication,
  REAPPLY_AFTER_DAYS,
} from '@menu/shared/contracts';

const DAY = 24 * 60 * 60 * 1000;

/** Null while the caller cannot apply: already a Contributor or Admin, or an application is pending. */
export function canApplyFrom(
  principal: Principal,
  latest: ContributorApplication | null,
  now: Date,
): Date | null {
  if (canContribute(principal) || latest?.status === 'pending') {
    return null;
  }
  if (latest?.status === 'rejected' && latest.decidedAt) {
    const from = new Date(new Date(latest.decidedAt).getTime() + REAPPLY_AFTER_DAYS * DAY);
    return from > now ? from : now;
  }
  return now;
}

@Injectable()
export class ContributorApplicationService {
  constructor(private readonly repository: ContributorApplicationRepository) {}

  async mine(principal: Principal, now = new Date()): Promise<MyContributorApplication> {
    const application = await this.repository.latestFor(principal.accountId);
    return {
      application,
      canApplyFrom: canApplyFrom(principal, application, now)?.toISOString() ?? null,
    };
  }

  async apply(
    principal: Principal,
    note: string,
    now = new Date(),
  ): Promise<ContributorApplication> {
    const from = canApplyFrom(principal, await this.repository.latestFor(principal.accountId), now);
    if (!from || from > now) {
      throw new ConflictException('You cannot apply to be a Contributor now.');
    }
    const application = await this.repository.create(principal.accountId, note);
    if (!application) {
      throw new ConflictException('You already have a pending application.');
    }
    return application;
  }

  listPending(): Promise<ContributorApplicationReview[]> {
    return this.repository.listPending();
  }

  async decide(
    principal: Principal,
    id: string,
    decision: ContributorApplicationDecision,
  ): Promise<ContributorApplicationReview> {
    const application = await this.repository.decide(id, decision, principal.accountId);
    if (!application) {
      throw new NotFoundException('No pending application with this id.');
    }
    return application;
  }
}
