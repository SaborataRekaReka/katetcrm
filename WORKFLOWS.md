# WORKFLOWS

## 1. Purpose

This file describes real operating workflows for Katet CRM MVP.
It is an execution map for developers, QA, and agents.

Workflow design rules:

1. Preserve funnel semantics.
2. Keep entity boundaries explicit.
3. Log critical transitions.
4. Use warning (not hard block) for reservation conflicts.

## 2. Lead intake

Trigger:

- Incoming request from site, Mango, Telegram, MAX, or manual entry.

Steps:

1. Capture source metadata.
2. Normalize phone/company.
3. Run duplicate check.
4. Create lead record.
5. Assign manager.

Outputs:

- Lead in `lead` stage.
- Audit entry for create action.
- IntegrationEvent entry if source is external.

## 3. Duplicate detection

Trigger:

- Lead create or contact/company update.

Rules:

1. Check phone and company collisions.
2. Mark as warning (`isDuplicate=true`), no hard stop.
3. Offer link to existing client/leads.

Outputs:

- Duplicate signal visible in board/list/table/detail.
- Audit entry for duplicate flag changes.

## 4. Lead -> Application

Trigger:

- Manager qualified lead after contact.

Steps:

1. Create application bound to lead.
2. Move lead/application context to `application` stage.
3. Copy relevant fields (client/contact/address/request baseline).

Invariants:

- One lead has one active application.

## 5. Multi-item application flow

Trigger:

- Application created or edited.

Steps:

1. Add one or more ApplicationItems.
2. Set equipment type/quantity/shifts/time window.
3. Set sourcing type per item (`own | subcontractor | undecided`).
4. Track item readiness (`readyForReservation`).

Outputs:

- Derived application readiness (`ready`, `partial`, `waiting_sourcing`, `no_data`).

## 6. Reservation flow

Trigger:

- Manager starts reservation from application item.

Steps:

1. Create reservation linked to ApplicationItem.
2. Set internal stage (`needs_source_selection` -> ... -> `ready_for_departure`).
3. Assign source and optional unit/subcontractor.
4. Keep conflict as warning.

Invariants:

- One active reservation per application item.

## 7. Source selection: own / subcontractor / undecided

Rules:

1. Source is mandatory before final readiness.
2. `undecided` is valid temporary state.
3. `subcontractor` path requires subcontractor selection before ready state.
4. `own` path may require explicit unit assignment depending on policy.

## 8. Unit selection

Trigger:

- Reservation must be converted to Departure.

Steps:

1. Select candidate unit.
2. Validate availability window.
3. Mark unit assignment in reservation.

Current rule:

- `POST /departures` requires selected `equipmentUnitId` for the reservation (`QA-REQ-014`).
- Subcontractor sourcing may carry subcontractor confirmation context, but Departure creation still requires a concrete unit in the current backend.

Conflict behavior:

- If overlap exists, keep warning and log conflict context.

## 9. Reservation -> Departure

Trigger:

- Reservation is ready for departure.

Steps:

1. User explicitly moves workflow to departure context.
2. Keep links to lead/application/reservation/client.
3. Track planned timing and operational status.

## 10. Completion / Unqualified

Trigger:

- Work finished or request disqualified/cancelled.

Rules:

1. Completed/unqualified releases active reservations.
2. Outcome reason should be captured where applicable.
3. Transition must be auditable.

## 11. Repeat order from client

Trigger:

- Manager starts new order from client card or historical order.

Steps:

1. Prefill known client and common parameters.
2. Create new lead/application context.
3. Keep clear link to source order for traceability.

## 12. Import flow

Trigger:

- CSV import requested.

Steps:

1. Upload file.
2. Map columns.
3. Preview rows and errors.
4. Run duplicate checks.
5. Execute import and write import log.

## 13. Integration event replay

Trigger:

- Failed ingestion or manual replay request.

Steps:

1. Select failed IntegrationEvent.
2. Re-run idempotent handler.
3. Record replay result and retries.

Rule:

- Replay must not create duplicate business records.
