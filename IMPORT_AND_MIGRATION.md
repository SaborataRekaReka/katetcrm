# IMPORT_AND_MIGRATION

## 1. Purpose

This file defines migration and import rules for MVP.

Current implementation status (28.04.2026):

1. Implemented API flow: `POST /api/v1/imports/preview`, `POST /api/v1/imports/run`, `GET /api/v1/imports/:importId/report`.
2. Import pipeline is role-gated (`admin`) and writes activity records.
3. Release smoke includes stage7 import verification with idempotent dataset generation.

## 2. What we migrate

Migration baseline:

1. All clients.
2. All contacts.
3. Active and relevant leads.

Relevant lead criteria (minimum):

- currently active in funnel, or
- recently active and needed for operations/repeat context.

## 3. What we do not migrate in MVP

1. Legacy closed archive beyond relevance window.
2. Out-of-scope historical technical artifacts with no operational value.
3. Unsupported objects requiring non-MVP modules.

## 4. Import formats

Supported:

1. CSV

Planned (not implemented yet):

1. CSV hardening: deterministic validation profiles and operational runbook

## 5. Import workflow

1. Send file payload + mapping to preview endpoint.
2. Validate rows and detect duplicates.
3. Review preview summary and issues.
4. Run import with selected duplicate policy.
5. Persist import run with counters and errors.
6. Read report by `importId`.

## 6. Mapping rules

1. Map source columns to canonical domain fields.
2. Keep source identifiers where available.
3. Keep source channel metadata when present.
4. Normalize phones and company names before dedup checks.

## 7. Preview requirements

Preview must show:

1. Total rows.
2. Valid rows.
3. Rows with validation errors.
4. Potential duplicates.
5. Field-level transformation results for critical fields.

## 8. Duplicate checks in import

At minimum check:

1. phone
2. company name
3. external source id (if provided)

Behavior:

- Flag duplicates clearly.
- Allow controlled continue path per policy.

## 9. Import log

Log should include:

1. Import id and actor.
2. File metadata.
3. Mapping snapshot.
4. Validation summary.
5. Created/updated/skipped/failed counters.
6. Error details and downloadable report.

## 10. Migration risks

Primary risks:

1. Dirty source data quality.
2. Phone/company normalization drift.
3. Duplicate explosion from inconsistent legacy formats.
4. Broken stage mapping from legacy statuses.

Mitigations:

1. Dry-run imports on samples.
2. Strict preview and validation reports.
3. Controlled rollout by batches.
4. Backout strategy for import batch failures.

## 11. Rules for active/relevant leads and clients

1. Preserve operationally active records first.
2. Preserve clients with repeat-order probability.
3. Keep links between migrated clients and active lead/application context.
4. Archive old closed noise outside MVP scope.
