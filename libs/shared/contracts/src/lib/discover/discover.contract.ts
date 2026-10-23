import { z } from 'zod';
import { AgorotSchema, GeoPointSchema, LocalizedTextSchema } from '../common/values.contract';
import { MenuSectionSchema } from '../menus/menu-section.contract';
import { TagSchema } from '../menus/tag.contract';
import { VenueSchema } from '../menus/venue.contract';

/** REST base path: `/api/discover`. Read-only views built from menus and entries. */
export const discoverPath = 'discover';

/** Fewer rated entries than this and an item shows no score (and no ratio): noise, and a diner could be identified. */
export const SCORE_FLOOR = 3;

const QueryNumber = z.coerce.number();

/** `?tagIds=a,b`: every listed tag must apply. */
const TagIdsQuery = z
  .string()
  .optional()
  .transform((value) => (value ? value.split(',').filter(Boolean) : []))
  .pipe(z.array(z.uuid()).max(10));

/** Where the caller is, when they shared it. Both or neither. */
const NearQuerySchema = z.object({
  lat: QueryNumber.min(-90).max(90).optional(),
  lng: QueryNumber.min(-180).max(180).optional(),
});

function bothOrNeither(value: { lat?: number | undefined; lng?: number | undefined }): boolean {
  return (value.lat === undefined) === (value.lng === undefined);
}

/**
 * `GET /api/discover/feed`. `mode=reels` interleaves one not-yet-ranked item
 * every five cards; `mode=list` puts them after the ranked ones. `sort` other
 * than `score` orders everything by distance or price.
 */
export const FeedQuerySchema = NearQuerySchema.extend({
  radiusKm: QueryNumber.positive().max(100).default(5),
  tagIds: TagIdsQuery,
  mode: z.enum(['reels', 'list']).default('reels'),
  sort: z.enum(['score', 'distance', 'price']).default('score'),
  minPrice: QueryNumber.pipe(AgorotSchema).optional(),
  maxPrice: QueryNumber.pipe(AgorotSchema).optional(),
  minEntries: QueryNumber.int().min(0).max(1000).optional(),
  offset: QueryNumber.int().min(0).default(0),
  limit: QueryNumber.int().min(1).max(50).default(20),
}).refine(bothOrNeither, 'Send lat and lng together.');

export type FeedQuery = z.infer<typeof FeedQuerySchema>;

/** `GET /api/discover/map`: the same filters as the feed, one pin per venue. */
export const MapQuerySchema = NearQuerySchema.extend({
  radiusKm: QueryNumber.positive().max(100).default(5),
  tagIds: TagIdsQuery,
}).refine(bothOrNeither, 'Send lat and lng together.');

export type MapQuery = z.infer<typeof MapQuerySchema>;

/** `?lat=&lng=` on venue and item pages, for the distance. */
export const NearQuery = NearQuerySchema.refine(bothOrNeither, 'Send lat and lng together.');

export type Near = z.infer<typeof NearQuery>;

/** `GET /api/discover/search?q=`. */
export const SearchQuerySchema = z.object({ q: z.string().trim().min(1).max(60) });

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const VenueRefSchema = z.object({ id: z.uuid(), name: LocalizedTextSchema });

export type VenueRef = z.infer<typeof VenueRefSchema>;

/**
 * One item as discovery shows it. `score` and `wouldOrderAgainPercent` are null
 * until `ratingCount` reaches the floor. `latestPrice` is the menu price, or the
 * latest price in a public entry. `writtenByMe` is the flag on items the caller
 * has an entry on.
 */
export const DiscoverItemSchema = z.object({
  id: z.uuid(),
  name: LocalizedTextSchema,
  venue: VenueRefSchema,
  sectionId: z.uuid(),
  tagIds: z.array(z.uuid()),
  distanceMeters: z.number().min(0).nullable(),
  score: z.number().min(1).max(5).nullable(),
  ratingCount: z.number().int().min(0),
  wouldOrderAgainPercent: z.number().int().min(0).max(100).nullable(),
  latestPrice: AgorotSchema.nullable(),
  writtenByMe: z.boolean(),
});

export type DiscoverItem = z.infer<typeof DiscoverItemSchema>;

export const FeedSchema = z.object({
  items: z.array(DiscoverItemSchema),
  /** Pass as `offset` for the next page; null at the end. */
  nextOffset: z.number().int().min(0).nullable(),
});

export type Feed = z.infer<typeof FeedSchema>;

export const MapPinSchema = z.object({
  venue: VenueRefSchema,
  location: GeoPointSchema,
  itemCount: z.number().int().min(1),
  bestScore: z.number().min(1).max(5).nullable(),
  writtenByMe: z.boolean(),
});

export type MapPin = z.infer<typeof MapPinSchema>;

/** `GET /api/discover/venues/:id`: the venue page, menu first. */
export const VenuePageSchema = z.object({
  venue: VenueSchema,
  distanceMeters: z.number().min(0).nullable(),
  topItems: z.array(DiscoverItemSchema).max(3),
  sections: z.array(z.object({ section: MenuSectionSchema, items: z.array(DiscoverItemSchema) })),
  /** "Your N entries here"; 0 for visitors. */
  myEntryCount: z.number().int().min(0),
});

export type VenuePage = z.infer<typeof VenuePageSchema>;

/** Average price per month, only for months with at least `SCORE_FLOOR` prices. */
export const PricePointSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  averagePrice: AgorotSchema,
  count: z.number().int().min(SCORE_FLOOR),
});

export type PricePoint = z.infer<typeof PricePointSchema>;

/** `GET /api/discover/items/:id`: the item page (public entries come from the entries sheet). */
export const ItemPageSchema = z.object({
  item: DiscoverItemSchema,
  archived: z.boolean(),
  tags: z.array(TagSchema),
  priceHistory: z.array(PricePointSchema),
  alsoGoodHere: z.array(DiscoverItemSchema).max(3),
});

export type ItemPage = z.infer<typeof ItemPageSchema>;

export const SearchResultsSchema = z.object({
  items: z.array(DiscoverItemSchema).max(5),
  venues: z.array(VenueRefSchema).max(5),
  tags: z.array(TagSchema).max(5),
});

export type SearchResults = z.infer<typeof SearchResultsSchema>;

/**
 * `GET /api/discover/venues/:id/insights` (the venue's Owner or an Admin).
 * Entries that are not public are only counted, and only from the floor up.
 */
export const VenueInsightsSchema = z.object({
  items: z.array(
    z.object({
      itemId: z.uuid(),
      name: LocalizedTextSchema,
      score: z.number().min(1).max(5).nullable(),
      ratingCount: z.number().int().min(0),
      publicEntryCount: z.number().int().min(0),
      otherEntryCount: z.number().int().min(SCORE_FLOOR).nullable(),
      wouldOrderAgainPercent: z.number().int().min(0).max(100).nullable(),
    }),
  ),
});

export type VenueInsights = z.infer<typeof VenueInsightsSchema>;
