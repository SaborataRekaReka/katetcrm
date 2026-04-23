-- Replace full @@unique with TRUE partial unique indexes (WHERE is_active)
-- to allow multiple historical is_active=false rows per parent.

-- DropIndex
DROP INDEX "uniq_lead_active_application";

-- DropIndex
DROP INDEX "uniq_item_active_reservation";

-- CreatePartialUnique: одна активная заявка на лид
CREATE UNIQUE INDEX "uniq_lead_active_application"
  ON "applications"("lead_id")
  WHERE "is_active" = true;

-- CreatePartialUnique: одна активная бронь на позицию заявки
CREATE UNIQUE INDEX "uniq_item_active_reservation"
  ON "reservations"("application_item_id")
  WHERE "is_active" = true;
