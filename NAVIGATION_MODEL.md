# NAVIGATION_MODEL

## 1. Navigation layers

Navigation is two-level and role-aware.

Level 1:

- Primary rail = global domains only.

Level 2:

- Secondary sidebar = pages and saved views for active domain only.

Hard rule:

- Do not mix global nav, local pages, saved views, and workflow states in one flat list.

## 2. Primary rail domains

Canonical primary domains:

1. `home`
2. `sales`
3. `ops`
4. `catalogs`
5. `control`
6. `admin` (admin-only)

Behavior:

- Selecting primary domain sets domain context and default secondary entry.
- If sidebar is collapsed, opening a primary domain expands contextual sidebar.

## 3. Secondary sidebar by domain

### 3.1 Home

- Overview
- My tasks
- Urgent today
- Recent activity
- Quick links

### 3.2 Sales

Groups:

- Leads: all, my
- Applications: all, my, no reservation, ready
- Clients: all, new, repeat

Saved views (sales-local):

- urgent leads
- no first contact
- waiting for application transfer
- needs reservation
- stale
- duplicates

### 3.3 Ops

Pages:

- Reservations
- Departures
- Completion

Saved views (ops-local):

- reservation conflict
- needs confirmation
- no unit
- no subcontractor
- ready for departure
- released
- departures today
- overdue departures
- no completion

### 3.4 Catalogs

- Equipment types
- Equipment units
- Subcontractors
- Additional archive/category pages

### 3.5 Control

- Reports
- Audit log
- Analytics-focused saved views

### 3.6 Admin

- Imports
- Settings
- Users
- Permissions

## 4. Saved views model

Rules:

1. Saved views are domain-local.
2. Saved views map to deterministic filter presets.
3. Saved views are not workflow states; they are filtered entry points.
4. Saved views must not leak into unrelated domains.

## 5. Active state hierarchy

Priority of active context:

1. Role
2. Active primary domain
3. Active secondary id
4. Current view mode (board/list/table/etc)
5. Toolbar filters and search query

Interpretation:

- Secondary id defines module semantics.
- View mode defines representation.
- Filters refine dataset.

## 6. Contextual search placeholders

Search placeholder must come from active module metadata.

Examples:

- Leads: lead-oriented search placeholder.
- Applications: application-oriented placeholder.
- Reservations: reservation-oriented placeholder.

No generic placeholder reuse across unrelated modules.

## 7. Contextual CTA model

CTA is module-dependent and scenario-backed.

Examples:

- Leads -> "New lead"
- Clients -> "New client"
- Applications -> show create CTA only if direct-creation flow is allowed
- Reservations -> no top-level fake create CTA when reservation is application-item-driven

## 8. Visibility matrix

### 8.1 Admin

- Sees all primary domains, including `admin`.
- Sees all secondary entries.
- Can access import/settings/user/permission pages.

### 8.2 Manager

- Sees all non-admin domains.
- Must not see admin-only sections in navigation UI.
- Works on own/all scopes according to module filters and backend policy.

Security note:

- Hidden menu items are not authorization. Backend enforces access.

## 9. Anti-mixing rules

Never place these in one undifferentiated list:

1. Global domains
2. Local module pages
3. Saved filter views
4. Domain workflow statuses

Reason:

- Mixing destroys mental model and causes route/title/CTA/data mismatch errors.
