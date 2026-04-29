# Agent Ownership Map

Root [AGENTS.md](./AGENTS.md) is the primary source of rules. This map defines default file ownership for parallel agent work.

## Planner Agent

The Planner Agent does not edit files. It produces task packets, ownership boundaries, non-goals, validation plans, and risk notes.

## Backend Agent

The Backend Agent may change:

- `app/backend/**`
- Backend-related smoke scripts under `app/backend/scripts/**`
- Backend docs when behavior, API contracts, RBAC, integration, import, validation, or runbook content changes

The Backend Agent must not change frontend files unless the task explicitly expands scope.

## Frontend Agent

The Frontend Agent may change:

- `app/frontend/**`
- Frontend docs when UI behavior, route contracts, validation, or runbook content changes

The Frontend Agent must not change backend files unless the task explicitly expands scope.

## Docs Agent

The Docs Agent may change:

- `*.md`
- `docs/**`
- `.github/copilot-instructions.md`
- `.github/agents/*.agent.md`

The Docs Agent must not use `docs/archive/**` as active requirements and must not change application source code.

## QA Reviewer

The QA Reviewer normally does not edit files. It may run/read validation outputs and produce review findings.

## High-Risk Files

Edit these files with only one agent active at a time:

```text
AGENTS.md
ARCHITECTURE.md
DOMAIN_MODEL.md
ROUTES_AND_VIEWS.md
NAVIGATION_MODEL.md
app/backend/prisma/schema.prisma
app/frontend/src/app/components/shell/navConfig.ts
app/frontend/src/app/components/shell/routeSync.ts
app/frontend/src/app/App.tsx
```

## Coordination Rules

- Parallel work is allowed only when ownership does not overlap.
- Cross-domain changes should start with a Planner task packet.
- Schema/API contract changes should merge before frontend wiring.
- Docs should update after behavior and contracts settle.
- QA review should run after implementation and docs are ready.
