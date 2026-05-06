# API Contract Test Plan

## Purpose

This plan defines the first API contract test wave after testing reset.

Source of truth:
- [QA_REQUIREMENTS.md](../QA_REQUIREMENTS.md)
- [API_CONTRACTS_OVERVIEW.md](../API_CONTRACTS_OVERVIEW.md)

Rule:
- Every test case must reference one or more QA-REQ ids.
- No assertions from removed smoke/e2e suites are reused.

## Scope (Wave P0)

- Auth and role context required for business flows.
- Lead -> Application -> Reservation -> Departure -> Completion happy path.
- Mandatory RBAC deny behavior for manager on admin-only APIs.

## Case Matrix

| Case ID | QA-REQ | Endpoint(s) | Contract assertions | Priority |
|---|---|---|---|---|
| APIC-001 | 003, 032, 033, 035 | POST /api/v1/auth/login, GET /api/v1/auth/me | Login succeeds for manager and admin credentials. Me payload contains role used by RBAC checks. | P0 |
| APIC-002 | 001, 003, 004 | POST /api/v1/leads, GET /api/v1/leads/:id | Lead create with minimal required fields succeeds. Response contains created id and role-allowed actor context. | P0 |
| APIC-003 | 002 | POST /api/v1/leads | Duplicate phone/company returns warning signal and does not hard fail create. | P0 |
| APIC-004 | 005, 006, 007, 008 | POST /api/v1/applications, GET /api/v1/applications/:id | Lead to application transition is relation-based. Client relation is present automatically. Second active application for same lead is rejected. | P0 |
| APIC-005 | 009, 010, 011, 012 | POST /api/v1/applications/:id/items, PATCH /api/v1/applications/:id/items/:itemId | Multi-item application supported. Item readiness derives only from required fields. Undecided source is not accepted in happy-path-ready state. | P0 |
| APIC-006 | 013, 015, 016, 017 | POST /api/v1/reservations, PATCH /api/v1/reservations/:id | Reservation supports own or subcontractor source. Conflict produces warning state and does not hard block save. | P0 |
| APIC-007 | 014, 018, 020 | POST /api/v1/departures, PATCH /api/v1/reservations/:id | Reservation to departure transition is manual. Unit is required before transition. | P0 |
| APIC-008 | 019 | PATCH /api/v1/departures/:id | Departure lifecycle statuses supported: scheduled, in_transit, arrived, completed, cancelled. | P0 |
| APIC-009 | 021, 022, 023, 024 | POST /api/v1/completions, GET /api/v1/activity/search | Completion action sets departure completed and triggers required cascade: lead completed, application completed or inactive, reservation released, completion record created, audit contains actor and required events. | P0 |
| APIC-010 | 025, 026, 027 | PATCH lead/application/reservation/departure terminal actions, POST /api/v1/reservations/:id/release | Unqualified allowed only on approved stages. Reason required only for unqualified. Required release and deactivate cascade applied. | P1 |
| APIC-011 | 033, 035 | GET or POST admin-only APIs under /api/v1/users, /api/v1/settings, /api/v1/imports, /api/v1/integrations/events | Manager receives forbidden on admin-only operations. Status code is 403. | P0 |
| APIC-012 | 028, 031 | GET /api/v1/navigation/deep-link | Canonical route target and linked id chain are deterministic for entity open context. | P1 |

## Assertion Template (per test)

Each API contract test should verify all of the following when applicable:

1. HTTP status and role behavior.
2. Response schema keys required by UI workflow.
3. Domain side effects on related entities.
4. Audit or activity side effects for critical transitions.
5. No contradictory side effects on forbidden paths.

## Execution Order

1. APIC-001 to establish auth role fixtures.
2. APIC-002 to APIC-009 as core happy path.
3. APIC-011 RBAC deny checks as blocking gate.
4. APIC-010 and APIC-012 as first extension wave.

## Exit Criteria For This Plan

P0 API contract wave is complete when:

1. APIC-001 through APIC-009 and APIC-011 are green.
2. Each case is traceable to QA-REQ ids.
3. Failure output clearly identifies endpoint, payload, and violated QA-REQ.
