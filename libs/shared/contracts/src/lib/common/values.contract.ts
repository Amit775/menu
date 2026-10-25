import { z } from 'zod';

export const LanguageSchema = z.enum(['he', 'en']);

export type Language = z.infer<typeof LanguageSchema>;

function textOf(max: number) {
  return z.object({
    he: z.string().trim().min(1).max(max),
    en: z
      .string()
      .trim()
      .max(max)
      .nullable()
      .transform((value) => (value === '' ? null : value)),
  });
}

export const TextSchema = textOf(200);

export const LongTextSchema = textOf(2000);

export type Text = z.infer<typeof TextSchema>;

export const CurrencySchema = z.enum(['ILS']);

export type Currency = z.infer<typeof CurrencySchema>;

// Floats cannot hold every cent exactly (0.07 * 100 is 7.000000000000001), so cents are compared with a tolerance.
export const ShekelsSchema = z
  .number()
  .min(0)
  .max(100_000)
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6,
    'At most two decimals.',
  );

export const PriceSchema = z.object({
  value: ShekelsSchema,
  currency: CurrencySchema,
});

export type Price = z.infer<typeof PriceSchema>;

export const GeoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type GeoPoint = z.infer<typeof GeoPointSchema>;

export const IdSchema = z.uuid();
