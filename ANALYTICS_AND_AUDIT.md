# ANALYTICS_AND_AUDIT

## 1. Purpose

This file defines mandatory MVP analytics and audit coverage.

## 2. Mandatory reports (MVP)

At minimum provide:

1. Lead processing speed.
2. Lead -> application conversion.
3. Lost/unqualified leads.
4. Stale/hanging leads.

Optional early extensions (if low effort):

1. Reservations with conflicts.
2. Ready-for-departure backlog.
3. Manager workload snapshot.

## 3. Audit log coverage

Audit log must cover critical operations:

1. Create/edit key entities.
2. Funnel stage transitions.
3. Reservation set/release.
4. Completion/unqualified actions.
5. Import execution.
6. Critical permission/admin changes.

## 4. Before/after expectations

For critical updates, store:

1. Before state snapshot (or changed fields diff).
2. After state snapshot.
3. Actor and timestamp.
4. Entity and action type.

## 5. Entity and event taxonomy

Entity types (minimum):

1. lead
2. application
3. application_item
4. reservation
5. departure
6. client
7. import
8. integration_event
9. permission/user

Event kinds (minimum):

1. created
2. updated
3. stage_changed
4. reservation_created
5. reservation_released
6. completed
7. unqualified
8. imported
9. replayed

## 6. Baseline KPI set

1. Time-to-first-contact.
2. Time lead -> application.
3. Conversion rate lead -> application.
4. Conversion rate application -> reservation.
5. Reservation conflict frequency.
6. Share of stale leads.

## 7. Logging requirements by action

Must always log:

1. Who performed the action.
2. When it happened.
3. What changed.
4. Which entity was affected.
5. Why/metadata where relevant (reason/comment/source).

## 8. Data quality checks for analytics

1. Enforce stable stage enums.
2. Preserve event timestamps in UTC or consistent timezone strategy.
3. Track missing critical fields as quality metric.
4. Validate pipeline from operational events to analytics datasets.
