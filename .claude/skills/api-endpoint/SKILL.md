---
name: api-endpoint
description: Add or change a REST endpoint in the NestJS API together with its Zod contract and the Angular client and store that call it. Use for any request/response change between web and api.
---

# Add or change an endpoint

The contract is the source of truth. Change it first and let the compiler show every place that must follow.

1. **Contract.** In `libs/shared/contracts/src/lib/<domain>/<resource>.contract.ts` add or change the Zod schema, the inferred type and, for new routes, the path constant. Add a spec case for the new shape. If the resource is new, generate it: `pnpm nx g @menu/workspace-plugin:contract --domain=<d> --name=<r>`.
2. **API.** For a new resource run `pnpm nx g @menu/workspace-plugin:nest-resource --domain=<d> --name=<r>`. For a new route on an existing one, add a controller method that:
   - takes its path from the contract,
   - validates input with `new ZodValidationPipe(<Schema>)`,
   - returns the contract type, delegating to the service, then the repository.
     Write the controller and service specs first.
3. **Persistence.** Change the Prisma model if needed and run `pnpm nx run api-shared-db:prisma-migrate`. Map rows to the contract in the repository only.
4. **Web.** Add the method to `<Resource>ApiClient` in `libs/web/<domain>/data-access` (validate the response with the schema), then expose it from the Signal Store. Spec both: the client with `HttpTestingController` (including a contract-violating payload), the store with a stubbed client.
5. **Verify.** `pnpm nx affected -t lint typecheck test build`. A type error in web or api after a contract change is the point: fix every one, never cast it away.
