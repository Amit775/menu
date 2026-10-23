import { Module } from '@nestjs/common';
import { OwnershipRepository } from '@menu/api/users/data-access';
import { OwnershipController } from './ownership.controller';
import { OwnershipService } from './ownership.service';

@Module({
  controllers: [OwnershipController],
  providers: [OwnershipService, OwnershipRepository],
})
export class OwnershipModule {}
