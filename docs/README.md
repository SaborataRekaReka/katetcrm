# Documentation Map

This map defines which markdown files are stable source of truth for AI work and which files are operational snapshots.

## Stable AI Reading Order

Read these first for planning and implementation decisions:

1. [AGENTS.md](../AGENTS.md) - execution rules, invariants, validation, final report format.
2. [PRODUCT.md](../PRODUCT.md) - MVP scope, product process, hard business rules.
3. [DOMAIN_MODEL.md](../DOMAIN_MODEL.md) - entity boundaries, statuses, lifecycle invariants.
4. [ARCHITECTURE.md](../ARCHITECTURE.md) - current architecture and target direction.
5. [ROUTES_AND_VIEWS.md](../ROUTES_AND_VIEWS.md) - route/state/view/detail-open contracts.
6. [NAVIGATION_MODEL.md](../NAVIGATION_MODEL.md) - primary/secondary navigation and role visibility.
7. [FRONTEND_GUIDELINES.md](../FRONTEND_GUIDELINES.md) - frontend shell, views, detail, and API UI rules.
8. [API_CONTRACTS_OVERVIEW.md](../API_CONTRACTS_OVERVIEW.md) - versioned API contract overlay.
9. [RBAC_AND_PERMISSIONS.md](../RBAC_AND_PERMISSIONS.md) - role and permission rules.
10. [TESTING_STRATEGY.md](../TESTING_STRATEGY.md) - current rebuilt validation model.

## Requirement And Test Truth

- [QA_REQUIREMENTS.md](../QA_REQUIREMENTS.md): source of truth for new tests and product-owner-confirmed expected behavior.
- [API_CONTRACT_TEST_PLAN.md](./API_CONTRACT_TEST_PLAN.md): API contract matrix aligned to QA-REQ ids.
- [INTEGRATION_INVARIANT_CHECKLIST.md](./INTEGRATION_INVARIANT_CHECKLIST.md): backend invariant matrix.
- [E2E_GWT_SCENARIOS.md](./E2E_GWT_SCENARIOS.md): browser Given-When-Then scenario set.
- [BUTTON_COVERAGE_MATRIX.md](./BUTTON_COVERAGE_MATRIX.md): executable registry for high-risk action buttons.

## Operational Status Snapshots

Use these for current status and gaps, but verify against code/config before treating them as implementation facts:

- [IMPLEMENTATION_ROADMAP.md](../IMPLEMENTATION_ROADMAP.md): delivery status and next priorities.
- [FRONTEND_API_WIRING.md](../FRONTEND_API_WIRING.md): frontend API wiring status.
- [TEST_EXECUTION_REPORT.md](./TEST_EXECUTION_REPORT.md): run log, bugs found during testing, latest coverage snapshot.
- [IMPORT_AND_MIGRATION.md](../IMPORT_AND_MIGRATION.md): current import scope and migration rules.
- [tz-final.md](./tz-final.md): consolidated TZ baseline; current repo state sections must not override root stable docs or code reality.

## Agent Operations

- [AGENT_WORKFLOW.md](./AGENT_WORKFLOW.md): multi-agent development workflow.
- [AGENT_TASK_TEMPLATE.md](./AGENT_TASK_TEMPLATE.md): standard task packet for delegated agent work.
- [OWNERSHIP.md](../OWNERSHIP.md): default file ownership for parallel work.
- [../.github/copilot-instructions.md](../.github/copilot-instructions.md) and [../.github/agents/](../.github/agents/): thin wrappers for non-Codex agents; root `AGENTS.md` wins on conflict.

## Supporting Reference Docs

- [INTEGRATIONS.md](../INTEGRATIONS.md)
- [ANALYTICS_AND_AUDIT.md](../ANALYTICS_AND_AUDIT.md)
- [WORKFLOWS.md](../WORKFLOWS.md)
- [KNOWN_DECISIONS.md](../KNOWN_DECISIONS.md)
- [ANTI_PATTERNS.md](../ANTI_PATTERNS.md)
- [DESIGN_SYSTEM_NOTES.md](../DESIGN_SYSTEM_NOTES.md)
- [DETAIL_VIEWS.md](../DETAIL_VIEWS.md)
- [BUSINESS_CONTEXT.md](../BUSINESS_CONTEXT.md)
- [CONTRACT_DIFF.md](../CONTRACT_DIFF.md) - historical contract baseline with partial staleness notes; do not treat as sole source of truth.

## Archived Docs

Historical session logs and one-off research notes are moved to [archive/](./archive/README.md).
Do not use archived files as active requirements unless explicitly requested.
