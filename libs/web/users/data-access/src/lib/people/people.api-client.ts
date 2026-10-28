import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  accountPath,
  type AccountSummary,
  AccountSummarySchema,
  type ContributorApplicationDecision,
  contributorApplicationPath,
  type ContributorApplicationReview,
  ContributorApplicationReviewSchema,
  type Ownership,
  ownershipPath,
  OwnershipSchema,
} from '@menu/shared/contracts';
import { firstValueFrom } from 'rxjs';
import { z } from 'zod';

@Service()
export class PeopleApiClient {
  private readonly http = inject(HttpClient);

  async accounts(): Promise<AccountSummary[]> {
    const body = await firstValueFrom(this.http.get<unknown>(`/api/${accountPath}`));
    return z.array(AccountSummarySchema).parse(body);
  }

  async setAdmin(id: string, isAdmin: boolean): Promise<AccountSummary> {
    const body = await firstValueFrom(
      this.http.put<unknown>(`/api/${accountPath}/${id}/admin`, { isAdmin }),
    );
    return AccountSummarySchema.parse(body);
  }

  async setContributor(id: string, isContributor: boolean): Promise<AccountSummary> {
    const body = await firstValueFrom(
      this.http.put<unknown>(`/api/${accountPath}/${id}/contributor`, { isContributor }),
    );
    return AccountSummarySchema.parse(body);
  }

  async applications(): Promise<ContributorApplicationReview[]> {
    const body = await firstValueFrom(this.http.get<unknown>(`/api/${contributorApplicationPath}`));
    return z.array(ContributorApplicationReviewSchema).parse(body);
  }

  async decide(
    id: string,
    decision: ContributorApplicationDecision,
  ): Promise<ContributorApplicationReview> {
    const body = await firstValueFrom(
      this.http.post<unknown>(`/api/${contributorApplicationPath}/${id}/${decision}`, {}),
    );
    return ContributorApplicationReviewSchema.parse(body);
  }

  async owners(venueId: string): Promise<Ownership[]> {
    const params = new HttpParams().set('venueId', venueId);
    const body = await firstValueFrom(this.http.get<unknown>(`/api/${ownershipPath}`, { params }));
    return z.array(OwnershipSchema).parse(body);
  }

  async grant(venueId: string, accountId: string): Promise<Ownership> {
    const body = await firstValueFrom(
      this.http.post<unknown>(`/api/${ownershipPath}`, { venueId, accountId }),
    );
    return OwnershipSchema.parse(body);
  }

  async revoke(venueId: string, accountId: string): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/${ownershipPath}/${venueId}/${accountId}`));
  }
}
