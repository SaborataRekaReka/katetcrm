# Agent Workflow

Root [AGENTS.md](../AGENTS.md) is the primary source for agent rules. This document explains how several agents can work safely in the same monorepo.

## Roles

- Planner
- Backend Agent
- Frontend Agent
- QA Reviewer
- Docs Agent

## Parallel work rule

Agents may work in parallel only if their file ownership does not overlap.

If two tasks may touch the same file, route contract, Prisma schema, API DTO, shell navigation config, or canonical documentation file, serialize the work and name the merge order before editing.

## Safe parallel examples

- Backend Agent updates `app/backend/src/modules/imports/**` while Frontend Agent updates unrelated `app/frontend/src/app/components/client/**` files, with no shared API contract changes.
- Docs Agent updates `docs/AGENT_TASK_TEMPLATE.md` while Backend Agent works only in `app/backend/src/modules/tasks/**` and does not change behavior requiring docs updates yet.
- QA Reviewer reviews a completed diff while no implementation agent edits the same files.

## Unsafe parallel examples

- Backend Agent changes a DTO/API response while Frontend Agent wires that response at the same time without a frozen contract.
- Frontend Agent edits `app/frontend/src/app/components/shell/navConfig.ts` while another agent edits `ROUTES_AND_VIEWS.md` or `NAVIGATION_MODEL.md` for the same navigation change.
- Backend Agent edits `app/backend/prisma/schema.prisma` while another backend task edits services depending on the same models.
- Docs Agent updates canonical domain docs while Planner is still changing the requested scope.

## Required task packet

Every task must include:

- Goal
- Non-goals
- Owner agent
- Allowed files
- Forbidden files
- Required docs to read
- Validation commands
- Expected final report

## Merge order

1. Backend contract/schema changes
2. Frontend wiring
3. Rebuilt tests and validation gates (`QA_REQUIREMENTS.md`-traceable)
4. Docs
5. QA review
