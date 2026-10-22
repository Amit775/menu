# @menu/shared/contracts

Zod schemas and inferred types shared by `apps/web` and `apps/api`. This is the single source of truth for every request and response shape.

- One folder per domain in `src/lib/<domain>/`, one `<name>.contract.ts` per resource.
- Export a `*Schema` (runtime validation) and its `z.infer` type. Never hand-write a duplicate interface.
- Framework-free: no Angular, Nest, or Prisma imports (enforced by lint).
- Create new contracts with `pnpm nx g @menu/workspace-plugin:contract`.
