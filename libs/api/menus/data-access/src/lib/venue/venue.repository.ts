import { Injectable } from '@nestjs/common';
import { fromLocalized, PrismaService, toLocalized } from '@menu/api/shared/db';
import { withoutUndefined } from '@menu/api/shared/util';
import {
  type CreateVenue,
  type UpdateVenue,
  type Venue,
  type VenueStatus,
} from '@menu/shared/contracts';

interface VenueRow {
  id: string;
  nameHe: string;
  nameEn: string | null;
  address: string;
  lat: number;
  lng: number;
  phone: string | null;
  reservationUrl: string | null;
  status: VenueStatus;
  createdAt: Date;
}

export interface VenueFilter {
  /** Only these venues. */
  ids?: readonly string[];
  /** Include hidden venues (Admins, and Owners for their own). */
  includeHidden: boolean;
}

/** Maps between Prisma rows and the shared contract. The only code that touches `prisma.venue`. */
@Injectable()
export class VenueRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: VenueFilter): Promise<Venue[]> {
    const rows = await this.prisma.venue.findMany({
      where: {
        ...(filter.ids ? { id: { in: [...filter.ids] } } : {}),
        ...(filter.includeHidden ? {} : { status: 'active' }),
      },
      orderBy: { nameHe: 'asc' },
    });
    return rows.map(toContract);
  }

  async findById(id: string): Promise<Venue | null> {
    const row = await this.prisma.venue.findUnique({ where: { id } });
    return row ? toContract(row) : null;
  }

  /** Creates the venue and its first sections in menu order. */
  async create(input: CreateVenue, createdById: string): Promise<Venue> {
    const row = await this.prisma.venue.create({
      data: {
        ...fromLocalized(input.name),
        address: input.address,
        lat: input.location.lat,
        lng: input.location.lng,
        phone: input.phone,
        reservationUrl: input.reservationUrl,
        createdById,
        sections: {
          create: input.sections.map((name, position) => ({ ...fromLocalized(name), position })),
        },
      },
    });
    return toContract(row);
  }

  async update(id: string, input: UpdateVenue): Promise<Venue | null> {
    const { name, location, ...rest } = input;
    const { count } = await this.prisma.venue.updateMany({
      where: { id },
      data: withoutUndefined({
        ...rest,
        ...(name ? fromLocalized(name) : {}),
        ...(location ? { lat: location.lat, lng: location.lng } : {}),
      }),
    });
    return count === 0 ? null : this.findById(id);
  }
}

function toContract(row: VenueRow): Venue {
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
