# API_CONTRACTS_OVERVIEW

## 1. Purpose and scope

This file is an API contract overlay above OpenAPI/Swagger.
It explains what frontend and agents should expect by domain in current MVP.

## 2. API groups

Primary groups (current):

1. `/auth`
2. `/leads`
3. `/clients`
4. `/applications`
5. `/reservations`
6. `/departures`
7. `/completions`
8. `/equipment-categories`
9. `/equipment-types`
10. `/equipment-units`
11. `/subcontractors`
12. `/imports/*`
13. `/integrations/events/*`
14. `/activity/*`
15. `/stats`
16. `/tasks/*`
17. `/users/*`
18. `/settings/*`
19. `/navigation/*`

## 3. Domain contract notes

### 3.1 Auth

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`

Contract expectations:

1. JWT access token + refresh token flow is server-side enforced.
2. `me` returns role fields used by frontend RBAC visibility.
3. Inactive users cannot receive login or refresh tokens.

### 3.2 Leads

- `GET /api/v1/leads`
- `GET /api/v1/leads/:id`
- `PATCH /api/v1/leads/:id`
- `POST /api/v1/leads`

Contract expectations:

1. Stage values and source channels match domain enums.
2. Dedupe-related flags are returned for UI signaling.
3. Repeat-order flow is canonical via `POST /api/v1/leads` with `source=manual`, `sourceLabel=repeat_order`, and `clientId` from client workspace context.
4. `GET /api/v1/leads` supports list filters used by analytics views (`stage`, `managerId`, `query`, `isUrgent`, `isStale`).

### 3.3 Applications

- `GET /api/v1/applications`
- `GET /api/v1/applications/:id`
- `POST /api/v1/applications`
- `PATCH /api/v1/applications/:id`
- `POST /api/v1/applications/:id/cancel`
- `POST /api/v1/applications/:id/items`
- `GET /api/v1/application-items/:itemId`
- `PATCH /api/v1/application-items/:itemId`
- `DELETE /api/v1/application-items/:itemId`

Contract expectations:

1. One active application per lead is guarded by DB/business rules.
2. Item-level statuses remain consistent with reservation lifecycle.
3. Item readiness follows `QA-REQ-009`: equipment type, quantity, planned date/time, address, and non-undecided source.

### 3.4 Reservations

- `GET /api/v1/reservations`
- `GET /api/v1/reservations/:id`
- `POST /api/v1/reservations`
- `PATCH /api/v1/reservations/:id`
- `POST /api/v1/reservations/:id/release`

Contract expectations:

1. Conflict signal remains warning-level (not hard block) for MVP.
2. Internal stage transitions are validated server-side.
3. Creating a reservation directly from `/reservations` is only valid when it is bound to an `ApplicationItem`.
4. Current `ReservationInternalStage` values include `needs_source_selection` and `subcontractor_selected`.

### 3.5 Clients / Departures / Completions

- `GET /api/v1/clients`, `GET /api/v1/clients/:id`, `PATCH /api/v1/clients/:id`
- `GET /api/v1/departures`, `POST /api/v1/departures`, `PATCH /api/v1/departures/:id`
- `POST /api/v1/departures/:id/start|arrive|cancel|complete`
- `GET /api/v1/completions`, `POST /api/v1/completions`, `PATCH /api/v1/completions/:id`

Contract expectations:

1. Linked-record history is returned in normalized form for detail workspace.
2. Completion/unqualified outcomes stay explicit in API payload.
3. `POST /api/v1/departures` currently requires a selected reservation `equipmentUnitId` before departure creation.
4. Completion/unqualified cascades must release active reservations and write activity entries.

### 3.6 Stats / Activity

- `GET /api/v1/stats`
- `GET /api/v1/stats/reports?periodDays=7|30` (admin-only)
- `GET /api/v1/stats/analytics?viewId=view-stale-leads|view-lost-leads|view-active-reservations|view-manager-load&sampleTake=1..20` (admin-only)
- `GET /api/v1/activity?entityType=&entityId=&take=`
- `GET /api/v1/activity/search?entityType=&entityId=&scope=&actorId=&from=&to=&q=&limit=` (admin-only)

Contract expectations:

1. Stats payload is stable for Home dashboard cards.
2. `stats/reports` provides canonical report slices for Control reports catalog and is admin-only.
3. `stats/analytics` provides canonical aggregates and sample rows for Control analytics views and is admin-only.
4. Recent activity feed for Home is served via `GET /activity`.
5. `activity/search` is admin-only and is used for Control audit/admin drill-down filters.
6. Manager receives `403` for `stats/reports`, `stats/analytics`, and `activity/search`.
7. `stats/analytics` rejects invalid query params with explicit `400` (`viewId`, `sampleTake`) for authorized callers.

### 3.7 Tasks

- `GET /api/v1/tasks`
- `GET /api/v1/tasks/:id`
- `POST /api/v1/tasks`
- `PATCH /api/v1/tasks/:id`
- `POST /api/v1/tasks/:id/status`
- `POST /api/v1/tasks/:id/duplicate`
- `POST /api/v1/tasks/:id/archive`
- `POST /api/v1/tasks/:id/subtasks`

Contract expectations:

1. `scope=mine|all` is enforced server-side with RBAC/ownership semantics.
2. `includeArchived` controls visibility of archived tasks without hard-delete behavior.
3. Task write endpoints preserve audit trail through activity log entries (`created`, `updated`).
4. Manager assignment boundaries are enforced server-side (no foreign assignee hijack in manager context).
5. `dueDate` supports explicit clear semantics (`null`, and empty-string normalization path for compatibility) without deleting task history.

### 3.8 Integrations / Imports

- `GET /api/v1/integrations/events`
- `GET /api/v1/integrations/events/:id`
- `POST /api/v1/integrations/events/:id/retry`
- `POST /api/v1/integrations/events/:id/replay`
- `POST /api/v1/imports/preview`
- `POST /api/v1/imports/run`
- `GET /api/v1/imports/:id/report`

Contract expectations:

1. Integration events are replay-safe and auditable.
2. Import run/report preserves accounting fields (`imported`, `skipped`, `failed`).
3. Mixed valid/invalid import batches keep deterministic accounting and persist validation issues for report replay.
4. `GET /imports/:id/report` provides error artifacts (`issues`, `errorReportCsv`) for failed-row diagnostics.
5. Admin-only integration/import endpoints require both admin role and enabled capability toggle.
6. Mango ingest events with call metadata create/update lead context and write `note_added` activity records for linked Lead and active Application entities.

### 3.9 Users / Settings

- `GET /api/v1/users`
- `POST /api/v1/users`
- `PATCH /api/v1/users/:id`
- `GET /api/v1/users/managers`
- `GET /api/v1/users/permissions-matrix`
- `PATCH /api/v1/users/permissions-matrix/:capabilityId`
- `GET /api/v1/settings/workspace`
- `PATCH /api/v1/settings/workspace/sections/:sectionId`

Contract expectations:

1. `users` CRUD endpoints are admin-only.
2. `users/managers` stays available for manager assignment selectors in domain forms.
3. `users/permissions-matrix` provides canonical read model for Admin permissions UI.
4. `users/permissions-matrix/:capabilityId` updates role toggles in Admin permissions workspace.
5. `settings/workspace` provides canonical read model for Admin settings dashboard.
6. `settings/workspace/sections/:sectionId` updates section rows in Admin settings workspace.
7. Admin-only users/settings endpoints require both admin role and enabled capability toggle.
8. `POST /users` requires explicit `email`, `fullName`, and `password`; email is normalized to lowercase and becomes the login identity.
9. `PATCH /users/:id` can update `email`, `fullName`, `password`, `role`, and `isActive`; password updates hash server-side and are the MVP password recovery path.
10. `isActive=false` blocks auth login/refresh and removes manager accounts from `GET /users/managers`.
11. Admin-only capabilities (`catalogs.write`, `admin.*`) keep Manager locked out even if a client attempts to enable the matrix cell.

### 3.10 Navigation (deep-link resolver)

- `GET /api/v1/navigation/deep-link?entityType=lead|application|reservation|departure|completion&entityId=<id>`

Contract expectations:

1. Returns canonical navigation target (`secondaryId`, `entityType`, `entityId`) for shared-link/open-by-id scenarios.
2. Returns deterministic `linkedIds` chain (`leadId`, `applicationId`, `reservationId`, `departureId`, `completionId`, `clientId`, `applicationItemId`) for stage switcher UX.
3. Uses existing server-side visibility checks; foreign entity access returns role-appropriate deny (`403` or `404` depending on domain policy).
4. Unknown entity ids return `404`; invalid `entityType` returns `400`.
5. Backend deep-link resolver does not currently accept `client`; frontend route state can still open client workspace with `entityType=client`.

## 4. Error handling policy

Frontend behavior expectations:

1. `401` -> unauthenticated: redirect/re-auth flow.
2. `403` -> forbidden: show permission state, no silent fallback.
3. `422` -> validation: map field errors to UI controls.
4. `500` -> server error: show retry-safe error state with trace id if available.

## 5. Optimistic update policy

Allowed optimistic updates (safe and local):

1. Non-critical UI preferences (view mode, local filters, starred views).
2. Reversible lightweight notes/comments where rollback is straightforward.

Not allowed for optimistic updates (must await server confirmation):

1. Stage transitions.
2. Reservation create/release.
3. Source/unit/subcontractor assignment affecting availability.
4. Completion/unqualified outcomes.

## 6. Webhook endpoint and integration log

Example inbound endpoint:

- `POST /api/v1/integrations/events/ingest`

Expectations:

1. Equivalent dedup strategy per event (`channel + externalId`).
2. Raw payload and processed status logged in `IntegrationEvent`.
3. Retry/replay endpoints for failed events.
4. Clear lifecycle statuses (`received`, `processed`, `failed`, `replayed`).
5. Mango call payloads normalize telephony context (`direction`, `from`/`to`, `duration`, optional `recordingUrl`) for operator-visible activity timeline.

## 7. Contract stability rules

1. Enum changes require changelog and frontend compatibility check.
2. Breaking response changes require versioned path or migration period.
3. New required fields must include safe migration strategy.
