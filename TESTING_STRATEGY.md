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

1. `smoke:base` validates auth + lead intake + stage transition + duplicates + activity baseline.
2. `smoke:stage3` validates applications/items/reservations policies and terminal invariants.
3. `smoke:stage5` validates reservation -> departure -> completion flow and release cascades.
4. `smoke:stage6` validates integrations ingest idempotency + retry/replay guards (+ signed fixtures when secrets configured).
5. `smoke:stage6:strict` validates signed webhook fixtures in enforced-auth mode with production-like secret profile.
6. `smoke:stage7` validates stats/import/audit contracts including `stats/analytics` views and mixed valid/invalid import run/report behavior (`issues`, `errorReportCsv`, accounting).
7. `smoke:tasks` validates tasks write contour (`create/status/subtask/duplicate/archive/scope`) including `dueDate` clear path.
8. `smoke:rbac` validates manager denial for admin-only directories and foreign-ownership operations.
9. `smoke:rbac:scope` validates manager scope on `stats/reports/analytics` and analytics query validation (`400`).
10. `smoke:admin` validates admin write scenarios (`users/settings/permissions`) and manager-deny checks.
11. `smoke:admin:control` validates admin/control runtime read endpoints + manager deny (`stats/reports/analytics/activity/users/settings/integrations`).
12. Aggregate `smoke:release` runs all checks above + frontend `check:ui-consistency`.

Repeat-flow stability runbook: `docs/repeat-flow-runbook.md` (`smoke:flow:repeat`).

Validation snapshot (28.04.2026):

1. `smoke:stage6:strict` passed in enforced-signature profile.
2. `smoke:flow:repeat` passed (3 iterations).
3. Browser baseline `npm --prefix app/frontend run e2e` passed (admin/control, 2/2).

## 4. Critical E2E flows

Required E2E scenarios:

1. Lead intake -> convert to application.
2. Multi-item application -> reservation for at least one item.
3. Reservation conflict appears as warning and flow remains operable.
4. Reservation ready -> departure -> completed.
5. Completed/unqualified releases active reservation.
6. Repeat order from client context.
7. Browser runtime checks for admin/control: `npm --prefix app/frontend run e2e`.

## 5. RBAC checks

Mandatory checks:

1. Manager cannot access admin-only sections/routes/apis.
2. Admin can access admin modules.
3. Manager cannot mutate or read foreign entities outside visibility scope.
4. Manager analytics scope does not leak foreign manager rows.
5. Forbidden operations and invalid protected inputs return proper permission/validation states (`403`/`400`).

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

1. `smoke:release` is fully green.
2. Critical E2E/runtime scenarios for touched domains are green.
3. RBAC negative and scope checks (`smoke:rbac`, `smoke:rbac:scope`, `smoke:admin`, `smoke:admin:control`) are green.
4. No route/title/CTA/data mismatch regressions in touched modules.
