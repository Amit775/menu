# 0018. Cache CI in GitHub Actions instead of Nx Cloud

- Status: accepted
- Date: 2026-10-28

## Context

CI used the Nx Cloud remote cache (ADR 0001). On 2026-10-28 the Nx Cloud organization was disabled for exceeding the free plan, so every run answered 401, got no cache hits and rebuilt all 134 tasks (about 7 minutes). Re-enabling it needs the paid Team plan.

## Decision

- Remove `nxCloudId` from `nx.json`; Nx uses only its local cache in `.nx/cache`.
- Each CI job restores `.nx/cache` with `actions/cache`, keyed by commit with a prefix fallback, so a PR starts from the newest cache of its branch or of `main`.

## Consequences

- Free, and unchanged tasks are cache hits again on a single runner.
- The cache lives only in GitHub Actions (10 GB per repository, least recently used evicted) and is not shared with developer machines.
- No Nx Cloud run summaries on PRs and no Nx Agents. Reconnecting is `pnpm nx connect` plus removing the cache steps, if the Team plan is ever worth it.
