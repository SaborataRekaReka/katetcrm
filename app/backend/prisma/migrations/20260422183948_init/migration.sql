-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'manager');

-- CreateEnum
CREATE TYPE "SourceChannel" AS ENUM ('site', 'mango', 'telegram', 'max', 'manual', 'other');

-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('lead', 'application', 'reservation', 'departure', 'completed', 'unqualified');

-- CreateEnum
CREATE TYPE "SourcingType" AS ENUM ('own', 'subcontractor', 'undecided');

-- CreateEnum
CREATE TYPE "ReservationInternalStage" AS ENUM ('needs_source_selection', 'searching_own_equipment', 'searching_subcontractor', 'subcontractor_selected', 'type_reserved', 'unit_defined', 'ready_for_departure', 'released');

-- CreateEnum
CREATE TYPE "SubcontractorConfirmationStatus" AS ENUM ('not_requested', 'requested', 'confirmed', 'declined', 'no_response');

-- CreateEnum
CREATE TYPE "EquipmentUnitStatus" AS ENUM ('active', 'inactive', 'archived');

-- CreateEnum
CREATE TYPE "SubcontractorStatus" AS ENUM ('active', 'inactive', 'archived');

-- CreateEnum
CREATE TYPE "DepartureStatus" AS ENUM ('scheduled', 'in_progress', 'done', 'overdue');

-- CreateEnum
CREATE TYPE "CompletionOutcome" AS ENUM ('completed', 'unqualified');

-- CreateEnum
CREATE TYPE "IntegrationChannel" AS ENUM ('site', 'mango', 'telegram', 'max');

-- CreateEnum
CREATE TYPE "IntegrationEventStatus" AS ENUM ('received', 'processed', 'failed', 'duplicate');

