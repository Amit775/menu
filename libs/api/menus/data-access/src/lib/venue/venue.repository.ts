import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService, readText } from '@menu/api/shared/db';
import { withoutUndefined } from '@menu/api/shared/util';
import {
  type CreateVenue,
  type UpdateVenue,
  type Venue,
  type VenueStatus,
} from '@menu/shared/contracts';

interface VenueRow {
  id: string;
  name: unknown;
  address: unknown;
  lat: number;
  lng: number;
  phone: string | null;
  reservationUrl: string | null;
  status: VenueStatus;
  createdAt: Date;
}

export interface VenueFilter {
  ids?: readonly string[];
  includeHidden: boolean;
}

@Injectable()
export class VenueRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: VenueFilter): Promise<Venue[]> {
    const rows = await this.prisma.venue.findMany({
      where: {
        ...(filter.ids ? { id: { in: [...filter.ids] } } : {}),
        ...(filter.includeHidden ? {} : { status: 'active' }),
      },
    });
    return rows.map(toContract).sort((a, b) => a.name.he.localeCompare(b.name.he, 'he'));
  }

  async findById(id: string): Promise<Venue | null> {
    const row = await this.prisma.venue.findUnique({ where: { id } });
    return row ? toContract(row) : null;
  }

  async create(input: CreateVenue, createdById: string): Promise<Venue> {
    const row = await this.prisma.venue.create({
      data: {
        name: input.name,
        address: input.address,
        lat: input.location.lat,
        lng: input.location.lng,
        phone: input.phone,
        reservationUrl: input.reservationUrl,
        createdById,
        sections: input.sections.map((name) => ({ id: randomUUID(), name })),
      },
    });
    return toContract(row);
  }

  async update(id: string, input: UpdateVenue): Promise<Venue | null> {
    const { location, ...rest } = input;
    const { count } = await this.prisma.venue.updateMany({
      where: { id },
      data: withoutUndefined({
        ...rest,
        ...(location ? { lat: location.lat, lng: location.lng } : {}),
      }),
    });
    return count === 0 ? null : this.findById(id);
  }
}

function toContract(row: VenueRow): Venue {
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
