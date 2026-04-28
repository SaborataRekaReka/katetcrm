import { ActivityAction } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export const ACTIVITY_MODULE_FILTER = {
  sales: 'sales',
  ops: 'ops',
  admin: 'admin',
} as const;

export type ActivityModuleFilter =
  (typeof ACTIVITY_MODULE_FILTER)[keyof typeof ACTIVITY_MODULE_FILTER];

export class ActivitySearchQueryDto {
  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @IsEnum(ActivityAction)
  action?: ActivityAction;

  @IsOptional()
  @IsEnum(ACTIVITY_MODULE_FILTER)
  module?: ActivityModuleFilter;

  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

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
  @Max(10000)
  skip?: number;
}
