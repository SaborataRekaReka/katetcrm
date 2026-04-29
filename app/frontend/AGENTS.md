# Frontend Agent Rules

Root [AGENTS.md](../../AGENTS.md) remains the primary source of rules. This file only narrows those rules for `app/frontend/**` work.

## Read Order

Before frontend edits, read:

1. [../../AGENTS.md](../../AGENTS.md)
2. [../../PRODUCT.md](../../PRODUCT.md)
3. [../../DOMAIN_MODEL.md](../../DOMAIN_MODEL.md)
4. [../../ARCHITECTURE.md](../../ARCHITECTURE.md)
5. [../../ROUTES_AND_VIEWS.md](../../ROUTES_AND_VIEWS.md)
6. [../../NAVIGATION_MODEL.md](../../NAVIGATION_MODEL.md)
7. [../../FRONTEND_GUIDELINES.md](../../FRONTEND_GUIDELINES.md)
8. [../../TESTING_STRATEGY.md](../../TESTING_STRATEGY.md)
9. [README.md](./README.md)
10. Relevant shell, route, workspace, toolbar, dialog, table, and detail components.

## Frontend Context

- Stack: Vite + React + TypeScript.
- UI: Tailwind + shadcn/ui patterns with existing dense CRM surfaces.
- Shell: state-driven layout store with partial URL sync.
- Details: CRM-specific full-screen dialog workspaces, not generic task modals.

## Rules

- Keep route/title/search placeholder/CTA/data sync for every touched route.
- Preserve primary rail as global domain navigation.
- Preserve secondary sidebar as contextual domain pages/views.
- Do not create fake CTAs without implemented scenarios.
- Do not introduce page-level horizontal scroll; keep overflow local to tables, boards, and scroll regions.
- Preserve `min-w-0` and local overflow contracts in shell layouts.
- Do not replace CRM detail workspace semantics with a generic task modal.
- Use existing shell, routeSync, navConfig, toolbar, dialog, table, hook, and adapter patterns.
- Keep role-based visibility rules aligned with backend RBAC; UI hiding is not security.
- Keep saved views contextual to their domain.

## Validation

Minimum frontend validation:

```bash
npm --prefix app/frontend run build
npm --prefix app/frontend run check:ui-consistency
```

Add browser checks when route/admin/control scenarios change:

```bash
npm --prefix app/frontend run e2e
```
