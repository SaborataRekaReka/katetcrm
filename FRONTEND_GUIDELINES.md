# FRONTEND_GUIDELINES

## 1. Stack policy

### 1.1 Target production stack (architecture intent)

- Next.js + TypeScript
- MUI as primary design system for dense operational surfaces
- React Query for server state
- Zustand for client/UI state

### 1.2 Current repository baseline (must not be broken)

- Vite + React + TypeScript
- Tailwind + shadcn/ui components as the current shell/UI baseline
- MUI dependencies are installed and may be used where existing surfaces already use them
- React Query is available and used for API-mode server state
- Layout context store (`layoutStore`) + `routeSync`
- Domain workspace pages under `app/frontend/src/app/components/**`
- API feature flag: `VITE_USE_API=true` with `VITE_API_BASE_URL=http://localhost:3001/api/v1`

Rule:

- Until migration is explicit, preserve current runtime contracts while writing code in a migration-friendly way.

## 2. Preferred frontend structure

Target structure for new scalable work:

- `shared/` (design tokens, low-level UI, utilities)
- `entities/` (entity-level presentation and adapters)
- `features/` (user-intent operations)
- `widgets/` (composed domain blocks)
- `pages/` (route-level composition)

Current repository adaptation:

- Keep existing folder layout stable.
- Introduce feature-oriented extraction gradually, no massive move-only refactors.

## 3. Route-aware state rules

1. Route id, title, search placeholder, CTA, tabs, filters, and loaded data must agree.
2. View mode is module-context aware.
3. Saved views are domain-local aliases with deterministic prefilters.
4. Browser back/forward must preserve navigable state where route sync exists.

## 4. Shell rules

1. Primary rail is global navigation only.
2. Secondary sidebar is context for active primary domain.
3. Main content must use `min-w-0` and `min-h-0` in nested flex chain.
4. Keep shell layers visually coherent (rail + sidebar + main workspace).

## 5. Board/List/Table rules

### 5.1 Board

- Domain stage visualization, not generic project management board.
- Horizontal scroll allowed only inside board viewport.
- Card click opens domain detail workspace.

### 5.2 List

- Grouped operational list, dense and scannable.
- Must carry stage/state signals and next-step context.

### 5.3 Table

- Dense control surface for quick scanning and bulk-like operations.
- Keep columns meaningful to domain decisions.

## 6. Scroll and overflow contract

Mandatory:

1. No page-level horizontal scroll.
2. Local horizontal scroll only in board/table containers.
3. Use thin low-contrast scrollbars.
4. Keep `min-w-0` on flex children to avoid layout overflow bugs.
5. Keep detail modal scroll areas independently controllable.

## 7. Role-aware navigation and UI

1. Admin-only sections are hidden for manager in UI.
2. UI role filtering is convenience, not security.
3. Backend must validate every critical operation regardless of hidden UI.

## 8. Detail view consistency

1. CRM-specific entity detail, never generic task modal.
2. Stable action hierarchy:
   - primary CTA
   - secondary action
   - text link
   - status chip (non-action)
3. Keep next-step hint aligned with primary CTA semantics.
4. Keep client linking behavior consistent across detail types.
5. Shell coverage policy:
   - Entity detail workspaces must render via `DetailShell`.
   - API-specific detail implementations (`*WorkspaceApi.tsx`) must also render via `DetailShell`.
   - Full-screen create/edit forms must render via `ShellDialog` from `ShellFormPrimitives`.
   - Small confirm/alert dialogs are allowed to use lightweight local `Dialog` wrappers.

## 9. State handling standards

1. Explicitly model loading, empty, filtered-empty, error, permission states.
2. Keep domain derivations deterministic and testable.
3. Do not bury domain logic in purely visual helpers.

## 10. API interaction standards (when backend connected)

1. Use React Query keys by domain entity and route context.
2. Use optimistic updates only where rollback is safe and deterministic.
3. Never optimistic-update cross-entity critical transitions without reconciliation.
4. Handle 401/403/422/500 with explicit UI and retry policies.

## 11. Contribution checklist

Before merge:

1. Check route/title/search/CTA/data consistency.
2. Check board/list/table parity for affected domain.
3. Check role visibility.
4. Check overflow/scroll behavior on desktop and narrow widths.
5. Build and verify no regression in touched workspaces.
6. For changed adapter/projection-sensitive frontend behavior, update or run `npm --prefix app/frontend run test:coverage`.
7. For changed browser workflows, update or run `npm --prefix app/frontend run e2e:gate` or `npm --prefix app/frontend run e2e:gate:full`.

Testing rule:

- New frontend tests must reference confirmed `QA_REQUIREMENTS.md` ids.
- Existing rebuilt browser specs live in `app/frontend/e2e`.
- Existing adapter unit specs live in `app/frontend/src/app/lib/__tests__`.
