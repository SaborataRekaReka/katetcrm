# QA_REQUIREMENTS

## 1. Status

This document is the source of truth for new tests after the testing reset of 05.05.2026.

The product owner is the only authority for expected behavior when docs, old tests, or current implementation disagree.

## 2. Reset Decisions

QA-RESET-001: Previous tests, previous test commands, and previous test results must not be used for future quality decisions.

QA-RESET-002: The old pre-reset test files and old result artifacts were removed from the repository. Current rebuilt tests must be traceable to the QA-REQ entries below.

QA-RESET-003: New tests must be written from product-owner-confirmed requirements in this document.

QA-RESET-004: The first new test layer must cover the domain happy path: Lead -> Application -> Reservation -> Departure -> Completed.

## 3. Requirement Recording Rules

Each confirmed requirement must use this format:

```text
QA-REQ-000:
Question:
Answer:
Route surface:
Domain surface:
UI surface:
State/API/audit surface:
Test priority:
```

Do not write a test for behavior marked as unanswered.

## 4. Confirmed Requirements For The First Test Layer

QA-REQ-001:
Question: QA-Q-001. What fields are mandatory to create a valid manual Lead?
Answer: Mandatory fields are `contactName` and `contactPhone`.
Route surface: /leads
Domain surface: Lead creation
UI surface: Manual lead form requires `contactName` and `contactPhone`.
State/API/audit surface: Create lead endpoint accepts minimal payload with these required fields.
Test priority: P0

QA-REQ-002:
Question: QA-Q-002. What should happen on duplicate phone/company?
Answer: Show warning only; saving remains allowed.
Route surface: /leads
Domain surface: Duplicate signal on Lead/Client
UI surface: Duplicate is displayed as warning, not blocking dialog.
State/API/audit surface: Duplicate flag is persisted/returned without hard validation block.
Test priority: P0

QA-REQ-003:
Question: QA-Q-003. Which role can create Leads in first suite?
Answer: Both Admin and Manager.
Route surface: /leads
Domain surface: Role access for Lead create
UI surface: Lead create action available for both roles.
State/API/audit surface: Backend allows create for admin and manager roles.
Test priority: P0

QA-REQ-004:
Question: QA-Q-004. What should UI show after lead creation?
Answer: Open the created Lead card/detail workspace immediately.
Route surface: /leads
Domain surface: Lead post-create open behavior
UI surface: User lands in created Lead detail context.
State/API/audit surface: Returned Lead id is used to open detail context.
Test priority: P0

QA-REQ-005:
Question: QA-Q-005. What exact UI action converts Lead to Application?
Answer: Conversion action opens Application workspace from Lead context.
Route surface: /leads -> /applications
Domain surface: Lead -> Application transition
UI surface: Conversion action in Lead detail triggers Application open.
State/API/audit surface: Transition updates funnel state and creates/opens Application.
Test priority: P0

QA-REQ-006:
Question: QA-Q-006. Which Lead fields must be copied to Application?
Answer: Relation model only; no mandatory snapshot copying.
Route surface: /applications
Domain surface: Lead/Application linkage
UI surface: Application reads linked data through relation context.
State/API/audit surface: Application stores link to Lead; snapshot copy is not required behavior.
Test priority: P0

QA-REQ-007:
Question: QA-Q-007. Client creation behavior during Lead -> Application?
Answer: Auto-create or auto-attach client.
Route surface: /leads -> /applications -> /clients
Domain surface: Client linkage during conversion
UI surface: Conversion path does not require mandatory manual client selection.
State/API/audit surface: Conversion ensures client relation is present automatically.
Test priority: P0

QA-REQ-008:
Question: QA-Q-008. What if Lead already has active Application?
Answer: Exactly one active Application per Lead.
Route surface: /leads, /applications
Domain surface: Active Application invariant
UI surface: Second active application creation is blocked.
State/API/audit surface: Backend and DB keep one active Application invariant.
Test priority: P0

