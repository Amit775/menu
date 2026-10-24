import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  accountPath,
  type AccountSummary,
  AccountSummarySchema,
  type Ownership,
  ownershipPath,
  OwnershipSchema,
} from '@menu/shared/contracts';
import { firstValueFrom } from 'rxjs';
import { z } from 'zod';

/**
 * HTTP access to the Admin's people endpoints: accounts, the Admin flag and
 * venue ownerships. Every response is validated against the shared contract.
 */
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
