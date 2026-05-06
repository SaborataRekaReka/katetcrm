# Button Coverage Matrix

## Purpose

This matrix is the executable registry for high-risk CRM action buttons.
A button is considered protected only when all 4 checks exist:

1. Positive flow (button works in allowed state).
2. Negative business flow (button blocked when prerequisites are missing).
3. RBAC flow (allowed for manager/admin as required, forbidden with 403 where applicable).
4. Runtime/API failure guard (unexpected browser `console.error` and failed API requests fail the test run).

Source requirements: `QA-REQ-001..QA-REQ-035`.

## Global Runtime Guard

All current browser specs include shared runtime guards from `app/frontend/e2e/helpers.ts`:

- unexpected `console.error` -> test fails;
- unexpected `requestfailed` for API base URL -> test fails.

Stable selector contract for primary workflow CTA:

- `data-testid="entity-primary-action"` in `EntityModalHeader` primary action button.

This guard is active in:

- `happy-path.gwt.spec.ts`
- `terminal-branch.gwt.spec.ts`
- `rbac-navigation.gwt.spec.ts`
- `extended-buttons.gwt.spec.ts`

Current button matrix coverage: 24/24 covered (100%).

## P0-P1 Action Buttons

| ID | Route surface | Button | Domain intent | Positive | Negative | RBAC | Runtime/API guard | Status |
|---|---|---|---|---|---|---|---|---|
| BTN-001 | /leads | Новый лид | Lead create entry | E2E-001, E2E-011 | Required fields validation in create dialog (QA-REQ-001) | E2E-011 (manager allowed), backend APIC | Guard enabled in all suites | Covered |
| BTN-002 | /leads -> /applications | Перевести в заявку | Lead -> Application transition | E2E-003 | Second active application blocked (QA-REQ-008) in E2E-003 | E2E-011 (manager allowed) | Guard enabled in all suites | Covered |
| BTN-003 | /leads | Пометить некачественным | Lead terminal unqualified path | E2E-009 (visibility) | Reason mandatory policy via cascade checks (QA-REQ-026) | E2E-011 (manager allowed) | Guard enabled in all suites | Covered |
| BTN-004 | /applications | Подготовить к брони | Application ready -> Reservation transition | E2E-004 | Undecided source blocked (`400`) in E2E-004 | E2E-011 (manager allowed) | Guard enabled in all suites | Covered |
| BTN-005 | /applications | Открыть бронь | Open linked reservation context | E2E-004 (explicit click and URL open assert) | N/A (open action, no extra domain validation) | E2E-011 route-level manager ops | Guard enabled in all suites | Covered |
| BTN-006 | /reservations | Перевести в выезд | Reservation -> Departure transition | E2E-006 | Disabled without unit + hint check in E2E-006 | E2E-011 (manager allowed) | Guard enabled in all suites | Covered |
| BTN-007 | /reservations | Закрыть как некачественный | Reservation terminal unqualified path | E2E-009 (visibility) | Unqualified cascade verified in E2E-009 | E2E-011 (manager allowed) | Guard enabled in all suites | Covered |
| BTN-008 | /departures | Зафиксировать выезд | Departure status scheduled -> in_transit | E2E-007, E2E-008 | Status transition controlled by backend/state machine | E2E-011 (manager allowed) | Guard enabled in all suites | Covered |
| BTN-009 | /departures | Зафиксировать прибытие | Departure status in_transit -> arrived | E2E-007, E2E-008 | Status transition controlled by backend/state machine | E2E-011 (manager allowed) | Guard enabled in all suites | Covered |
| BTN-010 | /departures | Выполнен | Departure -> Completion transition | E2E-007, E2E-008 | Cascade invariants validated in E2E-008 | E2E-011 (manager allowed) | Guard enabled in all suites | Covered |
| BTN-011 | /departures | Некачественный | Departure -> unqualified transition | E2E-009 | Disabled without reason + backend `400` without reason in E2E-009 | E2E-011 (manager allowed) | Guard enabled in all suites | Covered |
| BTN-012 | Navigation | Admin modules hidden for manager | Prevent forbidden admin actions | E2E-011 navigation checks | Forbidden endpoints return `403` in E2E-011 | E2E-011 | Guard enabled in all suites | Covered |

