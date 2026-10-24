import { Injectable } from '@nestjs/common';
import { PrismaService, toLocalized } from '@menu/api/shared/db';
import {
  type GeoPoint,
  type LocalizedText,
  type MenuSection,
  type Tag,
  type Venue,
} from '@menu/shared/contracts';

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
