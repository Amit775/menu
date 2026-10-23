import { Injectable } from '@nestjs/common';
import {
  fromLocalized,
  isPrismaError,
  PrismaErrorCode,
  PrismaService,
  toLocalized,
} from '@menu/api/shared/db';
import { withoutUndefined } from '@menu/api/shared/util';
import { type CreateTag, type Tag, type TagKind, type UpdateTag } from '@menu/shared/contracts';

interface TagRow {
  id: string;
  slug: string;
  nameHe: string;
  nameEn: string | null;
  kind: TagKind;
}

/** Maps between Prisma rows and the shared contract. The only code that touches `prisma.tag`. */
@Injectable()
export class TagRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<Tag[]> {
    const rows = await this.prisma.tag.findMany({ orderBy: [{ kind: 'asc' }, { nameHe: 'asc' }] });
    return rows.map(toContract);
  }

  /** Null when the slug is taken. */
  async create(input: CreateTag): Promise<Tag | null> {
    try {
      const row = await this.prisma.tag.create({
        data: { slug: input.slug, kind: input.kind, ...fromLocalized(input.name) },
      });
      return toContract(row);
    } catch (error) {
      if (isPrismaError(error, PrismaErrorCode.UniqueViolation)) {
        return null;
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateTag): Promise<Tag | null> {
    const { count } = await this.prisma.tag.updateMany({
      where: { id },
      data: withoutUndefined({
        kind: input.kind,
        ...(input.name ? fromLocalized(input.name) : {}),
      }),
    });
    if (count === 0) {
      return null;
    }
    return toContract(await this.prisma.tag.findUniqueOrThrow({ where: { id } }));
  }
}

function toContract(row: TagRow): Tag {
  return { id: row.id, slug: row.slug, name: toLocalized(row), kind: row.kind };
}
