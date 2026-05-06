# E2E Given-When-Then Scenarios

## Purpose

This document defines browser-level scenarios for the first rebuilt E2E wave.

Source of truth:
- [QA_REQUIREMENTS.md](../QA_REQUIREMENTS.md)
- [ROUTES_AND_VIEWS.md](../ROUTES_AND_VIEWS.md)

## Scenario Set

### E2E-001 Lead create opens detail

Links: QA-REQ-001, 003, 004

Given:
- Manager is authenticated.
- Manager is on /leads.

When:
- Manager creates a lead with contactName and contactPhone.

Then:
- Lead is created successfully.
- Created lead detail workspace opens immediately.

### E2E-002 Duplicate warning does not block

Links: QA-REQ-002

Given:
- Existing lead or client has matching phone or company.

When:
- Manager creates another lead with the same value.

Then:
- UI shows duplicate warning semantics.
- Save is still allowed and record is created.

### E2E-003 Lead to Application conversion

Links: QA-REQ-005, 006, 007, 008

Given:
- Lead exists with no active application.

When:
- Manager triggers lead to application conversion action.

Then:
- Application workspace opens in context.
- Client is auto-created or auto-attached.
- Attempt to create a second active application for same lead is blocked.

### E2E-004 Multi-item readiness and source policy

Links: QA-REQ-009, 010, 011, 012

Given:
- Application context is open.

When:
- Manager creates at least two application items.
- Manager fills required readiness fields.
- Manager sets source to own or subcontractor.

Then:
- Each item reaches ready state.
- Ready action button is enabled.
- Undecided source does not pass happy-path-ready state.

### E2E-005 Reservation conflict behavior

Links: QA-REQ-013, 015, 016, 017

Given:
- Existing active reservation overlaps selected interval.

When:
- Manager creates a new reservation in overlapping interval.

Then:
- Conflict warning is visible.
- Save is allowed.
- Reservation remains usable for next steps.

### E2E-006 Reservation to Departure requires unit

Links: QA-REQ-014, 018, 020

Given:
- Reservation exists and is otherwise ready.

When:
- Manager tries transition without unit.
- Manager selects unit and clicks Perevesti v vyezd.

Then:
- Transition without unit is prevented.
- Transition after unit selection succeeds.
- Departure workspace opens.

### E2E-007 Departure statuses and completion action

Links: QA-REQ-019, 021

Given:
- Departure exists.

When:
- Manager progresses status sequence to arrived.
- Manager clicks Vypolnen.

Then:
- Departure moves to completed.
- Completion workspace context is available.

### E2E-008 Completion cascade and audit visibility

Links: QA-REQ-022, 023, 024

Given:
- Departure is completed through UI action.

When:
- User inspects linked records and activity timeline.

Then:
- Lead is completed.
- Application is completed or inactive.
- Reservation is released.
- Completion record exists.
- Activity timeline includes required events and actor.

### E2E-009 Unqualified branch behavior

Links: QA-REQ-025, 026, 027

Given:
- Record is on an allowed stage for unqualified action.

When:
- Manager triggers unqualified flow.

Then:
- Reason is required for unqualified.
- Required release and deactivate cascade is applied.

### E2E-010 Route and state persistence with back-forward

Links: QA-REQ-028, 029, 030, 031

Given:
- User is in canonical module route with chosen view mode and open detail workspace.

When:
- User navigates to another module and then uses browser back and forward.

Then:
- Pathname is restored.
- View mode is restored.
- Entity query context is restored.
- Detail workspace open context is restored.

### E2E-011 Manager RBAC visibility and forbidden API semantics

Links: QA-REQ-032, 033, 034, 035

Given:
- Manager session is active.

When:
- Manager navigates through Sales and Ops happy path actions.
- Manager attempts access to admin-only modules or operations.

Then:
- Manager can execute happy path actions.
- Admin domain and admin modules are hidden in navigation.
- Forbidden operations resolve to explicit forbidden behavior aligned with 403 policy.

## Minimum P0 Browser Gate

P0 browser gate is complete when E2E-001 through E2E-008 and E2E-011 are green.
