import { z } from 'zod';

/** Error body every API endpoint returns on failure (see apps/api exception filter). */
export const ApiErrorSchema = z.object({
  statusCode: z.number().int(),
  message: z.string(),
  issues: z
    .array(
      z.object({
        path: z.array(z.union([z.string(), z.number()])),
        message: z.string(),
      }),
    )
    .optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
