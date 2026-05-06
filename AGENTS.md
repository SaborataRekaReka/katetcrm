# AGENTS

## 1. Purpose

This file defines practical execution rules for AI agents and contributors who modify this repository.

Goal:

- Ship safe changes fast.
- Preserve CRM semantics.
- Avoid recurring mistakes in navigation, domain modeling, and detail UX.

## 2. Documentation authority for AI work

Use [docs/README.md](docs/README.md) as the documentation map, but treat this file as the highest-priority execution contract for agents.

Stable source-of-truth documents:

1. `AGENTS.md` - agent execution rules, invariants, validation, final report format.
2. `PRODUCT.md` - MVP product scope and hard business rules.
3. `DOMAIN_MODEL.md` - entity boundaries, statuses, lifecycle invariants.
4. `ARCHITECTURE.md` - current repo architecture and target direction.
5. `ROUTES_AND_VIEWS.md` - route/state/view/detail-open contracts.
6. `NAVIGATION_MODEL.md` - primary/secondary navigation and role visibility.
7. `FRONTEND_GUIDELINES.md` - shell, layout, view, detail, and API UI rules.
8. `API_CONTRACTS_OVERVIEW.md`, `RBAC_AND_PERMISSIONS.md`, `TESTING_STRATEGY.md` - required when API, permissions, or validation are touched.

Operational documents:

- `IMPLEMENTATION_ROADMAP.md`, `FRONTEND_API_WIRING.md`, `docs/TEST_EXECUTION_REPORT.md`, and coverage matrices are current snapshots. Use them for status, not as stronger authority than the stable docs above.
- `docs/archive/**` is historical only unless the user explicitly asks for it.

Conflict rule:

1. For product/domain behavior, prefer `PRODUCT.md`, `DOMAIN_MODEL.md`, and confirmed requirements in `QA_REQUIREMENTS.md`.
2. For current implementation facts, verify code/config (`app/backend`, `app/frontend`) before repeating a doc claim.
3. If docs and code disagree, preserve the hard invariant and report the mismatch instead of silently normalizing it.

## 3. How to read this project before coding

Read in this order:

1. `docs/README.md`
2. `PRODUCT.md`
3. `DOMAIN_MODEL.md`
4. `ARCHITECTURE.md`
5. `ROUTES_AND_VIEWS.md`
6. `NAVIGATION_MODEL.md`
7. `FRONTEND_GUIDELINES.md`

Then inspect current implementation entry points:

- `app/frontend/src/app/App.tsx`
- `app/frontend/src/app/components/shell/layoutStore.tsx`
- `app/frontend/src/app/components/shell/routeSync.ts`
- `app/frontend/src/app/components/shell/navConfig.ts`
- `app/frontend/src/app/components/shell/AppShell.tsx`
- Relevant domain workspace page and related toolbar/view components.
- For backend/API work: `app/backend/src/app.module.ts`, `app/backend/prisma/schema.prisma`, relevant controller/service/DTO/projection files.

## 4. Non-negotiable invariants (do not break)

1. Keep funnel semantics intact: lead -> application -> reservation -> departure -> completed/unqualified.
2. Keep domain entities separated (Lead, Application, ApplicationItem, Reservation, Client, Departure).
3. Keep route/title/search placeholder/CTA/data in sync.
4. Do not add out-of-scope modules.
5. Preserve navigation hierarchy:
   - primary rail = global domains
   - secondary sidebar = contextual domain pages/views
6. Board/list/table are domain views, not ClickUp feature clones.
7. Detail layer must stay CRM-specific; do not replace with generic task modal.
8. Reservation conflict remains warning, not hard block.
9. Server-side RBAC is mandatory; UI role visibility is not authorization.
10. Critical lifecycle mutations must stay auditable.

## 5. Thinking order for every change

Always reason in this sequence:

1. `route`
2. `domain`
3. `UI`
4. `state`

Meaning:

- First locate where user enters/exits the scenario.
- Then verify domain rules/invariants.
- Then shape UX and interactions.
- Finally wire state and data flow.

## 6. Before editing checklist

1. Compare current behavior vs requested behavior.
2. Localize exact affected domain/context.
3. Name impacted files before edits.
4. Confirm if change is in scope of MVP.
5. Confirm no contradiction with PRODUCT/DOMAIN/ROUTES/NAVIGATION docs.

Minimum pre-edit note (internal):

- Requested change.
- Current behavior.
- Domain impact.
- File list to touch.

## 7. Editing rules

1. Prefer minimal, local edits.
2. Keep shell contracts (`min-w-0`, local overflow, no page-level horizontal scroll).
3. Keep role-based visibility rules in nav/UI.
4. Do not create fake CTA that has no implemented scenario.
5. Do not move business logic to visual-only helper if it hides domain meaning.
6. Keep saved view behavior contextual to domain.
7. Update markdown source-of-truth files when behavior, route contracts, API contracts, RBAC, or validation gates change.

## 8. Common anti-mistakes

Never do these:

- Mix global nav + local pages + saved views + workflow states in one flat sidebar.
- Use clients title with leads CTA, or any route/content mismatch.
- Split ApplicationItems into separate deals in UI semantics.
- Introduce page-level horizontal scroll.
- Turn CRM detail workspace into generic task card/modal.
- Add portal/telematics/finance modules in MVP branch without explicit request.

## 9. Validation before finalizing

Run at minimum:

1. Type and build checks used by repository workflow.
2. View switching sanity for impacted domains.
3. Role visibility sanity for touched nav elements.
4. Open behavior sanity from board/list/table rows/cards.

Current compile gate:

```bash
npm --prefix app/backend run typecheck
npm --prefix app/backend run build
npm --prefix app/frontend run build
```

Current rebuilt test gates, when the touched area needs tests:

```bash
npm --prefix app/backend run test:api-contract
npm --prefix app/backend run test:integration
npm --prefix app/backend run test:coverage
npm --prefix app/frontend run test:coverage
npm --prefix app/frontend run e2e:gate
npm --prefix app/frontend run e2e:gate:full
```

Rules:

- New tests must reference `QA_REQUIREMENTS.md` ids.
- `docs/TEST_EXECUTION_REPORT.md` is the current run log, but rerun the relevant command for fresh evidence when behavior changes.
- Build/typecheck prove compile safety only. They do not prove CRM behavior.

## 10. Required final change report

Agent final report must include:

1. `What changed`
2. `Why`
3. `Files touched`
4. `Domain rules preserved`
5. `Risks / follow-ups`
6. `Validation performed`

Use concrete statements. Avoid generic wording.
