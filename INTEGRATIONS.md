# INTEGRATIONS

## 1. Purpose

This file defines integration model and reliability rules for MVP channels.

## 2. Mandatory integrations (MVP)

Inbound channels:

1. Site
2. Mango
3. Telegram
4. MAX

Expected MVP result:

- Each channel can create or update lead context through controlled ingestion.

## 3. Ingestion model

Common ingestion pipeline:

1. Receive event payload.
2. Validate schema and required fields.
3. Compute idempotency identity.
4. Resolve duplicate lead/client hints.
5. Execute domain use-case.
6. Write IntegrationEvent log with status.

Rule:

- Ingestion writes through domain services, not direct table bypass.

## 4. Idempotency

Requirements:

1. Every inbound event must have stable dedup identity.
2. Repeated event with same identity must be safe.
3. Replay should not create duplicate business records.

Examples of identity components:

- Source system + external event id.
- Source system + message timestamp + sender identifier (fallback pattern).

## 5. Retry and replay

Retry policy:

1. Retry transient failures with bounded attempts.
2. Persist retry count and last error.
3. Move to failed state after limit.

Replay policy:

1. Failed events are replayable by admin/support flow.
2. Replay action is auditable.
3. Replay uses same idempotency key.

## 6. IntegrationEvent lifecycle

Recommended statuses:

1. `received`
2. `processed`
3. `failed`
4. `replayed`

Mandatory metadata:

- source system
- external id
- received at
- processed at
- retry count
- error code/message if failed

## 7. Payload logging

Rules:

1. Keep raw payload snapshot for troubleshooting.
2. Keep normalized payload summary for quick UI inspection.
3. Protect sensitive fields according to security policy.
4. Keep correlation ids for cross-system tracing.

## 8. Dedup strategy

Levels:

1. Event-level dedup (idempotency key).
2. Domain-level dedup (phone/company lead/client checks).

Behavior:

- Mark duplicate as warning path.
- Do not hard-block manager flow by default.

## 9. Failure handling

Failure classes:

1. Validation failure (bad payload).
2. Business-rule failure (domain invariant violation).
3. Transient infrastructure failure.
4. Unknown/internal failure.

Handling:

1. Record class and reason in IntegrationEvent.
2. Surface actionable failure states to admin/support.
3. Support safe replay for replayable classes.
