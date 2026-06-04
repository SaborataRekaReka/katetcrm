/**
 * One-off, non-destructive backfill for historical Mango call recordings.
 *
 * Re-derives the recording URL from each stored Mango event's entry_id using
 * the same proven formula as live ingest, then propagates it onto every related
 * activity in the call group (including the lead a manager actually opens).
 *
 * It NEVER merges, deletes, or reassigns leads. Only missing recording URLs are
 * filled in on existing activity_log rows.
 *
 * Usage (run with the production DATABASE_URL and Mango env vars set):
 *   npm --prefix app/backend run backfill:mango-recordings -- --dry-run
 *   npm --prefix app/backend run backfill:mango-recordings
 *
 * Flags:
 *   --dry-run        Report what would change without writing.
 *   --limit <n>      Cap the number of scanned Mango events (default 10000).
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { IntegrationsService } from '../src/modules/integrations/integrations.service';

function parseArgs(argv: string[]): { dryRun: boolean; limit?: number } {
  const dryRun = argv.includes('--dry-run');
  let limit: number | undefined;
  const limitIndex = argv.indexOf('--limit');
  if (limitIndex !== -1) {
    const raw = argv[limitIndex + 1];
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      limit = Math.floor(parsed);
    }
  }
  return { dryRun, limit };
}

async function main(): Promise<void> {
  const logger = new Logger('BackfillMangoRecordings');
  const { dryRun, limit } = parseArgs(process.argv.slice(2));

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const integrations = app.get(IntegrationsService);
    logger.log(
      `Starting Mango recording backfill (dryRun=${dryRun}, limit=${limit ?? 'default'})`,
    );

    const report = await integrations.backfillMissingMangoRecordings({ dryRun, limit });

    logger.log('Backfill complete:');
    logger.log(`  scannedEvents:        ${report.scannedEvents}`);
    logger.log(`  answeredCalls:        ${report.answeredCalls}`);
    logger.log(`  groupsWithInferredUrl: ${report.groupsWithInferredUrl}`);
    logger.log(`  activitiesUpdated:    ${report.activitiesUpdated}`);
    if (report.samples.length > 0) {
      logger.log('  samples:');
      for (const sample of report.samples) {
        logger.log(
          `    event=${sample.eventId} lead=${sample.leadId ?? '-'} group=${sample.group ?? '-'} url=${sample.recordingUrl}`,
        );
      }
    }
    if (dryRun) {
      logger.log('Dry run: no rows were modified.');
    }
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Mango recording backfill failed:', error);
  process.exit(1);
});