QA-REQ-009:
Question: QA-Q-009. Minimum fields for ready ApplicationItem?
Answer: `equipmentType`, `quantity`, `plannedDate`, `plannedTimeFrom/plannedTimeTo`, `address`, and `sourcingType != undecided`.
Route surface: /applications
Domain surface: ApplicationItem readiness
UI surface: Readiness indicator appears only when all listed fields are present.
State/API/audit surface: Readiness derivation follows this exact required set.
Test priority: P0

QA-REQ-010:
Question: QA-Q-010. Can one Application have multiple items in first happy path?
Answer: First happy path uses 2+ ApplicationItems.
Route surface: /applications
Domain surface: Multi-item application planning
UI surface: Scenario must include at least two items.
State/API/audit surface: Application persists and returns multiple items.
Test priority: P0

QA-REQ-011:
Question: QA-Q-011. Is `undecided` source allowed in happy path?
Answer: No; happy path must use only `own` or `subcontractor`.
Route surface: /applications, /reservations
Domain surface: Sourcing policy for happy path
UI surface: Happy-path flow requires explicit non-undecided source.
State/API/audit surface: Item/reservation source in happy path is never `undecided`.
Test priority: P0

QA-REQ-012:
Question: QA-Q-012. What UI state marks ready for reservation?
Answer: The action button becomes enabled.
Route surface: /applications
Domain surface: Readiness -> action availability
UI surface: Enabled button is readiness confirmation.
State/API/audit surface: Readiness state drives enabled action state.
Test priority: P0

QA-REQ-013:
Question: QA-Q-013. Reservation source in first happy path?
Answer: Either own or subcontractor, based on availability.
Route surface: /reservations
Domain surface: Reservation sourcing flexibility
UI surface: Operator may choose available source option.
State/API/audit surface: Reservation source persists as selected available option.
Test priority: P0

QA-REQ-014:
Question: QA-Q-014. Is EquipmentUnit mandatory before Departure?
Answer: Yes, mandatory.
Route surface: /reservations -> /departures
Domain surface: Departure readiness prerequisites
UI surface: Departure action remains unavailable without selected unit.
State/API/audit surface: Transition validation enforces unit presence.
Test priority: P0

QA-REQ-015:
Question: QA-Q-015. Overlap with active reservation behavior?
Answer: Show warning and allow save.
Route surface: /reservations
Domain surface: Reservation conflict policy
UI surface: Conflict warning visible, save action still possible.
State/API/audit surface: Conflict flag/warning stored; no hard rejection.
Test priority: P0

QA-REQ-016:
Question: QA-Q-016 + QA-Q-016A. Exact conflict warning text?
Answer: Use standard conflict-warning message; exact text is not fixed.
Route surface: /reservations
Domain surface: Conflict communication
UI surface: Warning semantics must be present; literal phrase may vary.
State/API/audit surface: Warning state emitted consistently for conflicts.
Test priority: P0

QA-REQ-017:
Question: QA-Q-017. Can conflict hard-block save?
Answer: Never; warning-only.
Route surface: /reservations
Domain surface: Conflict non-blocking invariant
UI surface: No hard block path on conflict.
State/API/audit surface: API does not reject solely due to conflict in MVP policy.
Test priority: P0

QA-REQ-018:
Question: QA-Q-018. How is Departure created?
Answer: Manual user action only.
Route surface: /reservations -> /departures
Domain surface: Departure creation trigger
UI surface: Explicit user action required.
State/API/audit surface: No automatic departure creation path is required.
Test priority: P0

QA-REQ-019:
Question: QA-Q-019. Required Departure statuses for first tests?
Answer: `scheduled`, `in_transit`, `arrived`, `completed`, `cancelled`.
Route surface: /departures
Domain surface: Departure lifecycle states
UI surface: Status timeline supports these states.
State/API/audit surface: API/state machine exposes and accepts these statuses.
Test priority: P0

QA-REQ-020:
Question: QA-Q-020 + QA-Q-020A. Action to move ready Reservation to Departure?
Answer: Enabled action button with label "Perevesti v vyezd".
Route surface: /reservations -> /departures
Domain surface: Reservation -> Departure transition trigger
UI surface: Button becomes active when ready and initiates transition.
State/API/audit surface: Transition call creates/opens Departure context.
Test priority: P0

