# TESTING_STRATEGY

## 1. Purpose

This document defines the new testing strategy after the project testing reset of 05.05.2026.

The previous test suite, previous test commands, and previous test results are invalid for future quality decisions. They were removed because the project behavior changed and their expectations are no longer trusted.

## 2. Source of truth

[QA_REQUIREMENTS.md](QA_REQUIREMENTS.md) is the only accepted source of truth for new test expectations.

Rules:

1. Do not reuse assertions from deleted smoke scripts, deleted Playwright specs, old runbooks, or old result snapshots.
2. Do not cite previous green runs as evidence that behavior is correct.
3. If expected behavior is unclear, ask the product owner and record the answer in [QA_REQUIREMENTS.md](QA_REQUIREMENTS.md) before writing a test.
4. Product docs may provide context, but test expectations must be confirmed in [QA_REQUIREMENTS.md](QA_REQUIREMENTS.md).
5. Every new test must reference one or more requirement ids from [QA_REQUIREMENTS.md](QA_REQUIREMENTS.md).

## 3. Current baseline

There is intentionally no trusted automated test suite after the reset.

Allowed non-test validation while the new suite is being designed:

1. Backend TypeScript validation: `npm --prefix app/backend run typecheck`.
2. Backend build: `npm --prefix app/backend run build`.
3. Frontend build: `npm --prefix app/frontend run build`.

These commands only prove that the code compiles/builds. They do not prove business correctness.

## 4. New test creation order

Build the new suite from the domain happy path outward.

1. Domain happy path: Lead -> Application -> Reservation -> Departure -> Completed.
2. Domain negative path: Lead/Application/Departure -> Unqualified or Cancelled where confirmed.
3. Reservation behavior: source selection, unit/subcontractor assignment, conflict warning, release policy.
4. API contracts: request/response shape, validation errors, auth errors, and state transitions.
5. RBAC: admin/manager visibility, direct API access, direct route/deep-link attempts.
6. UI behavior: route/title/search/CTA/data consistency and board/list/table/detail semantics.
7. Integration/import behavior: only after the product owner confirms exact ingest/import expectations.
8. Regression and visual stability: responsive layout, overflow, dialogs, forms, and accessibility.

## 5. Requirement format

Each behavior in [QA_REQUIREMENTS.md](QA_REQUIREMENTS.md) must be testable and should include:

1. Requirement id.
2. User-facing intent.
3. Preconditions.
4. Action sequence.
5. Expected domain state.
6. Expected API response or persisted data when relevant.
7. Expected UI state when relevant.
8. Audit/activity expectation when relevant.
9. Open questions or explicit non-goals.

## 6. Test layers to create

### 6.1 Backend unit tests

Use for deterministic business rules that do not require a browser:

1. Stage transition rules.
2. Readiness derivation.
3. Conflict detection rules.
4. Mapper/projection behavior.
5. Validation and normalization helpers.

### 6.2 Backend integration tests

Use for database-backed invariants:

1. One active Application per Lead.
2. One active Reservation per ApplicationItem.
3. Reservation release cascade.
4. Completion/unqualified terminal behavior.
5. Audit/activity persistence.
6. Integration idempotency once confirmed.

### 6.3 API contract tests

Use for `/api/v1` behavior:

1. Authenticated and unauthenticated access.
2. Success payload shape.
3. Validation errors.
4. Permission errors.
5. State changes and returned linked ids.

### 6.4 Frontend unit/component tests

Use for UI logic without full browser journeys:

1. Route sync.
2. Navigation metadata.
3. API adapters.
4. React Query hook invalidation.
5. Dialog/form states.
6. Detail workspace state rendering.

### 6.5 Browser E2E tests

Use only after the corresponding [QA_REQUIREMENTS.md](QA_REQUIREMENTS.md) ids are confirmed:

1. Full happy path in the browser.
2. Critical negative path in the browser.
3. RBAC user journeys.
4. Route/back/forward/deep-link behavior.
5. Board/list/table/detail open behavior.
6. Import/integration operator journeys once confirmed.

## 7. Definition of done for a new test

A new test is acceptable only when:

1. It references a requirement id from [QA_REQUIREMENTS.md](QA_REQUIREMENTS.md).
2. Its data setup is explicit and repeatable.
3. It does not depend on deleted test output or old seeded assumptions unless those assumptions are reconfirmed.
4. It verifies domain state, not only UI text.
5. It is deterministic in local runs and CI.
6. It has clear failure output.

## 8. Release criteria after rebuild

Release criteria are suspended until the new suite exists.

The first new release gate should include, in order:

1. Typecheck/build commands.
2. New backend domain happy-path tests.
3. New API contract tests for the same path.
4. New browser happy-path test.
5. New RBAC tests for the touched route/domain/UI/state surface.

No release gate should include deleted smoke/e2e commands.
