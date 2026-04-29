# Katet CRM Copilot Instructions

Root [AGENTS.md](../AGENTS.md) is the primary source of rules for all AI agents in this repository. This file is a thin workspace entry point for Copilot/VS Code agents; if any instruction appears to conflict with root `AGENTS.md`, follow root `AGENTS.md` and report the conflict.

## Required Reading Order

Before planning or editing, read:

1. [AGENTS.md](../AGENTS.md)
2. [PRODUCT.md](../PRODUCT.md)
3. [DOMAIN_MODEL.md](../DOMAIN_MODEL.md)
4. [ARCHITECTURE.md](../ARCHITECTURE.md)
5. [ROUTES_AND_VIEWS.md](../ROUTES_AND_VIEWS.md)
6. [NAVIGATION_MODEL.md](../NAVIGATION_MODEL.md)
7. [FRONTEND_GUIDELINES.md](../FRONTEND_GUIDELINES.md)
8. Relevant package README and local `AGENTS.md` files.

## Non-Negotiable Rules

- Preserve the CRM lifecycle: `Lead -> Application -> Reservation -> Departure -> Completed/Unqualified`.
- Keep domain entities separated: Lead, Application, ApplicationItem, Reservation, Client, Departure.
- Keep route/title/search placeholder/CTA/data consistency.
- Do not add out-of-scope MVP modules.
- Preserve server-side RBAC; UI visibility is not security.
- Keep reservation conflicts as warnings, not hard blocks.
- Do not bypass domain services, audit logging, or integration idempotency.
- Preserve `/api/v1` backend API boundaries.
- Keep primary rail as global navigation and secondary sidebar as contextual navigation.
- Do not replace CRM detail workspaces with generic task modals.

## Before Editing

State the intended file list before changing files. Confirm the affected route, domain, UI, and state surface in that order.

## Required Validation

Minimum validation for agent changes:

```bash
npm --prefix app/backend run typecheck
npm --prefix app/backend run build
npm --prefix app/frontend run build
npm --prefix app/frontend run check:ui-consistency
```

For cross-domain behavior changes, add:

```bash
npm --prefix app/backend run smoke:release
```

## Final Report

After changes, report:

- What changed
- Why
- Files touched
- Domain rules preserved
- Risks / follow-ups
- Validation performed
