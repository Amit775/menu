import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DbModule } from '@menu/api/shared/db';
import { ApiExceptionFilter } from '@menu/api/shared/util';
import { HealthController } from './health/health.controller';

// Feature modules from libs/api/<domain>/feature are registered here by the
// nest-resource generator. Keep this file to wiring only.
@Module({
  imports: [DbModule],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class AppModule {}