QA-REQ-021:
Question: QA-Q-021. Exact UI action that completes Departure?
Answer: Close/finish departure via button "Vypolnen".
Route surface: /departures -> /completion
Domain surface: Completion trigger
UI surface: Explicit completion button action.
State/API/audit surface: Completion transition updates departure terminal state.
Test priority: P0

QA-REQ-022:
Question: QA-Q-022 + QA-Q-022A. What records change after completion?
Answer: Lead -> completed; Application -> completed/inactive; Departure -> completed; Reservation -> released; Completion record is created.
Route surface: /departures, /completion, /leads, /applications, /reservations
Domain surface: Completion cascade
UI surface: Linked entities reflect completed/released terminal outcomes.
State/API/audit surface: Cross-entity transactional state changes are required.
Test priority: P0

QA-REQ-023:
Question: QA-Q-023. Should active Reservations always be released after completion?
Answer: Yes, always.
Route surface: /completion, /reservations
Domain surface: Reservation release invariant
UI surface: Reservation appears released after completion.
State/API/audit surface: Release event and timestamps/state are persisted.
Test priority: P0

QA-REQ-024:
Question: QA-Q-024. Mandatory audit/activity entries after completion?
Answer: Completion of Departure, Lead stage change, Reservation release, Application change, and actor identity.
Route surface: /departures, /completion, /activity, /audit
Domain surface: Auditability of terminal transition
UI surface: Activity/audit timeline includes all listed events.
State/API/audit surface: Immutable entries capture actor + key entity mutations.
Test priority: P0

QA-REQ-025:
Question: QA-Q-025. Stages where mark as unqualified is allowed?
Answer: Lead, Application, Reservation, Departure.
Route surface: /leads, /applications, /reservations, /departures
Domain surface: Unqualified entry points
UI surface: Unqualified action available on these stages only.
State/API/audit surface: Transition to terminal unqualified is accepted from listed stages.
Test priority: P1

QA-REQ-026:
Question: QA-Q-026. Is reason required for unqualified/cancelled?
Answer: Required only for unqualified.
Route surface: Terminal actions on lead/application/reservation/departure
Domain surface: Reason policy
UI surface: Reason field mandatory for unqualified, optional for cancelled.
State/API/audit surface: Validation enforces required reason on unqualified path.
Test priority: P1

QA-REQ-027:
Question: QA-Q-027. Required release/deactivate outcomes after unqualified/cancelled?
Answer: Active Reservation -> released; Application -> inactive/cancelled; Lead -> terminal stage; Departure -> cancelled.
Route surface: /leads, /applications, /reservations, /departures
Domain surface: Terminal branch cascade
UI surface: Linked records reflect terminal outcomes.
State/API/audit surface: Cascade updates are persisted and auditable.
Test priority: P1

QA-REQ-028:
Question: QA-Q-028. Canonical routes for happy-path entities?
Answer: Lead `/leads`, Application `/applications`, Reservation `/reservations`, Departure `/departures`, Completion `/completion`, Client `/clients`.
Route surface: listed canonical module routes
Domain surface: Entity-to-route mapping
UI surface: Navigation and open behavior use these canonical routes.
State/API/audit surface: Route context must align with loaded entity type.
Test priority: P0

QA-REQ-029:
Question: QA-Q-029. Detail open pattern?
Answer: Full-screen dialog/workspace.
Route surface: all entity modules
Domain surface: Detail workspace consistency
UI surface: Entity details open in full-screen workspace dialog pattern.
State/API/audit surface: Detail state and navigation context sync with workspace open state.
Test priority: P0

QA-REQ-030:
Question: QA-Q-030. Which view modes are tested first?
Answer: `board`, `list`, `table`, `cards`.
Route surface: module routes with view modes
Domain surface: View representation parity
UI surface: These modes are covered in first wave.
State/API/audit surface: View mode state is handled consistently per module.
Test priority: P1