-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('created', 'updated', 'stage_changed', 'reservation_set', 'reservation_released', 'completed', 'unqualified', 'imported', 'note_added');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'manager',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT NOT NULL,
    "phone_normalized" TEXT NOT NULL,
    "company_normalized" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "favorite_equipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "stage" "PipelineStage" NOT NULL DEFAULT 'lead',
    "source" "SourceChannel" NOT NULL DEFAULT 'manual',
    "source_label" TEXT,
    "client_id" TEXT,
    "contact_name" TEXT NOT NULL,
    "contact_company" TEXT,
    "contact_phone" TEXT NOT NULL,
    "phone_normalized" TEXT NOT NULL,
    "equipment_type_hint" TEXT,
    "requested_date" TIMESTAMP(3),
    "time_window" TEXT,
    "address" TEXT,
    "comment" TEXT,
    "manager_id" TEXT,
    "is_duplicate" BOOLEAN NOT NULL DEFAULT false,
    "is_urgent" BOOLEAN NOT NULL DEFAULT false,
    "is_stale" BOOLEAN NOT NULL DEFAULT false,
    "has_no_contact" BOOLEAN NOT NULL DEFAULT false,
    "incomplete_data" BOOLEAN NOT NULL DEFAULT false,
    "unqualified_reason" TEXT,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "stage" "PipelineStage" NOT NULL DEFAULT 'application',
    "lead_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "responsible_manager_id" TEXT,
    "requested_date" TIMESTAMP(3),
    "requested_time_from" TEXT,
    "requested_time_to" TEXT,
    "address" TEXT,
    "comment" TEXT,
    "is_urgent" BOOLEAN NOT NULL DEFAULT false,
    "delivery_mode" TEXT,
    "night_work" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "cancelled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_items" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "equipment_type_id" TEXT,
    "equipment_type_label" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "shift_count" INTEGER NOT NULL DEFAULT 1,
    "overtime_hours" INTEGER,
    "downtime_hours" INTEGER,
    "planned_date" TIMESTAMP(3),
    "planned_time_from" TEXT,
    "planned_time_to" TEXT,
    "address" TEXT,
    "comment" TEXT,
    "sourcing_type" "SourcingType" NOT NULL DEFAULT 'undecided',
    "price_per_shift" DECIMAL(12,2),
    "delivery_price" DECIMAL(12,2),
    "surcharge" DECIMAL(12,2),
    "ready_for_reservation" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "application_item_id" TEXT NOT NULL,
    "sourcing_type" "SourcingType" NOT NULL,
    "internal_stage" "ReservationInternalStage" NOT NULL DEFAULT 'needs_source_selection',
    "equipment_type_id" TEXT,
    "equipment_unit_id" TEXT,
    "subcontractor_id" TEXT,
    "subcontractor_confirmation" "SubcontractorConfirmationStatus" NOT NULL DEFAULT 'not_requested',
    "promised_model_or_unit" TEXT,
    "subcontractor_note" TEXT,
    "planned_start" TIMESTAMP(3) NOT NULL,
    "planned_end" TIMESTAMP(3) NOT NULL,
    "has_conflict_warning" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "released_at" TIMESTAMP(3),
    "released_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_units" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "equipment_type_id" TEXT NOT NULL,
    "year" INTEGER,
    "plate_number" TEXT,
    "notes" TEXT,
    "status" "EquipmentUnitStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcontractors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialization" TEXT,
    "region" TEXT,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "notes" TEXT,
    "status" "SubcontractorStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcontractors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departures" (
    "id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "status" "DepartureStatus" NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "completions" (
    "id" TEXT NOT NULL,
    "departure_id" TEXT NOT NULL,
    "outcome" "CompletionOutcome" NOT NULL,
    "reason" TEXT,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_log" (
    "id" TEXT NOT NULL,
    "action" "ActivityAction" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "payload" JSONB,
    "actor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_events" (
    "id" TEXT NOT NULL,
    "channel" "IntegrationChannel" NOT NULL,
    "external_id" TEXT,
    "payload" JSONB NOT NULL,
    "status" "IntegrationEventStatus" NOT NULL DEFAULT 'received',
    "error_message" TEXT,
    "related_lead_id" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "integration_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "clients_phone_normalized_idx" ON "clients"("phone_normalized");

-- CreateIndex
CREATE INDEX "clients_company_normalized_idx" ON "clients"("company_normalized");

-- CreateIndex
CREATE INDEX "leads_stage_idx" ON "leads"("stage");

-- CreateIndex
CREATE INDEX "leads_manager_id_idx" ON "leads"("manager_id");

-- CreateIndex
CREATE INDEX "leads_phone_normalized_idx" ON "leads"("phone_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "applications_number_key" ON "applications"("number");

-- CreateIndex
CREATE INDEX "applications_lead_id_idx" ON "applications"("lead_id");

-- CreateIndex
CREATE INDEX "applications_stage_idx" ON "applications"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_lead_active_application" ON "applications"("lead_id", "is_active");

-- CreateIndex
CREATE INDEX "application_items_application_id_idx" ON "application_items"("application_id");

-- CreateIndex
CREATE INDEX "reservations_application_item_id_idx" ON "reservations"("application_item_id");

-- CreateIndex
CREATE INDEX "reservations_equipment_unit_id_idx" ON "reservations"("equipment_unit_id");

-- CreateIndex
CREATE INDEX "reservations_subcontractor_id_idx" ON "reservations"("subcontractor_id");

-- CreateIndex
CREATE INDEX "reservations_planned_start_planned_end_idx" ON "reservations"("planned_start", "planned_end");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_item_active_reservation" ON "reservations"("application_item_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_categories_name_key" ON "equipment_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_types_name_key" ON "equipment_types"("name");

-- CreateIndex
CREATE INDEX "equipment_units_equipment_type_id_idx" ON "equipment_units"("equipment_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "subcontractors_name_key" ON "subcontractors"("name");

-- CreateIndex
CREATE INDEX "departures_reservation_id_idx" ON "departures"("reservation_id");

-- CreateIndex
CREATE INDEX "departures_scheduled_at_idx" ON "departures"("scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "completions_departure_id_key" ON "completions"("departure_id");

-- CreateIndex
CREATE INDEX "activity_log_entity_type_entity_id_idx" ON "activity_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "activity_log_created_at_idx" ON "activity_log"("created_at");

-- CreateIndex
CREATE INDEX "integration_events_status_idx" ON "integration_events"("status");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_channel_external_id" ON "integration_events"("channel", "external_id");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_responsible_manager_id_fkey" FOREIGN KEY ("responsible_manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_items" ADD CONSTRAINT "application_items_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_items" ADD CONSTRAINT "application_items_equipment_type_id_fkey" FOREIGN KEY ("equipment_type_id") REFERENCES "equipment_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_application_item_id_fkey" FOREIGN KEY ("application_item_id") REFERENCES "application_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_equipment_type_id_fkey" FOREIGN KEY ("equipment_type_id") REFERENCES "equipment_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_equipment_unit_id_fkey" FOREIGN KEY ("equipment_unit_id") REFERENCES "equipment_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_subcontractor_id_fkey" FOREIGN KEY ("subcontractor_id") REFERENCES "subcontractors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_types" ADD CONSTRAINT "equipment_types_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "equipment_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_units" ADD CONSTRAINT "equipment_units_equipment_type_id_fkey" FOREIGN KEY ("equipment_type_id") REFERENCES "equipment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departures" ADD CONSTRAINT "departures_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "completions" ADD CONSTRAINT "completions_departure_id_fkey" FOREIGN KEY ("departure_id") REFERENCES "departures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
