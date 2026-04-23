# API_CONTRACTS_OVERVIEW

## 1. Purpose

This file is an API contract overlay above OpenAPI/Swagger.
It explains what frontend and agents should expect by domain.

## 2. API groups

Primary groups:

1. `/auth`
2. `/leads`
3. `/applications`
4. `/reservations`
5. `/departures`
6. `/clients`
7. `/equipment-types`
8. `/equipment-units`
9. `/subcontractors`
10. `/analytics`
11. `/audit-log`
12. `/imports`

Versioning:

- Use `/api/v1/...` paths.

## 3. Frontend contract expectations

### 3.1 Common

1. Stable IDs and timestamps.
2. Predictable validation error shape for forms.
3. Explicit permission error responses.
4. Pagination/sorting/filter metadata for list endpoints.

### 3.2 Leads

- Duplicate hint fields should be returned explicitly.
- Source channel metadata must be preserved.

### 3.3 Applications

- Item-level readiness fields available in response.
- Stage and item status values must match domain enums.

### 3.4 Reservations

- Conflict signal and conflict context included in response.
- Internal stage transitions validated server-side.

### 3.5 Clients

- Linked history summaries available without expensive multi-call choreography.

### 3.6 Analytics/Audit

- Reporting endpoints return normalized KPI payloads.
- Audit endpoints return actor/action/entity/timestamp and before/after where required.

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

## 6. Webhook endpoints and integration logs

Webhook scope:

- Site
- Mango
- Telegram
- MAX

Expectations:

1. Idempotency key or equivalent dedup strategy per event.
2. Raw payload and processed status logged in IntegrationEvent.
3. Replay endpoint/process for failed events.
4. Clear event lifecycle statuses (`received`, `processed`, `failed`, `replayed`).

## 7. Contract stability rules

1. Enum changes require changelog and frontend compatibility check.
2. Breaking response changes require versioned path or migration period.
3. New required fields must include safe migration strategy.
