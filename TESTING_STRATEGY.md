# TESTING_STRATEGY

## 1. Purpose

This file defines practical test strategy for MVP reliability.

## 2. Test layers

1. Smoke tests (fast, every build).
2. Critical E2E flows (release gate).
3. RBAC and permission checks.
4. Route/content consistency checks.
5. View regression checks (board/list/table).

## 3. Smoke tests

Minimum smoke coverage:

1. App shell renders with primary/secondary navigation.
2. Leads workspace opens and switches board/list/table.
3. Applications and reservations workspaces open from secondary nav.
4. Detail modal/workspace opens from row/card click.
5. Build command succeeds.

## 4. Critical E2E flows

Required E2E scenarios:

1. Lead intake -> convert to application.
2. Multi-item application -> reservation for at least one item.
3. Reservation conflict appears as warning and flow remains operable.
4. Reservation ready -> departure -> completed.
5. Completed/unqualified releases active reservation.
6. Repeat order from client context.

## 5. RBAC checks

Mandatory checks:

1. Manager cannot access admin-only sections/routes/apis.
2. Admin can access admin modules.
3. Forbidden operations return proper permission states.

## 6. Route/content consistency checks

For each tested route/context:

1. Route/state id matches title.
2. Search placeholder is contextual.
3. CTA is contextual and executable.
4. Loaded data corresponds to module context.

## 7. Board/List/Table regression checks

For leads/applications/reservations where applicable:

1. View switching preserves active filter context.
2. Status signals are consistent across views.
3. Row/card click opens same entity detail semantics.

## 8. Reservation conflict behavior checks

Must verify:

1. Conflict is shown visually as warning.
2. Conflict does not hard-block save by default.
3. Conflict context is auditable.

## 9. Lead -> Completed happy path

Golden path to verify end-to-end:

1. Create/ingest lead.
2. Convert to application.
3. Create reservation.
4. Mark ready for departure.
5. Complete order.
6. Validate audit entries and reservation release.

## 10. Exit criteria for release

Release gate passes only if:

1. Smoke suite green.
2. Critical E2E green.
3. RBAC negative checks green.
4. No route/title/CTA/data mismatch regressions in touched modules.
