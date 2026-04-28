# IMPLEMENTATION_ROADMAP

Updated: 2026-04-28 (stage6+stage7 automation, import reporting, release gate expansion)

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
- Automated route/title/search/CTA/meta consistency check is added and included in release smoke gate.
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
- Release negative RBAC checks were expanded (directories admin-only matrix + ownership checks across leads/applications/reservations/departures) and included in aggregate release gate (`smoke:release`).
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
- Policy assertions are added to smoke checks (`smoke:stage3`, `smoke:stage5`).

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
- Dedicated reservation-create flow is wired from Reservations workspace toolbar/CTA.
- Directory CRUD dialogs are wired for categories/types/units/subcontractors.
- Selection constraints are enforced server-side for reservation source/unit/subcontractor with active-directory validation and stage-readiness guards.
- Reservation projection now includes conflict context and denormalized reserved-by labels for UI parity.

Pending:

- None.

### 2.5 Stage 5: Departures/Completion

Status: `done`

Done:

- Backend modules for departures/completions implemented and connected (`/departures`, `/completions`, transitions, projections).
- Reservation -> departure automation is implemented on lead stage transition (`reservation -> departure` creates active departures when needed).
- Completion/unqualified server cascade is implemented (completion entity, departure terminal status update, reservation release, lead/application terminal stage sync, activity log).
- Frontend API wiring for Ops is implemented:
	- departures list/detail in API mode,
	- completion list/detail in API mode,
	- API mutations for start/arrive/cancel/complete/update.
- Completion workspace primary list source is switched to `/completions` (with departures fallback for no-completion view).
- Runtime smoke flow `reservation -> departure -> completion` is green in backend (`smoke:stage5`).
- Manual browser E2E validation passed in API mode for `departure -> completion` (start, arrive, complete) with cross-workspace visibility in Completion list.
- Startup profile hardening for occupied local `5433` is implemented in `prepare:dev` with fallback diagnostics and runbook docs.

Pending:

- None.

Focus:

- End-to-end departure execution reliability.
- Completion/unqualified release automation backed by server logic.

### 2.6 Stage 6: Integrations

Status: `done`

Done:

- Integration ingest idempotency is implemented and verified with duplicate-event smoke coverage.
- Retry/replay guards for non-failed events are enforced and validated in smoke checks.
- Stage-level smoke automation added (`smoke:stage6`) and included into release gate.
- Non-production ingest fallback for missing channel secrets allows stable local verification without weakening production checks.

Pending:

- Add signed-webhook fixture tests with explicit HMAC headers for each channel profile.

Focus:

- Ingestion hardening (idempotency, retry, replay).
- IntegrationEvent lifecycle observability.

### 2.7 Stage 7: Analytics/Import

Status: `done`

Done:

- Reports slice is wired to live `/stats` + `/activity/search(action=imported)` data.
- Import wizard supports CSV upload, mapping, preview, run, and downloadable per-run error CSV.
- Import run metadata persistence is expanded (headers, required fields, mapping, summary, full issues, rows fingerprint).
- `GET /imports/:importId/report` endpoint added for auditable replay/report retrieval by import id.
- Stage-level smoke automation added (`smoke:stage7`) and included into release gate.

Pending:

- Add optional `.xlsx` parser and multi-sheet mapping rules.

Focus:

- MVP reports and audit coverage guarantees.
- Import preview/mapping/dedup/import-log completion.

## 3. Next priority (short horizon)

Current highest priority:

1. Harden signed webhook compatibility tests for production-like HMAC flows.
2. Expand import workflow with `.xlsx` support and large-file safety limits.
3. Add browser E2E for admin import wizard + report retrieval path.

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
