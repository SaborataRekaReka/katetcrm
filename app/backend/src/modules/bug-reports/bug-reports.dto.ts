import type { BugReportSeverity, BugReportStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const BUG_REPORT_STATUSES = ['open', 'resolved'] as const;
const BUG_REPORT_SEVERITIES = ['low', 'normal', 'high', 'blocker'] as const;

export class BugReportListQueryDto {
  @IsOptional()
  @IsIn(BUG_REPORT_STATUSES)
  status?: BugReportStatus;

  @IsOptional()
  @IsIn(BUG_REPORT_SEVERITIES)
  severity?: BugReportSeverity;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  query?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  take?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50_000)
  skip?: number;
}

export class CreateBugReportDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(6000)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  steps?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  expected?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  routePath?: string;

  @IsOptional()
  @IsIn(BUG_REPORT_SEVERITIES)
  severity?: BugReportSeverity;
}

export class UpdateBugReportStatusDto {
  @IsIn(BUG_REPORT_STATUSES)
  status!: BugReportStatus;
}

export interface BugReportView {
  id: string;
  title: string;
  description: string;
  steps: string | null;
  expected: string | null;
  routePath: string | null;
  severity: BugReportSeverity;
  status: BugReportStatus;
  reporterId: string | null;
  reporterName: string | null;
  resolvedAt: string | null;
  resolvedById: string | null;
  resolvedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BugReportListResponse {
  items: BugReportView[];
  total: number;
}
