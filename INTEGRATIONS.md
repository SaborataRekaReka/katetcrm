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

## 8. Mango call context

For `channel=mango` call events:

1. Ingestion should normalize call metadata (`direction`, `from`, `to`, `duration`, `status`).
2. If recording URL is provided, it should be preserved for operator timeline visibility.
3. Lead upsert remains dedup-safe by phone/company rules.
4. Successful ingest should add activity notes to linked Lead and active Application contexts.
5. Mango Office API connector callbacks are accepted at `/api/v1/integrations/events/mango` as signed form fields `vpbx_api_key`, `sign`, and `json`.
6. Auth or schema rejected Mango connector callbacks should be visible as redacted `failed` integration events when the request reaches the CRM endpoint.
7. Mango Office typed event paths are accepted for call callbacks: `/api/v1/integrations/events/mango/events/call` and `/api/v1/integrations/events/call`.
8. Admin can configure internal Mango extension -> CRM manager routing rules from `/admin/integrations`; inbound call ingest applies matching rules to Lead and active Application responsibility while preserving IntegrationEvent idempotency.

## 8.1 Site lead distribution

For `channel=site` lead events:

1. Admin can configure a manager queue from `/admin/integrations`.
2. New site leads are assigned round-robin across active configured managers.
3. Duplicate site leads preserve the existing Lead manager by default.
4. If no active queue manager can be selected, CRM may use the configured fallback manager.
5. Routing settings and the queue cursor are stored in `SystemConfig` under a versioned key.

## 9. Dedup strategy

Levels:

1. Event-level dedup (idempotency key).
2. Domain-level dedup (phone/company lead/client checks).

Behavior:

- Mark duplicate as warning path.
- Do not hard-block manager flow by default.

## 10. Failure handling

Failure classes:

1. Validation failure (bad payload).
2. Business-rule failure (domain invariant violation).
3. Transient infrastructure failure.
4. Unknown/internal failure.

Handling:

1. Record class and reason in IntegrationEvent.
2. Surface actionable failure states to admin/support.
3. Support safe replay for replayable classes.
