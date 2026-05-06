# TESTING_STRATEGY

## 1. Purpose

This document defines the current testing strategy after the project testing reset of 05.05.2026 and the rebuilt test wave on 06.05.2026.

The old pre-reset smoke/e2e results remain invalid. The current suite is valid only where it is traceable to confirmed requirement ids in [QA_REQUIREMENTS.md](QA_REQUIREMENTS.md).

## 2. Source of truth

[QA_REQUIREMENTS.md](QA_REQUIREMENTS.md) is the accepted source of truth for test expectations.

Rules:

1. Do not reuse assertions from deleted smoke scripts, deleted Playwright specs, old runbooks, or old result snapshots.
2. Do not cite old green runs as evidence that behavior is correct.
3. If expected behavior is unclear, ask the product owner and record the answer in [QA_REQUIREMENTS.md](QA_REQUIREMENTS.md) before writing a test.
4. Product docs provide context, but test assertions must be confirmed in [QA_REQUIREMENTS.md](QA_REQUIREMENTS.md).
5. Every new or changed test must reference one or more requirement ids from [QA_REQUIREMENTS.md](QA_REQUIREMENTS.md).

## 3. Current validation baseline

Compile/build gate:

```bash
npm --prefix app/backend run typecheck
npm --prefix app/backend run build
npm --prefix app/frontend run build
```

Backend test gates:

```bash
npm --prefix app/backend run test:api-contract
npm --prefix app/backend run test:integration
npm --prefix app/backend run test:coverage
```

Frontend test gates:

```bash
npm --prefix app/frontend run test:coverage
npm --prefix app/frontend run e2e:smoke
npm --prefix app/frontend run e2e:gate
npm --prefix app/frontend run e2e:gate:full
```

Current status snapshot is recorded in [docs/TEST_EXECUTION_REPORT.md](docs/TEST_EXECUTION_REPORT.md).

## 4. Current suite map

### 4.1 Backend API contract

Location:

- `app/backend/test/api-contract/**`

Scope:

- Auth and role context.
- Lead -> Application -> Reservation -> Departure -> Completion happy path.
- RBAC deny behavior.
- Projection and deep-link contract coverage.

Plan:

- [docs/API_CONTRACT_TEST_PLAN.md](docs/API_CONTRACT_TEST_PLAN.md)

### 4.2 Backend integration

Location:

- `app/backend/test/integration/**`

Scope:

- One active Application per Lead.
- One active Reservation per ApplicationItem.
- ApplicationItem readiness.
- Reservation conflict warning.
- Departure unit prerequisite.
- Completion/unqualified cascade.
- Server-side RBAC deny.

Plan:

- [docs/INTEGRATION_INVARIANT_CHECKLIST.md](docs/INTEGRATION_INVARIANT_CHECKLIST.md)

### 4.3 Backend projection coverage

Location:

- `app/backend/test/api-contract/projections.coverage.spec.ts`

Command:

```bash
npm --prefix app/backend run test:coverage
```

Coverage threshold:

- 90% statements, branches, functions, lines for projection files configured in `app/backend/jest.coverage.config.cjs`.

### 4.4 Frontend adapter coverage

Location:

- `app/frontend/src/app/lib/__tests__/**`

Command:

```bash
npm --prefix app/frontend run test:coverage
```

Coverage threshold:

- 90% statements, branches, functions, lines for adapter files configured in `app/frontend/vitest.config.ts`.

### 4.5 Browser E2E

Location:

- `app/frontend/e2e/**`

Scenario plan:

- [docs/E2E_GWT_SCENARIOS.md](docs/E2E_GWT_SCENARIOS.md)

Button coverage:

- [docs/BUTTON_COVERAGE_MATRIX.md](docs/BUTTON_COVERAGE_MATRIX.md)

Gate commands:

```bash
npm --prefix app/frontend run e2e:smoke
npm --prefix app/frontend run e2e:gate
npm --prefix app/frontend run e2e:gate:full
```

Runtime guard:

- Current browser specs include shared guards for unexpected API request failures and unexpected `console.error`.
- Negative 403 cases must use explicit allowlists only for expected forbidden noise.

## 5. Test creation order

When adding new coverage, extend from the confirmed domain path outward:

1. Domain happy path: Lead -> Application -> Reservation -> Departure -> Completed.
2. Domain negative path: Lead/Application/Reservation/Departure -> Unqualified or Cancelled where confirmed.
3. Reservation behavior: source selection, unit/subcontractor assignment, conflict warning, release policy.
4. API contracts: request/response shape, validation errors, auth errors, and state transitions.
5. RBAC: admin/manager visibility, direct API access, direct route/deep-link attempts.
6. UI behavior: route/title/search/CTA/data consistency and board/list/table/detail semantics.
7. Integration/import behavior: only after the product owner confirms exact ingest/import expectations.
8. Regression and visual stability: responsive layout, overflow, dialogs, forms, and accessibility.

## 6. Definition of done for a new test

A new test is acceptable only when:

1. It references a requirement id from [QA_REQUIREMENTS.md](QA_REQUIREMENTS.md).
2. Its data setup is explicit and repeatable.
3. It does not depend on deleted test output or old seeded assumptions unless those assumptions are reconfirmed.
4. It verifies domain state, not only UI text.
5. It is deterministic in local runs and CI-like runs.
6. It has clear failure output.
7. It is included in the smallest relevant gate command.

## 7. Release criteria

For ordinary code changes, minimum release evidence is:

1. Backend typecheck/build.
2. Frontend build.
3. The smallest relevant rebuilt test gate for the touched surface.

Examples:

- Backend domain/API behavior: `test:api-contract`, `test:integration`, and `test:coverage` when projections are touched.
- Frontend adapters: `test:coverage`.
- Browser workflow, route, RBAC, or high-risk button behavior: `e2e:gate` or `e2e:gate:full`.
- Docs-only changes: markdown diff sanity plus compile gate only when docs changed commands/contracts or when repository policy requires it.

Do not use deleted pre-reset smoke/e2e commands as release evidence.
