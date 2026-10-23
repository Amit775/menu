import { Module } from '@nestjs/common';
import { AccountRepository } from '@menu/api/users/data-access';
import { AccountDirectory } from './account-directory';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { USERS_CONFIG, usersConfigFromEnv } from './users.config';

@Module({
  controllers: [AccountController],
  providers: [
    AccountService,
    AccountRepository,
    AccountDirectory,
    { provide: USERS_CONFIG, useFactory: () => usersConfigFromEnv() },
  ],
  exports: [AccountService, AccountDirectory],
})
export class AccountModule {}
