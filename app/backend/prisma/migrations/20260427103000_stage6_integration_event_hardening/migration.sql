-- Stage 6: integration event reliability hardening

-- Extend lifecycle with explicit replayed state.
ALTER TYPE "IntegrationEventStatus" ADD VALUE IF NOT EXISTS 'replayed';

-- Add idempotency and retry/replay metadata.
ALTER TABLE "integration_events"
  ADD COLUMN "idempotency_key" TEXT,
  ADD COLUMN "correlation_id" TEXT,
  ADD COLUMN "payload_summary" JSONB,
  ADD COLUMN "retry_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "error_code" TEXT,
  ADD COLUMN "error_class" TEXT,
  ADD COLUMN "replayed_at" TIMESTAMP(3);

-- Backfill deterministic key for existing records before NOT NULL + unique constraints.
UPDATE "integration_events"
SET "idempotency_key" = concat("channel"::text, ':', COALESCE("external_id", "id"))
WHERE "idempotency_key" IS NULL;

ALTER TABLE "integration_events"
  ALTER COLUMN "idempotency_key" SET NOT NULL;

CREATE UNIQUE INDEX "integration_events_idempotency_key_key"
  ON "integration_events"("idempotency_key");

CREATE INDEX "integration_events_channel_received_at_idx"
  ON "integration_events"("channel", "received_at");

CREATE INDEX "integration_events_retry_count_idx"
  ON "integration_events"("retry_count");
