# Integration Invariant Checklist

## Purpose

This checklist defines backend integration checks for domain invariants and cross-entity side effects.

Source of truth:
- [QA_REQUIREMENTS.md](../QA_REQUIREMENTS.md)
- [DOMAIN_MODEL.md](../DOMAIN_MODEL.md)
- [API_CONTRACTS_OVERVIEW.md](../API_CONTRACTS_OVERVIEW.md)

## How To Use

- Run checks against an isolated test database.
- Use deterministic fixture setup per case.
- Mark each item Pass only if all listed validations succeed.

## Checklist

| ID | QA-REQ | Invariant | Required validation | Priority |
|---|---|---|---|---|
| INT-001 | 008 | One active Application per Lead | Creating a second active application for same lead is rejected, original active record remains unchanged. | P0 |
| INT-002 | 009, 010 | Multi-item application support | Application persists and returns at least two items in happy path fixture. | P0 |
| INT-003 | 009, 011, 012 | Readiness derivation for ApplicationItem | Ready state is true only when required fields exist and source is not undecided. | P0 |
| INT-004 | 015, 016, 017 | Conflict is warning-only | Overlap reservation persists with conflict flag and does not hard fail create mutation. | P0 |
| INT-005 | 014, 018, 020 | Unit required before departure transition | Transition without unit fails by validation. Transition with unit succeeds and creates departure context. | P0 |
| INT-006 | 019 | Departure lifecycle integrity | Allowed statuses can be persisted through expected sequence without illegal jumps. | P0 |
| INT-007 | 021, 022, 023 | Completion cascade | Completion sets departure completed, lead completed, application completed or inactive, reservation released, and completion record exists. | P0 |
| INT-008 | 024 | Audit and activity completeness | Completion flow writes required events including actor identity and linked entity references. | P0 |
| INT-009 | 025, 026, 027 | Unqualified and cancelled cascade | Unqualified allowed only on approved stages, reason required for unqualified, and required release or deactivate side effects applied. | P1 |
| INT-010 | 033, 035 | Server-side RBAC deny | Manager requests to admin-only operations return forbidden with no side effects. | P0 |

## Data Verification Notes

For each passing item, verify when relevant:

1. Entity state fields after mutation.
2. Linked entity references are intact.
3. Terminal transitions do not leave active reservations behind.
4. Activity or audit entries include actor and action type.
5. Forbidden paths do not create or mutate records.

## Minimum P0 Gate For Integration Layer

P0 integration layer can be considered ready when:

1. INT-001 through INT-008 and INT-010 are green.
2. Each check is traceable to QA-REQ ids.
3. Failures provide actionable output: invariant id, entity ids, expected vs actual state.
