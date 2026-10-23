import { z } from 'zod';

/** The app's languages. Hebrew is the default and is written right to left. */
export const LanguageSchema = z.enum(['he', 'en']);

export type Language = z.infer<typeof LanguageSchema>;

const name = z.string().trim().min(1).max(200);

/** A name shown in both languages. Hebrew is required; English falls back to Hebrew when missing. */
export const LocalizedTextSchema = z.object({
  he: name,
  en: name.optional(),
});

export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

/** Money in agorot (1/100 shekel), always a whole number. The UI shows whole shekels. */
export const AgorotSchema = z.number().int().min(0).max(100_000_00);

export type Agorot = z.infer<typeof AgorotSchema>;

/** A WGS84 coordinate. */
export const GeoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type GeoPoint = z.infer<typeof GeoPointSchema>;

/** A resource id in a route parameter: `@Param('id', new ZodValidationPipe(IdSchema))`. */
export const IdSchema = z.uuid();
