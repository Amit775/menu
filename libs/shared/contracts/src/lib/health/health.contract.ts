import { z } from 'zod';

/** `GET /api/health` */
export const healthRoute = { method: 'GET', path: 'health' } as const;

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  uptimeSeconds: z.number().nonnegative(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
