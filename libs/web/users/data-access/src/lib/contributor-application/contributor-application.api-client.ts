import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  accountPath,
  type ContributorApplication,
  ContributorApplicationSchema,
  type MyContributorApplication,
  myContributorApplicationPath,
  MyContributorApplicationSchema,
} from '@menu/shared/contracts';
import { firstValueFrom } from 'rxjs';

@Service()
export class ContributorApplicationApiClient {
  private readonly http = inject(HttpClient);
  private readonly url = `/api/${accountPath}/${myContributorApplicationPath}`;

  async mine(): Promise<MyContributorApplication> {
    return MyContributorApplicationSchema.parse(
      await firstValueFrom(this.http.get<unknown>(this.url)),
    );
  }

  async apply(note: string): Promise<ContributorApplication> {
    return ContributorApplicationSchema.parse(
      await firstValueFrom(this.http.post<unknown>(this.url, { note })),
    );
  }
}
