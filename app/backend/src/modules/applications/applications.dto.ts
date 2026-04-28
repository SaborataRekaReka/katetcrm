import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { SourcingType, DeliveryMode, PipelineStage } from '@prisma/client';

export class UpdateApplicationDto {
  @IsOptional()
  @IsString()
  responsibleManagerId?: string;

  @IsOptional()
  @IsDateString()
  requestedDate?: string;

  @IsOptional()
  @IsString()
  requestedTimeFrom?: string;

  @IsOptional()
  @IsString()
  requestedTimeTo?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;

  @IsOptional()
  @IsEnum(DeliveryMode)
  deliveryMode?: DeliveryMode;

  @IsOptional()
  @IsBoolean()
  nightWork?: boolean;
}

export class CreateApplicationItemDto {
  @IsString()
  @MinLength(1)
  equipmentTypeLabel!: string;

  @IsOptional()
  @IsString()
  equipmentTypeId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  shiftCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  overtimeHours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  downtimeHours?: number;

  @IsOptional()
  @IsDateString()
  plannedDate?: string;

  @IsOptional()
  @IsString()
  plannedTimeFrom?: string;

  @IsOptional()
  @IsString()
  plannedTimeTo?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsEnum(SourcingType)
  sourcingType?: SourcingType;

  @IsOptional()
  pricePerShift?: number | string;

  @IsOptional()
  deliveryPrice?: number | string;

  @IsOptional()
  surcharge?: number | string;

  @IsOptional()
  @IsBoolean()
  readyForReservation?: boolean;
}

export class UpdateApplicationItemDto extends CreateApplicationItemDto {
  @IsOptional()
  @IsString()
  declare equipmentTypeLabel: string;
}

export class CancelApplicationDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ApplicationListQueryDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  @IsEnum(PipelineStage)
  stage?: PipelineStage;

  @IsOptional()
  @IsString()
  scope?: 'all' | 'mine';

  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  sourcing?: 'own' | 'subcontractor' | 'mixed' | 'undecided';

  @IsOptional()
  @IsString()
  equipment?: string;

  @IsOptional()
  @IsString()
  readinessReservation?: 'ready' | 'waiting' | 'no_data';

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  readyForDeparture?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  conflict?: boolean;

  @IsOptional()
  isActive?: string;
}
