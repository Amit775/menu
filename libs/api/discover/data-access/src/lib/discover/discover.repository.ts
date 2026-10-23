import { Injectable } from '@nestjs/common';
import { PrismaService, toLocalized } from '@menu/api/shared/db';
import {
  type EntryVisibility,
  type GeoPoint,
  type LocalizedText,
  type MenuSection,
  type Tag,
  type Venue,
} from '@menu/shared/contracts';

/** An approved or archived item of an active venue, with what discovery needs about its venue. */
export interface CatalogItem {
  id: string;
  name: LocalizedText;
  state: 'approved' | 'archived';
  venueId: string;
  venueName: LocalizedText;
  venueLocation: GeoPoint;
  sectionId: string;
  position: number;
  tagIds: string[];
  listPrice: number | null;
  createdAt: Date;
}

/** One unhidden entry, reduced to what scores and counts need. Never leaves the API. */
export interface EntryFact {
  itemId: string;
  authorId: string;
  rating: number | null;
  wouldOrderAgain: boolean | null;
  pricePaid: number | null;
  visibility: EntryVisibility;
  eatenAt: Date;
  createdAt: Date;
}

/**
 * The discover read model: reads the menus and entries tables and never writes.
 * Loads the whole catalog per request, which is fine at friends scale; a stored
 * score table can replace it behind the same service.
 */
@Injectable()
export class DiscoverRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadCatalog(): Promise<CatalogItem[]> {
    const rows = await this.prisma.item.findMany({
      where: { state: { in: ['approved', 'archived'] }, venue: { status: 'active' } },
      include: {
        venue: { select: { nameHe: true, nameEn: true, lat: true, lng: true } },
        tags: { select: { tagId: true }, orderBy: { position: 'asc' } },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      name: toLocalized(row),
      state: row.state === 'archived' ? 'archived' : 'approved',
      venueId: row.venueId,
      venueName: toLocalized(row.venue),
      venueLocation: { lat: row.venue.lat, lng: row.venue.lng },
      sectionId: row.sectionId,
      position: row.position,
      tagIds: row.tags.map((tag) => tag.tagId),
      listPrice: row.listPrice,
      createdAt: row.createdAt,
    }));
  }

  async loadEntryFacts(itemIds: readonly string[]): Promise<EntryFact[]> {
    return this.prisma.entry.findMany({
      where: { itemId: { in: [...itemIds] }, hiddenAt: null },
      select: {
        itemId: true,
        authorId: true,
        rating: true,
        wouldOrderAgain: true,
        pricePaid: true,
        visibility: true,
        eatenAt: true,
        createdAt: true,
      },
    });
  }

  /** The items this author has written about, for the flag. Hidden entries count: they are still the author's. */
  async itemIdsWrittenBy(authorId: string): Promise<Set<string>> {
    const rows = await this.prisma.entry.findMany({
      where: { authorId },
      select: { itemId: true },
      distinct: ['itemId'],
    });
    return new Set(rows.map((row) => row.itemId));
  }

  countEntriesAt(authorId: string, venueId: string): Promise<number> {
    return this.prisma.entry.count({ where: { authorId, venueId } });
  }

  /** An active venue; hidden ones are not part of discovery. */
  async findActiveVenue(id: string): Promise<Venue | null> {
    const row = await this.prisma.venue.findFirst({ where: { id, status: 'active' } });
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      name: toLocalized(row),
      address: row.address,
      location: { lat: row.lat, lng: row.lng },
      phone: row.phone,
      reservationUrl: row.reservationUrl,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async listActiveVenues(): Promise<{ id: string; name: LocalizedText }[]> {
    const rows = await this.prisma.venue.findMany({
      where: { status: 'active' },
      select: { id: true, nameHe: true, nameEn: true },
    });
    return rows.map((row) => ({ id: row.id, name: toLocalized(row) }));
  }

  async listSections(venueId: string): Promise<MenuSection[]> {
    const rows = await this.prisma.menuSection.findMany({
      where: { venueId },
      orderBy: { position: 'asc' },
    });
    return rows.map((row) => ({
      id: row.id,
      venueId: row.venueId,
      name: toLocalized(row),
      position: row.position,
    }));
  }

  async listTags(): Promise<Tag[]> {
    const rows = await this.prisma.tag.findMany({ orderBy: { nameHe: 'asc' } });
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: toLocalized(row),
      kind: row.kind,
    }));
  }
}
