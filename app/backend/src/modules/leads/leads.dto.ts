import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PipelineStage, SourceChannel } from '@prisma/client';

export class CreateLeadDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  contactName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactCompany?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(64)
  contactPhone!: string;

  @IsOptional()
  @IsEnum(SourceChannel)
  source?: SourceChannel;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sourceLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  equipmentTypeHint?: string;

  @IsOptional()
  @IsDateString()
  requestedDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  timeWindow?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;
}

export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  contactCompany?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  equipmentTypeHint?: string;

  @IsOptional()
  @IsDateString()
  requestedDate?: string;

  @IsOptional()
  @IsString()
  timeWindow?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;
}

export class ChangeStageDto {
  @IsEnum(PipelineStage)
  stage!: PipelineStage;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class LeadListQueryDto {
  @IsOptional()
  @IsEnum(PipelineStage)
  stage?: PipelineStage;

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsEnum(SourceChannel)
  source?: SourceChannel;

  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  scope?: 'all' | 'mine';
}
