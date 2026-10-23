import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

const GLOBAL_PREFIX = 'api';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(GLOBAL_PREFIX);
  app.enableShutdownHooks();
  const port = Number(process.env['PORT'] ?? 3000);
  await app.listen(port);
  Logger.log(`Application is running on: http://localhost:${port}/${GLOBAL_PREFIX}`, 'Bootstrap');
}

bootstrap().catch((error: unknown) => {
  Logger.error(error, 'Bootstrap');
  process.exit(1);
});
