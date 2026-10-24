import { Injectable } from '@nestjs/common';
import { fromLocalized, PrismaService, toLocalized } from '@menu/api/shared/db';
import { type LocalizedText, type MenuSection } from '@menu/shared/contracts';

interface MenuSectionRow {
  id: string;
  venueId: string;
  nameHe: string;
  nameEn: string | null;
  position: number;
}

@Injectable()
export class MenuSectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByVenue(venueId: string): Promise<MenuSection[]> {
    const rows = await this.prisma.menuSection.findMany({
      where: { venueId },
      orderBy: { position: 'asc' },
    });
    return rows.map(toContract);
  }

  async belongsTo(sectionId: string, venueId: string): Promise<boolean> {
    return (await this.prisma.menuSection.count({ where: { id: sectionId, venueId } })) > 0;
  }

  async create(venueId: string, name: LocalizedText): Promise<MenuSection> {
    const row = await this.prisma.$transaction(async (tx) => {
      const last = await tx.menuSection.aggregate({ where: { venueId }, _max: { position: true } });
      return tx.menuSection.create({
        data: { venueId, ...fromLocalized(name), position: (last._max.position ?? -1) + 1 },
      });
    });
    return toContract(row);
  }

  async rename(venueId: string, id: string, name: LocalizedText): Promise<MenuSection | null> {
    const { count } = await this.prisma.menuSection.updateMany({
      where: { id, venueId },
      data: fromLocalized(name),
    });
    if (count === 0) {
      return null;
    }
    return toContract(await this.prisma.menuSection.findUniqueOrThrow({ where: { id } }));
  }

  async reorder(venueId: string, sectionIds: readonly string[]): Promise<MenuSection[]> {
    await this.prisma.$transaction(
      sectionIds.map((id, position) =>
        this.prisma.menuSection.updateMany({ where: { id, venueId }, data: { position } }),
      ),
    );
    return this.listByVenue(venueId);
  }
}

function toContract(row: MenuSectionRow): MenuSection {
  return { id: row.id, venueId: row.venueId, name: toLocalized(row), position: row.position };
}
