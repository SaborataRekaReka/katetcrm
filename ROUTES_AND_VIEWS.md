# ROUTES_AND_VIEWS

## 1. Route model baseline

This repository currently uses state-driven navigation with partial URL sync and no app-level `react-router`.

Primary routing anchor:

- `activeSecondaryNav` in layout store chooses workspace page.
- `currentView` controls board/list/table (or module-specific tabs) for the active section.
- `viewBySecondary` stores each secondary section's preferred valid view; `?view=` still overrides local preference for explicit links.
- `routeSync` mirrors routed secondary ids into pathname + `?view=`.
- Entity open context is mirrored as `?entityType=<type>&entityId=<id>`.
- On initial load, if pathname module does not match `entityType`, URL is normalized to the canonical module pathname for that entity type.

Rule:

- Any new page must define both state id and route strategy.
- Saved-view ids that do not have a pathname are filter aliases, not canonical shareable routes.

## 2. Route map (MVP)

### 2.1 Sales domain

- `/leads` -> `leads`
- `/leads/my` -> `my-leads`
- `/applications` -> `applications`
- `/applications/my` -> `my-applications`
- `/applications/no-reservation` -> `apps-no-reservation`
- `/applications/ready` -> `apps-ready`

Saved views (state aliases, route optional in current repo):

- `view-urgent`
- `view-no-contact`
- `view-to-application`
- `view-needs-reservation`
- `view-stale`
- `view-duplicates`

### 2.2 Clients domain

- `/clients` -> `clients`
- `/clients/new` -> `clients-new`
- `/clients/repeat` -> `clients-repeat`
- `/clients/vip` -> `clients-vip`
- `/clients/debt` -> `clients-debt`

### 2.3 Operations domain

- `/reservations` -> `reservations`
- `/departures` -> `departures`
- `/completion` -> `completion`

Ops saved views:

- `view-conflict`
- `view-need-confirm`
- `view-no-unit`
- `view-no-subcontractor`
- `view-ready-departure`
- `view-released`
- `view-departures-today`
- `view-overdue-departures`
- `view-no-completion`

### 2.4 Catalogs / Control / Admin

Canonical pathnames:

- `/directory/equipment-types` -> `equipment-types`
- `/directory/units` -> `equipment-units`
- `/directory/contractors` -> `subcontractors`
- `/directory/categories` -> `equipment-categories`
- `/dashboard` -> `dashboard` (admin-only)
- `/reports` -> `reports` (admin-only)
- `/audit` -> `audit` (admin-only)
- `/control/bug-reports` -> `bug-reports` (admin-only)
- `/admin/imports` -> `imports` (admin-only)
- `/admin/integrations` -> `integrations` (admin-only)
- `/admin/settings` -> `settings` (admin-only)
- `/admin/users` -> `users` (admin-only)
- `/admin/permissions` -> `permissions` (admin-only)

Control analytics saved-view ids are `view-stale-leads`, `view-lost-leads`, `view-active-reservations`, `view-manager-load`.

## 3. Which entities open from which route/view

1. Leads board/list/table row/card click -> lead detail modal or stage-specific workspace.
2. Leads Kanban lead-column inline add action -> Lead creation dialog, never a generic card/task.
3. Applications list/table row click -> application detail modal (or reservation/departure/completion workspace by stage).
4. Reservations list/table row click -> reservation workspace modal.
5. Departures/completion row click -> stage-specific full-screen workspace.
6. Client row/card/open actions -> client workspace modal.

Open-behavior rule:

- Row/card click always opens entity context, not a generic task modal.

## 4. View modes per domain

### 4.1 Leads

- `board`
- `list`
- `table`

### 4.2 Applications

- `list`
- `table`

### 4.3 Reservations

- `list`
- `table`

### 4.4 Clients

- `list`
- `cards`

### 4.5 Catalogs

- `table`
- `list`
- `cards`

### 4.6 Control modules

- Reports: `reports`, `dashboard`
- Audit: `table`, `feed`
- Bug reports: table-first list surface with row actions (`resolved`, `delete`)

Rule:

- View set must reflect domain needs, not visual parity pressure with other modules.

## 5. Drawer/page/modal routing policy

Use this hierarchy:

1. `Page` for module workspace (primary content area).
2. `Modal routing` for entity deep-dive details opened from board/list/table.
3. `Drawer` only for lightweight, non-primary contextual edits (not default pattern in current MVP).

Current default detail pattern:

- Full-screen `DialogContent` workspace style for lead/application/reservation/departure/client detail contexts.

## 6. Mandatory pages now

Mandatory current MVP pages:

- Leads workspace.
- Applications workspace.
- Reservations workspace.
- Departures workspace.
- Completion workspace.
- Clients workspace.
- Home workspace.
- Catalogs workspace for admin and manager.
- Control and Admin workspaces for admin only.
- Module placeholders only for explicitly unfinished secondary contexts, not as fake working features.

## 7. Tabs and toolbar rules by domain

1. Toolbar filters must match module semantics.
2. Search placeholder must match current module.
3. CTA must match executable scenario in current module.
4. Saved view aliases must pre-apply matching filters.
5. No route/title/CTA mismatch is allowed.

Examples:

- Leads: CTA "New lead" is valid.
- Leads Kanban: inline add button must open Lead creation and label the action as a Lead, not a card/task.
- Applications: no fake top-level create CTA if creation is lead-driven.
- Reservations: no top-level primary CTA in shell metadata. Current API-mode page has a contextual "New reservation" action that selects an `ApplicationItem` without active reservation; it must stay item-context-backed and must not become free-form reservation creation.

## 8. Consistency checklist for new views

Before shipping a new view:

1. Route/state id is registered.
2. Module meta (title/search/cta/tabs) is registered.
3. Toolbar filters map to real domain fields.
4. Row click opens correct detail workspace.
5. Role visibility and saved view behavior are consistent.
