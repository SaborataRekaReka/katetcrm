ALTER TYPE "PipelineStage" ADD VALUE IF NOT EXISTS 'marketing_qualified' AFTER 'application';

CREATE TABLE "lead_attributions" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "integration_event_id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "metrika_client_id" TEXT,
    "yclid" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_content" TEXT,
    "utm_term" TEXT,
    "utm_tags" JSONB,
    "first_landing_page" TEXT,
    "referrer" TEXT,
    "captured_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_attributions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "metrika_conversions" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "next_attempt_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "last_attempt_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "metrika_client_id" TEXT,
    "yclid" TEXT,
    "upload_id" TEXT,
    "last_error_code" TEXT,
    "last_error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metrika_conversions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lead_attributions_integration_event_id_key"
ON "lead_attributions"("integration_event_id");
CREATE INDEX "lead_attributions_lead_id_captured_at_idx"
ON "lead_attributions"("lead_id", "captured_at");
CREATE INDEX "lead_attributions_submission_id_idx"
ON "lead_attributions"("submission_id");
CREATE INDEX "lead_attributions_metrika_client_id_idx"
ON "lead_attributions"("metrika_client_id");
CREATE INDEX "lead_attributions_yclid_idx"
ON "lead_attributions"("yclid");

CREATE UNIQUE INDEX "metrika_conversions_lead_id_target_key"
ON "metrika_conversions"("lead_id", "target");
CREATE INDEX "metrika_conversions_status_next_attempt_at_idx"
ON "metrika_conversions"("status", "next_attempt_at");

ALTER TABLE "lead_attributions"
ADD CONSTRAINT "lead_attributions_lead_id_fkey"
FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "metrika_conversions"
ADD CONSTRAINT "metrika_conversions_lead_id_fkey"
FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
