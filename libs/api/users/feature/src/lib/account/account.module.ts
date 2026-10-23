import { Module } from '@nestjs/common';
import { AccountRepository } from '@menu/api/users/data-access';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { USERS_CONFIG, usersConfigFromEnv } from './users.config';

@Module({
  controllers: [AccountController],
  providers: [
    AccountService,
    AccountRepository,
    { provide: USERS_CONFIG, useFactory: () => usersConfigFromEnv() },
  ],
  exports: [AccountService],
})
export class AccountModule {}
