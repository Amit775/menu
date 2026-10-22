# Testing

- Runner: Vitest everywhere (`pnpm nx test <project>`). E2E: Playwright (`pnpm nx e2e web-e2e`).
- Write the failing test first, confirm it fails for the right reason, then implement.
- Specs sit next to the code: `thing.ts` -> `thing.spec.ts`. Describe the behavior (`it('rejects a negative uptime')`), not the method.
- What must be tested:
  - Every contract: one valid parse and one rejected case.
  - Every service and store: success and failure paths.
  - Every API client: response validation against the contract (a bad payload must reject).
  - Every component with logic: rendered output via `TestBed`, not private methods.
  - Every generator: output files, tags and wiring (`tools/workspace-plugin`).
- Mock at boundaries only (HTTP via `HttpTestingController`, repositories via providers, Prisma via a stub object). Do not mock the unit under test.
- No snapshot tests for components. No `it.skip` / `it.only` in commits. Never delete or weaken a failing test to get green; fix the code or ask.
