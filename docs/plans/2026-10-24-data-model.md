# Data model redesign

Goal: land the value types and table changes agreed in the data model review (2026-10-24) as one PR stacked on the review-fixes PR (#22), before more features build on the old shapes.

## Decisions (Bublil, 2026-10-24)

- `Text` `{ he: string; en: string | null }` for every user-facing name and description, stored as one `jsonb` column validated by the same Zod schema.
- `Price` `{ value: number; currency: Currency }`, value in shekels as a decimal. Stored as `<column>_value numeric(10,2)` plus `<column>_currency`, so the feed can filter and sort by price. `Currency` is `ILS` for now.
- Item gets `description: Text | null`. The venue's address becomes `Text`; location stays on the venue.
- Items never move venue: `entry.venue_id` goes, an entry reaches its venue through its item.
- `entry.author_id` keeps no foreign key (ADR 0004).
- From the model board: menu sections live in `venue.sections` (jsonb array, stable ids, array order is the order) and the `menu_section` table goes; item tags become `item.tag_ids uuid[]` (first is primary) and `item_tag` goes; `account.is_admin` becomes `account.role`; the photo id and type become `entry.photo` jsonb; missing foreign keys are added (`item.merged_into_id`, `item.submitted_by_id`, `venue.created_by_id`, `ownership.granted_by_id`) and every table gets `updated_at`.

The API contracts keep their routes. They change only where a value type changes (`Text`, `Price`, item description).

## Slices

| #   | Slice                                                                                                        | Status |
| --- | ------------------------------------------------------------------------------------------------------------ | ------ |
| 1   | Contracts: `Text`, `Price`, `Currency`; replace `LocalizedText` and `Agorot`; item description, Text address | done   |
| 2   | Prisma schema and one migration that copies existing data, then drops the old columns and tables             | done   |
| 3   | API repositories and mappers per aggregate (test first)                                                      | done   |
| 4   | Web: forms take shekels with two decimals, `Text` everywhere, item description                               | done   |
| 5   | Seed script and e2e fixtures                                                                                 | done   |

All slices ship in one PR, because the contracts, schema and code only compile together.

## Follow-ups

- Rename contract schemas to the `...Request` / `...Response` convention (separate PR, mechanical).
- `USD` in `Currency` when a non-Israeli venue appears.
