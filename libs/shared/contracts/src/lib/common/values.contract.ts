import { z } from 'zod';

export const LanguageSchema = z.enum(['he', 'en']);

export type Language = z.infer<typeof LanguageSchema>;

const name = z.string().trim().min(1).max(200);

export const LocalizedTextSchema = z.object({
  he: name,
  en: name.optional(),
});

export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

export const AgorotSchema = z.number().int().min(0).max(100_000_00);

export type Agorot = z.infer<typeof AgorotSchema>;

export const GeoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type GeoPoint = z.infer<typeof GeoPointSchema>;

export const IdSchema = z.uuid();
