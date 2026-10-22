import { Test } from '@nestjs/testing';
import { HealthResponseSchema } from '@menu/shared/contracts';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns a response that satisfies the shared contract', async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [HealthController] }).compile();
    const controller = moduleRef.get(HealthController);
    expect(HealthResponseSchema.safeParse(controller.getHealth()).success).toBe(true);
  });
});
