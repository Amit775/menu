import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@menu/api/shared/db';
import { type MenuSection, MenuSectionSchema, type Text } from '@menu/shared/contracts';

const StoredSectionsSchema = MenuSectionSchema.pick({ id: true, name: true }).array();

type StoredSection = (typeof StoredSectionsSchema)['_output'][number];

@Injectable()
export class MenuSectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByVenue(venueId: string): Promise<MenuSection[]> {
    return toContract(venueId, await this.read(venueId));
  }

  async belongsTo(sectionId: string, venueId: string): Promise<boolean> {
    return (await this.read(venueId)).some((section) => section.id === sectionId);
  }

  async create(venueId: string, name: Text): Promise<MenuSection | null> {
    const id = randomUUID();
    const sections = await this.edit(venueId, (current) => [...current, { id, name }]);
    return sections?.find((section) => section.id === id) ?? null;
  }

  async rename(venueId: string, id: string, name: Text): Promise<MenuSection | null> {
    const sections = await this.edit(venueId, (current) =>
      current.some((section) => section.id === id)
        ? current.map((section) => (section.id === id ? { id, name } : section))
        : null,
    );
    return sections?.find((section) => section.id === id) ?? null;
  }

  async reorder(venueId: string, sectionIds: readonly string[]): Promise<MenuSection[]> {
    const rank = (id: string) => {
      const index = sectionIds.indexOf(id);
      return index === -1 ? sectionIds.length : index;
    };
    const sections = await this.edit(venueId, (current) =>
      [...current].sort((a, b) => rank(a.id) - rank(b.id)),
    );
    return sections ?? [];
  }

  private async read(venueId: string): Promise<StoredSection[]> {
    const row = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: { sections: true },
    });
    return row ? StoredSectionsSchema.parse(row.sections) : [];
  }

  // Sections live in one jsonb column, so every change locks the venue row to keep concurrent edits.
  private edit(
    venueId: string,
    change: (current: StoredSection[]) => StoredSection[] | null,
  ): Promise<MenuSection[] | null> {
    return this.prisma.$transaction(async (tx) => {
      const [locked] = await tx.$queryRaw<{ sections: unknown }[]>`
        SELECT "sections" FROM "venue" WHERE "id" = ${venueId}::uuid FOR UPDATE`;
      if (!locked) {
        return null;
      }
      const next = change(StoredSectionsSchema.parse(locked.sections));
      if (!next) {
        return null;
      }
      await tx.venue.update({ where: { id: venueId }, data: { sections: next } });
      return toContract(venueId, next);
    });
  }
}

function toContract(venueId: string, sections: StoredSection[]): MenuSection[] {
  return sections.map((section, position) => ({ ...section, venueId, position }));
}
