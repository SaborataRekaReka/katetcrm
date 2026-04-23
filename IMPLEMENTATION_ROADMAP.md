# IMPLEMENTATION_ROADMAP

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

Status: `in progress`

Done:

- Frontend shell established (rail/sidebar/header/toolbar contracts).
- State-based navigation with partial URL sync.
- Role toggle and domain-aware nav metadata.

Pending:

- Production-grade routing/auth/session strategy.
- Stable backend API foundation.

### 2.2 Stage 2: Core CRM

Status: `in progress`

Done:

- Funnel stages and core lead-centric views.
- Detail workspace pattern and modal routing baseline.
- Leads list/kanban wired to `GET /leads`.
- Kanban DnD between stages (native HTML5) wired to `POST /leads/:id/stage` with frontend mirror of `ALLOWED_TRANSITIONS`.
- Lead detail modal: `GET /leads/:id`, inline-edit for all persisted fields, `useEntityActivity` journal, unqualify + convert-to-application CTAs.
- `ContactAtoms` (PhoneLink/EmailLink/CopyableValue) applied across lead/client/departure/completion views.

Pending:

- Server-side filters for Leads list.
- `POST /leads` CTA «Создать лид».
- Backend persistence and full server-side RBAC.
- Complete audit trail integration (global filters in Control).

### 2.3 Stage 3: Applications/Items

Status: `in progress`

Done:

- Applications list/table workspace.
- Multi-item model represented in types and UI.
- Item readiness signals and stage-aware open behavior.
- Application detail header: inline-edit (address, comment, requestedDate) via `useUpdateApplication`.
- `POST /applications/:id/cancel` wired through `EntityModalHeader.secondaryActions` + `CancelApplicationDialog`.
- Activity journal via `useEntityActivity('application', id)`.

Pending:

- Item CRUD UI (hooks `useAddApplicationItem` / `useUpdateApplicationItem` / `useDeleteApplicationItem` ready, no UI triggers yet).
- InlineToggle for `isUrgent` / `nightWork`.
- Managers select (needs `GET /managers`).
- Deterministic validation and transition guards.

### 2.4 Stage 4: Reservations/Directories

Status: `in progress`

Done:

- Reservations workspace list/table.
- Internal reservation stage semantics in model.
- Directory modules represented in navigation.
- Reservation detail wired: stage toggle, source select, subcontractorConfirmation, promisedModelOrUnit, plannedStart/End (date + HH:MM–HH:MM window), comment, release with reason, activity journal.

Pending:

- Equipment-unit / subcontractor typeahead (depends on list endpoints already present).
- `POST /reservations` creation flow.
- Directory CRUD UI modals (backend ready).
- Selection constraints with permissions.

### 2.5 Stage 5: Departures/Completion

Status: `planned`

Focus:

- End-to-end departure execution reliability.
- Completion/unqualified release automation backed by server logic.

### 2.6 Stage 6: Integrations

Status: `planned`

Focus:

- Ingestion hardening (idempotency, retry, replay).
- IntegrationEvent lifecycle observability.

### 2.7 Stage 7: Analytics/Import

Status: `planned`

Focus:

- MVP reports and audit coverage guarantees.
- Import preview/mapping/dedup/import-log completion.

## 3. Next priority (short horizon)

Current highest priority:

1. Stabilize core CRM + Applications + Reservations as one consistent server-backed flow.
2. Keep route/title/search/CTA/data consistency across all active modules.
3. Enforce domain invariants in backend contracts.

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
