import { Body, Controller, Get, Param, Patch, Put } from '@nestjs/common';
import { ZodValidationPipe } from '@menu/api/shared/util';
import {
  AdminOnly,
  Authenticated,
  CurrentPrincipal,
  type Principal,
} from '@menu/api/shared/util-auth';
import {
  type Account,
  accountMePath,
  accountPath,
  type AccountSummary,
  IdSchema,
  type SetAdmin,
  SetAdminSchema,
  type SetContributor,
  SetContributorSchema,
  type UpdateAccount,
  UpdateAccountSchema,
} from '@menu/shared/contracts';
import { AccountService } from './account.service';

@Controller(accountPath)
export class AccountController {
  constructor(private readonly service: AccountService) {}

  @Get(accountMePath)
  @Authenticated()
  me(@CurrentPrincipal() principal: Principal): Promise<Account> {
    return this.service.get(principal.accountId);
  }

  @Patch(accountMePath)
  @Authenticated()
  updateMe(
    @CurrentPrincipal() principal: Principal,
    @Body(new ZodValidationPipe(UpdateAccountSchema)) input: UpdateAccount,
  ): Promise<Account> {
    return this.service.update(principal.accountId, input);
  }

  @Get()
  @AdminOnly()
  list(): Promise<AccountSummary[]> {
    return this.service.list();
  }

  @Put(':id/admin')
  @AdminOnly()
  setAdmin(
    @CurrentPrincipal() principal: Principal,
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
    @Body(new ZodValidationPipe(SetAdminSchema)) input: SetAdmin,
  ): Promise<AccountSummary> {
    return this.service.setAdmin(principal, id, input.isAdmin);
  }

  @Put(':id/contributor')
  @AdminOnly()
  setContributor(
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
    @Body(new ZodValidationPipe(SetContributorSchema)) input: SetContributor,
  ): Promise<AccountSummary> {
    return this.service.setContributor(id, input.isContributor);
  }
}
