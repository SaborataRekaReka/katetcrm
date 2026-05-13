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

## 2.3 User Access Lifecycle

1. `User.email` is the login identity. Admin must enter it when creating a user and may correct it later.
2. `User.isActive=true` means the account can log in; `false` blocks login and removes managers from assignment selectors.
3. MVP password recovery is admin reset: Admin sets a new temporary password in `/admin/users` and gives it to the employee manually.
4. Automatic password reset email is not enabled in MVP.
5. Admin-only capabilities (`catalogs.write`, `admin.*`) cannot be granted to Manager in the permissions matrix while the MVP role boundary remains admin-only.
6. Admin cannot deactivate or demote the current admin account, and the system must keep at least one active admin.

## 3. UI visibility rules

1. Admin-only sections must be hidden for manager in navigation.
2. Hidden UI is convenience only, not security.
3. Route guards and API checks must enforce same policy.

## 4. Backend validation requirements

Backend must validate regardless of frontend state:

1. Role access for every protected endpoint.
2. Capability access for admin-only endpoint groups (users, permissions, settings, imports, integrations, directory writes).
3. Record scope access (own vs all where applicable).
4. Transition rights for critical workflow actions.
5. Mutation rights for directories/admin modules.

Runtime policy details:

1. Role guard remains mandatory and is still the primary boundary (`admin` vs `manager`).
2. Capability matrix from `users/permissions-matrix` is enforced server-side on top of role checks.
3. Capability toggles are persisted in `system_config` key `admin.permissions_matrix.v1`.

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
