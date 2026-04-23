import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  ReservationInternalStage,
  SourcingType,
  SubcontractorConfirmationStatus,
} from '@prisma/client';

export class CreateReservationDto {
  @IsString()
  applicationItemId!: string;

  @IsEnum(SourcingType)
  sourcingType!: SourcingType;

  @IsOptional()
  @IsEnum(ReservationInternalStage)
  internalStage?: ReservationInternalStage;

  @IsOptional()
  @IsString()
  equipmentTypeId?: string;

  @IsOptional()
  @IsString()
  equipmentUnitId?: string;

  @IsOptional()
  @IsString()
  subcontractorId?: string;

  @IsOptional()
  @IsEnum(SubcontractorConfirmationStatus)
  subcontractorConfirmation?: SubcontractorConfirmationStatus;

  @IsOptional()
  @IsString()
  promisedModelOrUnit?: string;

  @IsOptional()
  @IsString()
  subcontractorNote?: string;

  @IsDateString()
  plannedStart!: string;

  @IsDateString()
  plannedEnd!: string;
}

export class UpdateReservationDto {
  @IsOptional()
  @IsEnum(SourcingType)
  sourcingType?: SourcingType;

  @IsOptional()
  @IsEnum(ReservationInternalStage)
  internalStage?: ReservationInternalStage;

  @IsOptional()
  @IsString()
  equipmentTypeId?: string | null;

  @IsOptional()
  @IsString()
  equipmentUnitId?: string | null;

  @IsOptional()
  @IsString()
  subcontractorId?: string | null;

  @IsOptional()
  @IsEnum(SubcontractorConfirmationStatus)
  subcontractorConfirmation?: SubcontractorConfirmationStatus;

  @IsOptional()
  @IsString()
  promisedModelOrUnit?: string;

  @IsOptional()
  @IsString()
  subcontractorNote?: string;

  @IsOptional()
  @IsDateString()
  plannedStart?: string;

  @IsOptional()
  @IsDateString()
  plannedEnd?: string;

  @IsOptional()
  @IsString()
  comment?: string | null;
}

export class ReleaseReservationDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReservationListQueryDto {
  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsOptional()
  @IsString()
  applicationItemId?: string;

  @IsOptional()
  @IsString()
  equipmentUnitId?: string;

  @IsOptional()
  @IsString()
  subcontractorId?: string;

  @IsOptional()
  isActive?: string;
}
