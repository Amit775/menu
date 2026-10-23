import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DbModule } from '@menu/api/shared/db';
import { ApiExceptionFilter } from '@menu/api/shared/util';
import { AuthModule, verifierFromEnv } from '@menu/api/shared/util-auth';
import { ItemModule, MenuSectionModule, TagModule, VenueModule } from '@menu/api/menus/feature';
import { AccountModule, AccountService, OwnershipModule } from '@menu/api/users/feature';
import { DiscoverModule } from '@menu/api/discover/feature';
import { EntryModule } from '@menu/api/entries/feature';
import { HealthController } from './health/health.controller';
import { PortsModule } from './ports.module';

// Feature modules from libs/api/<domain>/feature are registered here by the
// nest-resource generator. Keep this file to wiring only.
@Module({
  imports: [
    DiscoverModule,
    EntryModule,
    ItemModule,
    TagModule,
    MenuSectionModule,
    VenueModule,
    OwnershipModule,
    AccountModule,
    DbModule,
    PortsModule,
    // Sign-in: the users domain resolves who is calling; Firebase checks tokens
    // (development tokens locally with AUTH_DEV_TOKENS=true).
    AuthModule.forRoot({
      resolverModule: AccountModule,
      resolver: AccountService,
      verifier: verifierFromEnv(),
    }),
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class AppModule {}
