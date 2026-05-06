# RBAC_AND_PERMISSIONS

## 1. Roles (MVP)

Supported roles:

1. `Admin`
2. `Manager`

No dedicated dispatcher role in MVP.

## 2. Capability model

### 2.1 Admin

Admin can:

1. Access all domains, including admin modules.
2. Manage users/permissions/configuration.
3. Run imports and monitor integration/audit modules.
4. View all managers' data.

### 2.2 Manager

Manager can:

1. Work daily operational flow (lead -> application -> reservation -> departure -> completion).
2. Use board/list/table and detail workspaces.
3. Create and process records within allowed visibility scope.

Manager cannot:

1. Access admin-only modules (imports/integrations/settings/users/permissions) unless explicitly granted in future policy.

## 3. UI visibility rules

1. Admin-only sections must be hidden for manager in navigation.
2. Hidden UI is convenience only, not security.
3. Route guards and API checks must enforce same policy.

## 4. Backend validation requirements

Backend must validate regardless of frontend state:

1. Role access for every protected endpoint.
2. Record scope access (own vs all where applicable).
3. Transition rights for critical workflow actions.
4. Mutation rights for directories/admin modules.

## 5. Critical actions requiring confirmation

At minimum require explicit confirmation for:

1. Marking order as completed/unqualified.
2. Releasing reservation.
3. Deleting critical records (if deletion is allowed by policy).
4. High-impact import execution.

## 6. Admin-only areas (MVP)

Admin-only modules:

1. Imports management.
2. Integrations journal and retry/replay operations.
3. Global settings.
4. User management.
5. Permission management.

## 7. Permission consistency checklist

Before release:

1. Nav visibility matches backend policy.
2. Forbidden API calls return 403.
3. Direct deep-link attempts are blocked server-side.
4. Audit captures permission-denied critical attempts where required.

## 8. Automated enforcement status

Testing reset 05.05.2026 removed previous automated RBAC smoke checks and their results.

Current rebuilt RBAC coverage is based on `QA_REQUIREMENTS.md`:

1. API contract tests cover admin-only deny behavior for manager (`403` policy).
2. Browser E2E covers manager navigation visibility, direct admin route permission-denied UX, and happy-path manager actions.
3. The current run status is tracked in `docs/TEST_EXECUTION_REPORT.md`.
