# IMPLEMENTATION_ROADMAP

Updated: 2026-05-06 (testing model rebuilt from `QA_REQUIREMENTS.md`; old pre-reset smoke/e2e results remain invalid)

Testing note: use `TESTING_STRATEGY.md` for current commands and `docs/TEST_EXECUTION_REPORT.md` for the latest run log. Older validation references in this roadmap are historical context only and must not be used as proof of current correctness.

## 1. Stage order (fixed)

Implementation proceeds in this order:

1. Platform
2. Core CRM
3. Applications/Items
4. Reservations/Directories
5. Departures/Completion
6. Integrations
7. Analytics/Import

Rule:

- Do not skip layers. Finish critical invariants of current stage before moving to next.

## 2. Current status snapshot

### 2.1 Stage 1: Platform

Status: `done`

Done:

- Frontend shell established (rail/sidebar/header/toolbar contracts).
- State-based navigation with partial URL sync.
- Role toggle and domain-aware nav metadata.
- Stable backend API foundation for core CRM flow is in place (health/auth/leads/applications/reservations/departures/completions).
- Route/view/entity state consistency is covered by rebuilt browser route scenarios and adapter/projection tests where applicable.
- Browser-level token lifecycle validation completed (refresh fallback + logout fallback).

Pending:

- None.

### 2.2 Stage 2: Core CRM

Status: `done`

Done:

- Funnel stages and core lead-centric views.
- Detail workspace pattern and modal routing baseline.
- Leads list/kanban wired to `GET /leads`.
- `POST /leads` CTA "Create lead" wired (`NewLeadDialog` + `useCreateLead`).
- Kanban DnD between stages (native HTML5) wired to `POST /leads/:id/stage` with frontend mirror of `ALLOWED_TRANSITIONS`.
- Lead detail modal: `GET /leads/:id`, inline-edit for all persisted fields, `useEntityActivity` journal, unqualify + convert-to-application CTAs.
- Leads list now pushes scope/source/stage/query to backend filters (`GET /leads`) in API mode.
- `ContactAtoms` (PhoneLink/EmailLink/CopyableValue) applied across lead/client/departure/completion views.
- Client workspace now keeps real `clientId` context across Sales/Ops opens and persists comment edits to API (`PATCH /clients/:id`) in API mode.
- Control/Home aggregate and audit wiring is in place in API mode (`/stats`, `/activity/search`) with fallback behavior.
- Auth/session hardening: startup fallback `refresh -> me` and transparent single-flight refresh retry on 401 in API client.
- Leads manager filter parity is now server-aware: dedicated managers endpoint + toolbar mapping to backend `managerId`.
- Historical RBAC automation references were invalidated by the 05.05.2026 testing reset.
- Current RBAC API/browser coverage is rebuilt from `QA_REQUIREMENTS.md` and tracked in `docs/TEST_EXECUTION_REPORT.md`.
- Browser-level auth behavior in API mode is validated manually: invalid access token recovers through refresh, invalid refresh token leads to login screen.

Pending:

- None.

### 2.3 Stage 3: Applications/Items

Status: `done`

Done:

- Applications list/table workspace.
- Multi-item model represented in types and UI.
- Item readiness signals and stage-aware open behavior.
- Application detail header: inline-edit (address, comment, requestedDate) via `useUpdateApplication`.
- `POST /applications/:id/cancel` wired through `EntityModalHeader.secondaryActions` + `CancelApplicationDialog`.
- Activity journal via `useEntityActivity('application', id)`.
- "Prepare reservation" from ready positions is wired in application detail (`LeadDetailModal`) via `useCreateReservation`.
- Item CRUD UI is wired via `PositionDialog` (add/edit/delete) from application detail.
- Decimal normalization/validation for position money fields is wired in frontend and backend.
- Application terminal policy is finalized and enforced: `completed/cancelled` only for application domain, with `lead/departure unqualified` cascading to `application.cancelled`.
- Historical policy assertions from the removed smoke checks are invalidated; current assertions must stay traceable to `QA_REQUIREMENTS.md`.

Pending:

- None.

### 2.4 Stage 4: Reservations/Directories

Status: `done`

Done:

- Reservations workspace list/table.
- Internal reservation stage semantics in model.
- Directory modules represented in navigation.
- Reservation detail wired: stage toggle, source select, subcontractorConfirmation, promisedModelOrUnit, plannedStart/End (date + HH:MM–HH:MM window), comment, release with reason, activity journal.
- Reservation creation flow from application-ready positions is available through shared application detail.
- Equipment-unit / subcontractor typeahead is wired in reservation detail.
- Contextual reservation-create flow is wired from Reservations workspace for positions of existing applications without active reservation. It remains `ApplicationItem`-bound, not free-form top-level reservation creation.
- Directory CRUD dialogs are wired for categories/types/units/subcontractors.
- Selection constraints are enforced server-side for reservation source/unit/subcontractor with active-directory validation and stage-readiness guards.
- Reservation projection now includes conflict context and denormalized reserved-by labels for UI parity.

Pending:

- None.

### 2.5 Stage 5: Departures/Completion

Status: `done`

Done:

- Backend modules for departures/completions implemented and connected (`/departures`, `/completions`, transitions, projections).
- `POST /departures` supports manual reservation -> departure creation and enforces selected unit before creation.
- Completion/unqualified server cascade is implemented (completion entity, departure terminal status update, reservation release, lead/application terminal stage sync, activity log).
- Frontend API wiring for Ops is implemented:
	- departures list/detail in API mode,
	- completion list/detail in API mode,
	- API mutations for start/arrive/cancel/complete/update.