QA-REQ-031:
Question: QA-Q-031. What survives browser back/forward?
Answer: `pathname`, `view mode`, `entityType/entityId` query, and open detail modal.
Route surface: all routed module/detail states
Domain surface: Navigation continuity
UI surface: Browser navigation restores module/view/entity open context.
State/API/audit surface: Route/query-driven state restoration is deterministic.
Test priority: P0

QA-REQ-032:
Question: QA-Q-032. Which happy-path steps are available to Manager?
Answer: Create Lead, convert Lead to Application, add/edit ApplicationItem, create Reservation, move to Departure, complete Departure, mark unqualified.
Route surface: /leads, /applications, /reservations, /departures
Domain surface: Manager operational permissions in happy path
UI surface: Manager sees and can execute listed actions.
State/API/audit surface: Backend permits listed manager actions.
Test priority: P0

QA-REQ-033:
Question: QA-Q-033 + QA-Q-033A. Which steps are admin-only?
Answer: Users, permissions, global settings, imports run, integrations retry/replay are admin-only, and they are outside happy path.
Route surface: /admin and admin modules
Domain surface: Admin-only control surfaces
UI surface: Admin-only actions not presented as happy-path manager steps.
State/API/audit surface: Backend restricts these actions to admin role.
Test priority: P0

QA-REQ-034:
Question: QA-Q-034. What Manager must not see in navigation?
Answer: Admin primary domain, Users, Permissions, Settings, Imports, Integrations journal.
Route surface: primary/secondary navigation model
Domain surface: Role-aware navigation visibility
UI surface: Manager navigation hides admin-only modules.
State/API/audit surface: UI hide is convenience; server authorization still enforced.
Test priority: P0

QA-REQ-035:
Question: QA-Q-035. Forbidden manager API response code?
Answer: Always `403`.
Route surface: protected admin/forbidden API endpoints
Domain surface: RBAC deny semantics
UI surface: Forbidden calls map to explicit permission-denied UX.
State/API/audit surface: API returns 403 consistently for forbidden manager operations.
Test priority: P0

QA-REQ-036:
Question: QA-Q-036. What should Mango call ingest do for a new caller phone?
Answer: Create a Lead with source channel `mango` through integration ingest.
Route surface: /leads, /admin/integrations
Domain surface: Integration ingestion -> Lead upsert
UI surface: New lead appears in Leads workspace with Mango source marker.
State/API/audit surface: `POST /api/v1/integrations/events/ingest` with `channel=mango` stores processed IntegrationEvent and relatedLeadId.
Test priority: P1

QA-REQ-037:
Question: QA-Q-037. Where should Mango call recording metadata be visible?
Answer: In activity timeline of linked Lead and active Application.
Route surface: /leads detail, /applications detail
Domain surface: Telephony context visibility across lead/application stages
UI surface: Activity entry shows call details and recording link.
State/API/audit surface: Ingest writes `note_added` activity entries for lead/application with telephony payload (`direction`, `durationSec`, `recordingUrl`).
Test priority: P1

QA-REQ-038:
Question: QA-Q-038. How should user creation, active status, role management, and password recovery work?
Answer: Only Admin can manage users and permissions. User email is the login identity and is required on create/update. Active means login is allowed and the manager appears in assignment selectors; inactive blocks login and hides the manager from assignment selectors. Password recovery in MVP is Admin reset to a temporary password; automatic email reset is not enabled.
Route surface: /admin/users, /admin/permissions, /auth/login
Domain surface: User access lifecycle and RBAC boundaries
UI surface: Admin Users form captures email, role, active status, and temporary password; Admin Permissions shows admin-only capabilities as locked for Manager.
State/API/audit surface: `/users` mutations are admin-only, manager forbidden operations return 403, `isActive` is enforced by auth and manager selectors, password updates hash server-side, and user access mutations write audit/activity entries.
Test priority: P0

## 5. Open Questions

None for QA-Q-001..QA-Q-037 in this first interview pass.

If behavior changes later, add a new QA-Q item and then add/update corresponding QA-REQ entries.
