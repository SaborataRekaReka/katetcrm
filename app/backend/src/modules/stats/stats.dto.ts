import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

const REPORT_PERIOD_DAYS = [7, 30] as const;
const ANALYTICS_VIEW_IDS = [
  'view-stale-leads',
  'view-lost-leads',
  'view-active-reservations',
  'view-manager-load',
] as const;

export type StatsAnalyticsViewId = (typeof ANALYTICS_VIEW_IDS)[number];

export class StatsReportsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn(REPORT_PERIOD_DAYS)
  periodDays?: 7 | 30;
}

export class StatsAnalyticsQueryDto {
  @IsIn(ANALYTICS_VIEW_IDS)
  viewId!: StatsAnalyticsViewId;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  sampleTake?: number;
}
