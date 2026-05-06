# Agent Task Template

Use this packet for any delegated agent task. Root [AGENTS.md](../AGENTS.md) remains the primary source of rules.

## Goal

Describe the exact user-visible or repository-visible outcome.

## Owner Agent

Planner / Backend Agent / Frontend Agent / QA Reviewer / Docs Agent.

## Scope

### Allowed files

- `path/or/glob/**`

### Forbidden files

- `path/or/glob/**`

## Required reading

- `AGENTS.md`
- Relevant canonical docs from `docs/README.md`
- Local `AGENTS.md` for the package being changed

## Domain impact

- Lead:
- Application:
- Reservation:
- Departure:
- Completion:
- RBAC:
- Audit:
- Integration:

## Non-goals

- List behavior, modules, files, or refactors that are intentionally out of scope.

## Acceptance criteria

- Describe concrete pass/fail criteria.

## Validation commands

Always include the minimum compile gate unless the task is explicitly docs-only and repository policy allows skipping it:

```bash
npm --prefix app/backend run typecheck
npm --prefix app/backend run build
npm --prefix app/frontend run build
```

Add the smallest relevant rebuilt test gate for the touched surface:

```bash
npm --prefix app/backend run test:api-contract
npm --prefix app/backend run test:integration
npm --prefix app/backend run test:coverage
npm --prefix app/frontend run test:coverage
npm --prefix app/frontend run e2e:gate
npm --prefix app/frontend run e2e:gate:full
```

Testing reset note: removed pre-reset smoke/e2e/ui-consistency commands must not be used. New tests must reference requirement ids from `QA_REQUIREMENTS.md`.

## Final report format

- What changed
- Why
- Files touched
- Domain rules preserved
- Risks / follow-ups
- Validation performed