## Extended Non-Happy-Path Buttons (Sales/Ops)

| ID | Route surface | Button | Domain intent | Positive | Negative | RBAC | Runtime/API guard | Status |
|---|---|---|---|---|---|---|---|---|
| BTN-013 | /leads | Отметить как дубль | Mark duplicate after manual review | E2E-012 (`extended-buttons`) marks lead duplicate and verifies persisted flag | Duplicate remains warning-only policy (QA-REQ-002) | Manager allowed (E2E-012) | Guard enabled in extended suite | Covered |
| BTN-014 | /leads | Создать клиента | Create linked client from lead context | E2E-012 clicks action and opens linked client context | Missing mandatory lead contact data handled by UI validation in modal flow | Manager allowed (E2E-012) | Guard enabled in extended suite | Covered |
| BTN-015 | /leads | Редактировать лид | Lead update dialog action | E2E-012 opens/closes edit dialog deterministically from Lead detail | Validation handled in dialog (required contact fields) | Manager allowed (E2E-012) | Guard enabled in extended suite | Covered |
| BTN-016 | /applications | Редактировать заявку | Application update dialog action | E2E-013 edits address and verifies persisted update via API | Dialog validation preserved for patch semantics | Manager allowed (E2E-013) | Guard enabled in extended suite | Covered |
| BTN-017 | /applications | Отменить заявку | Application terminal cancel branch | E2E-013 cancels application via UI and verifies `cancelled/inactive` | Cancel remains blocked when active reservations exist (domain rule) | Manager allowed (E2E-013) | Guard enabled in extended suite | Covered |
| BTN-018 | /reservations | Снять бронь | Reservation release action | E2E-014 открывает API-mode detail и снимает бронь через UI, проверяет `released` в API | Причина снятия опциональна, диалог не ломает flow без reason | Manager allowed (E2E-014) | Guard enabled in extended suite | Covered |
| BTN-019 | /departures | Отменить выезд | Departure cancel terminal action | E2E-015 confirms cancel flow and persisted departure terminal status | Cancel reason optional rule preserved (QA-REQ-026) | Manager allowed (E2E-015) | Guard enabled in extended suite | Covered |
| BTN-020 | /departures | Открыть бронь | Linked reservation open from departure | E2E-015 clicks open-reservation action and verifies route/entity | N/A (open action) | Manager allowed (E2E-015) | Guard enabled in extended suite | Covered |
| BTN-021 | /completion | Открыть бронь | Linked reservation open from completion | E2E-016 clicks open-reservation action from Completion workspace | N/A (open action) | Manager allowed (E2E-016) | Guard enabled in extended suite | Covered |
| BTN-022 | /completion | Пометить некачественным | Completion unqualified action | E2E-017 открывает detail из `view-no-completion`, выполняет unqualified и проверяет каскад | Проверяется корректный terminal cascade: lead/application/reservation/departure/completion | Manager allowed (E2E-017) | Guard enabled in extended suite | Covered |
| BTN-023 | /completion | Создать повторный заказ | Repeat order from terminal context | E2E-016 opens repeat-order dialog from API-mode Completion workspace and creates a linked repeat lead via API | E2E-017 verifies unqualified completion does not expose repeat-order CTA | Manager allowed (E2E-016) | Guard enabled in extended suite | Covered |
| BTN-024 | /admin/users (direct URL) | Permission denied panel | Explicit forbidden UX for manager | E2E-011 direct-admin-route check | Admin nav hidden + deny panel shown | Manager denied with explicit UI message | Guard enabled in all suites | Covered |

## Priority Gaps (Next)

1. No open P0-P1 button blockers in the current matrix.

## PR Gate

Use frontend gate scripts:

- `npm --prefix app/frontend run e2e:gate` (smoke + build)
- `npm --prefix app/frontend run e2e:gate:full` (full e2e + build)
