# ROUTES_AND_VIEWS

## 1. Route model baseline

This repository currently uses state-driven navigation with partial URL sync.

Primary routing anchor:

- `activeSecondaryNav` in layout store chooses workspace page.
- `currentView` controls board/list/table (or module-specific tabs).
- `routeSync` mirrors selected secondary ids into pathname + `?view=`.

Rule:

- Any new page must define both state id and route strategy.

## 2. Route map (MVP)

### 2.1 Sales domain

- `/leads` -> `leads`
- `/leads/my` -> `my-leads`
- `/applications` -> `applications`
- `/applications/my` -> `my-applications`
- `/applications/no-reservation` -> `apps-no-reservation`
- `/applications/ready` -> `apps-ready`
- `/clients` -> `clients`

Saved views (state aliases, route optional in current repo):

- `view-urgent`
- `view-no-contact`
- `view-to-application`
- `view-needs-reservation`
- `view-stale`
- `view-duplicates`

### 2.2 Operations domain

State ids:

- `reservations`
- `departures`
- `completion`

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

### 2.3 Catalogs / Control / Admin

State ids are canonical module ids from nav config:

- Catalogs: `equipment-types`, `equipment-units`, `subcontractors`, plus archive/category helpers.
- Control: `reports`, `audit`, and analytics saved views.
- Admin: `imports`, `settings`, `users`, `permissions` (admin-only).

## 3. Which entities open from which route/view

1. Leads board/list/table row/card click -> lead detail modal or stage-specific workspace.
2. Applications list/table row click -> application detail modal (or reservation/departure/completion workspace by stage).
3. Reservations list/table row click -> reservation workspace modal.
4. Client open actions from details -> client workspace modal.

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

### 4.5 Control modules

- Reports: `reports`, `dashboard`
- Audit: `table`, `feed`

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
- Module placeholders for not-yet-implemented domains.
- Catalogs/control/admin entries with role-aware visibility.

## 7. Tabs and toolbar rules by domain

1. Toolbar filters must match module semantics.
2. Search placeholder must match current module.
3. CTA must match executable scenario in current module.
4. Saved view aliases must pre-apply matching filters.
5. No route/title/CTA mismatch is allowed.

Examples:

- Leads: CTA "New lead" is valid.
- Applications: no fake top-level create CTA if creation is lead-driven.
- Reservations: no fake "New reservation" CTA; creation is item-context action from application.

## 8. Consistency checklist for new views

Before shipping a new view:

1. Route/state id is registered.
2. Module meta (title/search/cta/tabs) is registered.
3. Toolbar filters map to real domain fields.
4. Row click opens correct detail workspace.
5. Role visibility and saved view behavior are consistent.