- Completion workspace primary list source is switched to `/completions` (with departures fallback for no-completion view).
- Browser/runtime validation for `reservation -> departure -> completion` has been rebuilt from `QA_REQUIREMENTS.md`.
- Startup profile hardening for occupied local `5433` is implemented in `prepare:dev` with fallback diagnostics and runbook docs.

Pending:

- None.

Focus:

- End-to-end departure execution reliability.
- Completion/unqualified release automation backed by server logic.

### 2.6 Stage 6: Integrations

Status: `done`

Done:

- Integration ingest idempotency is implemented; old automated verification was invalidated by the 05.05.2026 testing reset.
- Retry/replay guards for non-failed events are implemented. Current validation for core integration invariants is rebuilt from `QA_REQUIREMENTS.md`; production-like signed webhook fixtures still need explicit hardening coverage.
- Removed historical stage-level automation references are not a current release gate.
- Non-production ingest fallback for missing channel secrets allows stable local verification without weakening production checks.
- Signed-webhook and repeat-flow behavior require new tests after product-owner confirmation in `QA_REQUIREMENTS.md`.

Pending:

- None.

Focus:

- Ingestion hardening (idempotency, retry, replay).
- IntegrationEvent lifecycle observability.

### 2.7 Stage 7: Analytics/Import

Status: `done`

Done:

- Reports slice is wired to live `/stats` + `/activity/search(action=imported)` data.
- Control analytics views moved to dedicated server-side contract `GET /stats/analytics?viewId=...&sampleTake=...` with backend-computed summary, manager distribution and sample rows.
- Import wizard supports CSV upload, mapping, preview, run, and downloadable per-run error CSV.
- Import run metadata persistence is expanded (headers, required fields, mapping, summary, full issues, rows fingerprint).
- `GET /imports/:importId/report` endpoint added for auditable replay/report retrieval by import id.
- Previous analytics/import automated checks were invalidated by the 05.05.2026 testing reset. Current core gates are rebuilt, but import/integration hardening scenarios still need additional confirmed requirements and tests.

Pending:

- Enforce and verify backend CSV size limits for import flow.
- Finalize deterministic validation/error taxonomy and operational runbook for import failures.

Focus:

- MVP reports and audit coverage guarantees.
- Import preview/mapping/dedup/import-log completion.

### 2.8 Cross-stage: Tasks/Home write contour

Status: `done`

Done:

- Dedicated tasks backend module is implemented and wired (`/tasks` list/get/create/update/status/duplicate/archive/subtasks).
- Prisma schema/migration/client are aligned for tasks domain (`Task`, `TaskStatus`, `TaskPriority`).
- Home `My Tasks` in API mode is switched from read-only derived behavior to real write flow.
- Task detail now supports editable fields (title/description/priority/due date/tags) with save/reset behavior and API mutation path.
- dueDate clear behavior is implemented end-to-end (`'' -> null` normalization on frontend + DTO transform + service patch mapping).
- Cross-module dead-control sweep is applied for client-open CTA points in reservation/departure/completion workspaces (including API variants) and shared click affordance components (`DenseDataTable`, `KpiRow`).
- Previous tasks/admin/control automated checks and browser checks were invalidated by the 05.05.2026 testing reset.
- Current rebuilt gates cover the first-wave tasks/admin/control/button matrix; build/typecheck remain compile checks only and are not proof of business correctness.

Pending:

- None.

## 3. Next priority (short horizon)

Current highest priority:

1. Expand import workflow hardening with backend CSV size-limit enforcement and deterministic validation profiles.
2. Add new contract/browser checks for import/integration negative scenarios after `QA_REQUIREMENTS.md` confirmation.
3. Extend CRUD/RBAC negative coverage only where new requirements are confirmed or new admin/control behavior changes.

Known implementation/documentation risk:

- `leads.service.ts` still contains a compatibility path that auto-creates Departures when a Lead stage changes from `reservation` to `departure`. The current QA/API contract path treats Reservation -> Departure as a manual user action via `POST /departures` with unit prerequisite. Do not expand the auto-create path without a product decision.

## 4. Definition of done per stage

### 4.1 Platform DoD

- Navigation hierarchy stable and role-aware.
- Route-aware state behavior predictable.
- Shared shell and overflow contracts validated.

### 4.2 Core CRM DoD

- Lead lifecycle actions persist reliably.
- Duplicate warning path visible and auditable.
- Manager/Admin access validated server-side.

### 4.3 Applications/Items DoD

- Multi-item create/edit/transition flows complete.
- Item-level readiness derived deterministically.
- One active application per lead enforced.

### 4.4 Reservations/Directories DoD

- One active reservation per item enforced.
- Conflict behavior = warning path implemented and logged.
- Directory entities CRUD + reference constraints working.

### 4.5 Departures/Completion DoD

- Reservation -> departure -> completion path complete.
- Completion/unqualified release automation verified.

### 4.6 Integrations DoD

- Inbound channels process idempotently.
- Replay/retry tooling available for failed events.

### 4.7 Analytics/Import DoD

- MVP KPI reports available.
- Audit coverage complete for critical actions.
- Import workflow supports preview, mapping, dedup, and logs.

## 5. Change sequencing rule for contributors

Before starting any feature:

1. Identify roadmap stage.
2. Check prior-stage DoD dependencies.
3. State explicit non-goals for this iteration.
4. Ship smallest vertical slice that preserves invariants.
