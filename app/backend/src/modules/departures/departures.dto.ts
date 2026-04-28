import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { CompletionOutcome, DepartureStatus } from '@prisma/client';

export class DepartureListQueryDto {
  @IsOptional()
  @IsString()
  reservationId?: string;

  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsOptional()
  @IsEnum(DepartureStatus)
  status?: DepartureStatus;

  @IsOptional()
  @IsString()
  query?: string;
}

export class CreateDepartureDto {
  @IsString()
  reservationId!: string;

  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  deliveryNotes?: string;
}

export class UpdateDepartureDto {
  @IsOptional()
  @IsEnum(DepartureStatus)
  status?: DepartureStatus;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsDateString()
  startedAt?: string | null;

  @IsOptional()
  @IsDateString()
  arrivedAt?: string | null;

  @IsOptional()
  @IsDateString()
  completedAt?: string | null;

  @IsOptional()
  @IsDateString()
  cancelledAt?: string | null;

  @IsOptional()
  @IsString()
  cancellationReason?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsString()
  deliveryNotes?: string | null;
}

export class CancelDepartureDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CompleteDepartureDto {
  @IsEnum(CompletionOutcome)
  outcome!: CompletionOutcome;

  @IsOptional()
  @IsString()
  completionNote?: string;

  @IsOptional()
  @IsString()
  unqualifiedReason?: string;
}
