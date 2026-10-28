import { Injectable } from '@nestjs/common';
import { PrismaService, readPrice, readText } from '@menu/api/shared/db';
import {
  type GeoPoint,
  type ItemRevisionKind,
  type ItemSnapshot,
  ItemSnapshotSchema,
  type MenuSection,
  MenuSectionSchema,
  type Price,
  type Tag,
  type Text,
  type Venue,
} from '@menu/shared/contracts';

export interface CatalogItem {
  id: string;
  name: Text;
  state: 'approved' | 'archived';
  venueId: string;
  venueName: Text;
  venueLocation: GeoPoint;
  sectionId: string;
  position: number;
  tagIds: string[];
  listPrice: Price | null;
  createdAt: Date;
}

export interface ItemRevisionRecord {
  kind: ItemRevisionKind;
  snapshot: ItemSnapshot;
  changedAt: string;
}

const StoredSectionsSchema = MenuSectionSchema.pick({ id: true, name: true }).array();

/**
 * The discover read model over the menus tables; it never writes. Entries reach
 * discover only as aggregates through the `ENTRY_STATS` port (ADR 0004).
 * Loads the whole catalog per request, which is fine at friends scale; a stored
 * score table can replace it behind the same service.
 */
@Injectable()
export class DiscoverRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadCatalog(): Promise<CatalogItem[]> {
    const rows = await this.prisma.item.findMany({
      where: { state: { in: ['approved', 'archived'] }, venue: { status: 'active' } },
      include: { venue: { select: { name: true, lat: true, lng: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      name: readText(row.name),
      state: row.state === 'archived' ? 'archived' : 'approved',
      venueId: row.venueId,
      venueName: readText(row.venue.name),
      venueLocation: { lat: row.venue.lat, lng: row.venue.lng },
      sectionId: row.sectionId,
      position: row.position,
      tagIds: row.tagIds,
      listPrice: readPrice(row.listPriceValue, row.listPriceCurrency),
      createdAt: row.createdAt,
    }));
  }

  async findActiveVenue(id: string): Promise<Venue | null> {
    const row = await this.prisma.venue.findFirst({ where: { id, status: 'active' } });
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      name: readText(row.name),
      address: readText(row.address),
      location: { lat: row.lat, lng: row.lng },
      phone: row.phone,
      reservationUrl: row.reservationUrl,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async listActiveVenues(): Promise<{ id: string; name: Text }[]> {
    const rows = await this.prisma.venue.findMany({
      where: { status: 'active' },
      select: { id: true, name: true },
    });
    return rows.map((row) => ({ id: row.id, name: readText(row.name) }));
  }

  async listSections(venueId: string): Promise<MenuSection[]> {
    const row = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: { sections: true },
    });
    return StoredSectionsSchema.parse(row?.sections ?? []).map((section, position) => ({
      ...section,
      venueId,
      position,
    }));
  }

  async listTags(): Promise<Tag[]> {
    const rows = await this.prisma.tag.findMany();
    return rows
      .map((row) => ({ id: row.id, slug: row.slug, name: readText(row.name), kind: row.kind }))
      .sort((a, b) => a.name.he.localeCompare(b.name.he, 'he'));
  }

  async listRevisions(itemId: string): Promise<ItemRevisionRecord[]> {
    const rows = await this.prisma.itemRevision.findMany({
      where: { itemId },
      orderBy: [{ changedAt: 'asc' }, { seq: 'asc' }],
      select: { kind: true, snapshot: true, changedAt: true },
    });
    return rows.map((row) => ({
      kind: row.kind,
      // A snapshot that does not parse is a data bug, so the page fails rather than show a wrong history.
      snapshot: ItemSnapshotSchema.parse(row.snapshot),
      changedAt: row.changedAt.toISOString(),
    }));
  }
}
