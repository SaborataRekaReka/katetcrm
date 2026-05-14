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
Answer: `equipmentType`, `quantity`, `shiftCount`, `plannedDate`, `plannedTimeFrom/plannedTimeTo`, and `address`.
Route surface: /applications
Domain surface: ApplicationItem readiness
UI surface: Save for reservation preparation is enabled only when all listed fields are present.
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
Question: QA-Q-037. Can Lead -> Application create an Application when conversion-required Lead data is missing?
Answer: No. Conversion requires contact, requested date, and address; if any are missing, the Lead remains in `lead` stage and no Application is created.
Route surface: /leads -> /applications
Domain surface: Lead -> Application transition
UI surface: Lead conversion and kanban drag/drop show the missing fields instead of moving the card.
State/API/audit surface: `POST /api/v1/leads/:id/stage` rejects invalid `stage=application` without creating an Application.
Test priority: P0

QA-REQ-038:
Question: QA-Q-038. Can Application -> Reservation be represented by moving a Lead stage without an active Reservation entity?
Answer: No. A Lead can enter `reservation` stage only when its active Application already has at least one active Reservation.
Route surface: /leads, /applications, /reservations
Domain surface: Application -> Reservation transition
UI surface: Kanban drag/drop to Reservation is blocked until reservation preparation creates a real Reservation; stage-specific card click opens the linked Reservation/Application when present.
State/API/audit surface: `POST /api/v1/leads/:id/stage` rejects invalid `stage=reservation` without an active Reservation and keeps Lead/Application stages unchanged.
Test priority: P0

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

QA-REQ-039:
Question: QA-Q-039. Who can roll a CRM chain back one lifecycle step?
Answer: Manager and Admin can roll back one step when the user is allowed to access the Lead chain; rollback is never multi-step in a single operation.
Route surface: /leads, /applications, /reservations, /departures, /completion
Domain surface: Lead -> Application -> Reservation -> Departure -> Completed/Unqualified rollback
UI surface: Detail workspaces show a confirmed rollback/delete-current action for the current representation.
State/API/audit surface: `POST /api/v1/leads/:id/rollback` and `POST /api/v1/leads/:id/delete-current` perform one server-side lifecycle rollback and write audit with snapshot payload.
Test priority: P0

QA-REQ-040:
Question: QA-Q-040. What does rollback/delete-current remove at each active lifecycle stage?
Answer: Application -> Lead deletes the active Application only when no downstream records exist; Reservation -> Application deletes all active Reservations of the active Application only when none has a Departure; Departure -> Reservation deletes active Departures; Completed/Unqualified -> Departure deletes Completion and restores Departure, Reservation, and Application active.
Route surface: /applications, /reservations, /departures, /completion
Domain surface: Current representation hard-delete semantics
UI surface: Confirmation copy names destructive rollback semantics before action.
State/API/audit surface: Backend owns delete order and blocks unsafe reservation rollback when a Departure exists.
Test priority: P0

QA-REQ-041:
Question: QA-Q-041. Who can delete the full CRM chain and what survives?
Answer: Full chain deletion is Admin-only. It deletes Lead, Application, ApplicationItems, Reservations, Departures, and Completions; it preserves Clients, contacts, companies, and audit/activity entries.
Route surface: all CRM detail routes
Domain surface: Full lifecycle hard delete
UI surface: Chain delete action is visible only for Admin and requires confirmation.
State/API/audit surface: `DELETE /api/v1/leads/:id/chain` returns 403 for Manager, deletes dependent entities in FK-safe order, and writes a pre-delete audit snapshot.
Test priority: P0

QA-REQ-042:
Question: QA-Q-042. How should terminal rollback restore statuses?
Answer: Terminal rollback removes Completion; restores Departure to `arrived` if `arrivedAt` exists, `in_transit` if `startedAt` exists, otherwise `scheduled`; restores related Reservations active; restores Application active with stage `departure`; restores Lead stage `departure`.
Route surface: /completion -> /departures
Domain surface: Terminal rollback status restoration
UI surface: Completion detail returns to the linked Departure context after rollback.
State/API/audit surface: Completion deletion and state restoration are transactional and auditable.
Test priority: P0

QA-REQ-043:
Question: QA-Q-043. What should the Leads Kanban inline add action do?
Answer: The Kanban lead column action must be labeled "Добавить лид" and open the same Lead creation flow as the module primary CTA; after successful creation the created Lead detail context opens.
Route surface: /leads?view=board
Domain surface: Lead creation
UI surface: Kanban add action is active, creates a Lead, and does not create a generic card/task.
State/API/audit surface: Returned Lead id is used as entity route context and Lead queries are invalidated.
Test priority: P0

