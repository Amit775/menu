import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  type Account,
  accountMePath,
  accountPath,
  AccountSchema,
  type UpdateAccount,
} from '@menu/shared/contracts';
import { firstValueFrom } from 'rxjs';

/** HTTP access to `/api/accounts`. Every response is validated against the shared contract. */
@Service()
export class AccountApiClient {
  private readonly http = inject(HttpClient);
  private readonly meUrl = `/api/${accountPath}/${accountMePath}`;

  /** The signed-in account, created by the API on first sign-in. */
  async me(): Promise<Account> {
    return AccountSchema.parse(await firstValueFrom(this.http.get<unknown>(this.meUrl)));
  }

  async updateMe(changes: UpdateAccount): Promise<Account> {
    return AccountSchema.parse(await firstValueFrom(this.http.patch<unknown>(this.meUrl, changes)));
  }
}
