-- CreateEnum
CREATE TYPE "BugReportSeverity" AS ENUM ('low', 'normal', 'high', 'blocker');

-- CreateEnum
CREATE TYPE "BugReportStatus" AS ENUM ('open', 'resolved');

-- CreateTable
CREATE TABLE "bug_reports" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "steps" TEXT,
  "expected" TEXT,
  "route_path" TEXT,
  "severity" "BugReportSeverity" NOT NULL DEFAULT 'normal',
  "status" "BugReportStatus" NOT NULL DEFAULT 'open',
  "reporter_id" TEXT,
  "resolved_at" TIMESTAMP(3),
  "resolved_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "bug_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bug_reports_status_created_at_idx" ON "bug_reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "bug_reports_severity_idx" ON "bug_reports"("severity");

-- CreateIndex
CREATE INDEX "bug_reports_reporter_id_idx" ON "bug_reports"("reporter_id");

-- AddForeignKey
ALTER TABLE "bug_reports" ADD CONSTRAINT "bug_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_reports" ADD CONSTRAINT "bug_reports_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;