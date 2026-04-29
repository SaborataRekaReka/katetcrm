# Backend Agent Rules

Root [AGENTS.md](../../AGENTS.md) remains the primary source of rules. This file only narrows those rules for `app/backend/**` work.

## Read Order

Before backend edits, read:

1. [../../AGENTS.md](../../AGENTS.md)
2. [../../PRODUCT.md](../../PRODUCT.md)
3. [../../DOMAIN_MODEL.md](../../DOMAIN_MODEL.md)
4. [../../ARCHITECTURE.md](../../ARCHITECTURE.md)
5. [../../API_CONTRACTS_OVERVIEW.md](../../API_CONTRACTS_OVERVIEW.md)
6. [../../RBAC_AND_PERMISSIONS.md](../../RBAC_AND_PERMISSIONS.md)
7. [../../TESTING_STRATEGY.md](../../TESTING_STRATEGY.md)
8. [README.md](./README.md)
9. Relevant module, DTO, service, controller, Prisma, and smoke files.

## Backend Context

- Stack: NestJS 10 + TypeScript, Prisma 5, PostgreSQL 16.
- Architecture: modular monolith with explicit bounded contexts.
- API base: `/api/v1`.
- Core modules include auth, leads, clients, applications, reservations, departures, completions, tasks, directories, imports, integrations, activity, stats, users, and settings.

## Rules

- Keep lifecycle semantics intact: `Lead -> Application -> Reservation -> Departure -> Completed/Unqualified`.
- Do not bypass domain services with direct table mutations in unrelated modules.
- Do not bypass JWT guards, RolesGuard, or server-side RBAC checks.
- Preserve audit logging for critical mutations and lifecycle transitions.
- Preserve integration idempotency by channel/external id and replay/retry guards.
- Keep reservation conflict behavior as warning, not hard block.
- Keep domain entities separated; do not split `ApplicationItem` into fake deal semantics.
- Keep `/api/v1` versioned route contracts stable unless the task explicitly changes API contracts.

## Prisma And Migrations

- Do not edit `prisma/schema.prisma` without explaining migration impact.
- Any schema change must include a migration plan and validation path.
- Preserve DB invariants for one active Application per Lead and one active Reservation per ApplicationItem.
- Regenerate Prisma client when schema changes require it.
- On Windows, if Prisma DLL locks block generation, stop Node/Nest processes before retrying.

## Validation

Minimum backend validation:

```bash
npm --prefix app/backend run typecheck
npm --prefix app/backend run build
```

Add relevant smoke checks when touched behavior requires it:

```bash
npm --prefix app/backend run smoke:base
npm --prefix app/backend run smoke:stage3
npm --prefix app/backend run smoke:stage5
npm --prefix app/backend run smoke:stage6
npm --prefix app/backend run smoke:stage7
npm --prefix app/backend run smoke:tasks
npm --prefix app/backend run smoke:rbac
npm --prefix app/backend run smoke:rbac:scope
npm --prefix app/backend run smoke:admin
npm --prefix app/backend run smoke:admin:control
npm --prefix app/backend run smoke:release
```
