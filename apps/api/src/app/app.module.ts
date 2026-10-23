import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DbModule } from '@menu/api/shared/db';
import { ApiExceptionFilter } from '@menu/api/shared/util';
import { AuthModule, RejectingTokenVerifier } from '@menu/api/shared/util-auth';
import { ItemModule, MenuSectionModule, TagModule, VenueModule } from '@menu/api/menus/feature';
import { AccountModule, AccountService, OwnershipModule } from '@menu/api/users/feature';
import { HealthController } from './health/health.controller';

// Feature modules from libs/api/<domain>/feature are registered here by the
// nest-resource generator. Keep this file to wiring only.
@Module({
  imports: [
    ItemModule,
    TagModule,
    MenuSectionModule,
    VenueModule,
    OwnershipModule,
    AccountModule,
    DbModule,
    // Sign-in: the users domain resolves who is calling; the verifier checks tokens.
    AuthModule.forRoot({
      resolverModule: AccountModule,
      resolver: AccountService,
      verifier: RejectingTokenVerifier,
    }),
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class AppModule {}
