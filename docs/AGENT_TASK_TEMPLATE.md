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

```bash
npm --prefix app/backend run typecheck
npm --prefix app/backend run build
npm --prefix app/frontend run build
npm --prefix app/frontend run check:ui-consistency
```

## Final report format

- What changed
- Why
- Files touched
- Domain rules preserved
- Risks / follow-ups
- Validation performed
