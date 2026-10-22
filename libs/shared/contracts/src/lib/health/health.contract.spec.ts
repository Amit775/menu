import { HealthResponseSchema } from './health.contract';

describe('HealthResponseSchema', () => {
  it('accepts a valid response', () => {
    expect(HealthResponseSchema.parse({ status: 'ok', uptimeSeconds: 12 })).toEqual({
      status: 'ok',
      uptimeSeconds: 12,
    });
  });

  it('rejects a negative uptime', () => {
    expect(HealthResponseSchema.safeParse({ status: 'ok', uptimeSeconds: -1 }).success).toBe(false);
  });
});