QA-REQ-044:
Question: QA-Q-044. How should preferred workspace view mode persist?
Answer: The preferred view mode is stored independently per secondary section/module; a user choosing Kanban for Leads must not force Kanban/invalid view into Applications, Reservations, Clients, or Catalogs. Explicit URL `?view=` still takes precedence on initial load and back/forward navigation.
Route surface: all routed workspaces with `?view=`
Domain surface: View representation consistency
UI surface: Switching sections restores that section's last valid view.
State/API/audit surface: Layout state persists per-section view preferences in localStorage and coerces invalid views to module-valid tabs.
Test priority: P1

QA-REQ-045:
Question: QA-Q-045. When can an ApplicationItem be marked ready for Reservation from the position dialog?
Answer: Only when type, quantity, shift count, planned date, both time boundaries, and address are filled. Source selection may remain `undecided` on Application stage and be chosen later in Reservation.
Route surface: /applications detail position dialog
Domain surface: ApplicationItem readiness
UI surface: Required booking fields are visibly marked with `*`; save remains disabled until they are complete.
State/API/audit surface: Create/update keeps `readyForReservation` tied to required booking fields; `sourcingType` is no longer a readiness blocker.
Test priority: P0

QA-REQ-046:
Question: QA-Q-046. How should Reservation support adding missing resources from inside the stage?
Answer: In Reservation resource selection, a user with directory write permission can create an EquipmentUnit for own equipment or a Subcontractor for contractor sourcing from the Reservation workspace; the created directory record is immediately assigned to the active Reservation.
Route surface: /reservations detail workspace
Domain surface: Reservation resource assignment and directory entities
UI surface: Own equipment and subcontractor blocks expose inline create actions in the stage context.
State/API/audit surface: Directory create endpoints persist the new record; Reservation update links the created id and advances internal stage (`unit_defined` or `subcontractor_selected`). Server RBAC remains authoritative.
Test priority: P0

QA-REQ-047:
Question: QA-Q-047. What should the sidebar bug report action do?
Answer: The old Draft action is removed. The Sidebar bug report action opens a form that stores a bug report in CRM with severity, route, description, steps, and expected result.
Route surface: global shell sidebar, /control/bug-reports
Domain surface: Support feedback registry for admin triage
UI surface: Sidebar footer button is "Сообщить о баге" and opens the bug form.
State/API/audit surface: `POST /api/v1/bug-reports` persists a bug report and writes activity log entry.
Test priority: P2

QA-REQ-049:
Question: QA-Q-049. How should admin process bug reports in Control?
Answer: In Control -> Bug reports, Admin can open the list, mark an open report as completed, and delete any report.
Route surface: /control/bug-reports
Domain surface: Admin support-triage operations on bug reports
UI surface: Bug report table provides row actions "Выполнено" and "Удалить".
State/API/audit surface: `GET /api/v1/bug-reports`, `POST /api/v1/bug-reports/:id/status`, and `DELETE /api/v1/bug-reports/:id` are admin-only and write activity entries.
Test priority: P1

QA-REQ-048:
Question: QA-Q-048. What is the shell brand accent?
Answer: Accent blue in primary shell/actions is replaced by the brand purple palette, and the header logo uses a black lowercase `к` on the Katet yellow background.
Route surface: global shell
Domain surface: None
UI surface: Header logo and accent controls use the brand palette consistently.
State/API/audit surface: No API state impact.
Test priority: P2

QA-REQ-050:
Question: QA-Q-050. What should happen when a Mango callback reaches CRM but fails auth or schema validation?
Answer: Do not create or update a Lead, but write a redacted failed IntegrationEvent for admin diagnostics.
Route surface: /api/v1/integrations/events/mango, /admin/integrations
Domain surface: Integration observability without bypassing Mango webhook authentication.
UI surface: Admin can see the failed Mango event and error reason in the integrations journal.
State/API/audit surface: Rejected Mango connector callbacks persist status `failed`, error details, redacted payload metadata, and no `relatedLeadId` when possible.
Test priority: P1

QA-REQ-051:
Question: QA-Q-051. Which Mango Office callback URL forms should CRM accept?
Answer: CRM should accept the direct connector URL and Mango Office typed event URL forms for call callbacks.
Route surface: /api/v1/integrations/events/mango, /api/v1/integrations/events/mango/events/call, /api/v1/integrations/events/call
Domain surface: Mango Office callback compatibility.
UI surface: Successful call callbacks appear as processed Mango events in the integrations journal and create/update Leads.
State/API/audit surface: Typed Mango event paths are normalized into `channel=mango` IntegrationEvent records using event identifiers for idempotency.
## 5. Open Questions

None for QA-Q-001..QA-Q-037 in this first interview pass.

If behavior changes later, add a new QA-Q item and then add/update corresponding QA-REQ entries.
