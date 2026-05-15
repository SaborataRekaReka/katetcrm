import { IntegrationChannel, IntegrationEventStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReceiveIntegrationEventDto {
  @IsEnum(IntegrationChannel)
  channel!: IntegrationChannel;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  externalId?: string;

  @IsObject()
  payload!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  correlationId?: string;
}

export class IntegrationEventListQueryDto {
  @IsOptional()
  @IsEnum(IntegrationChannel)
  channel?: IntegrationChannel;

  @IsOptional()
  @IsEnum(IntegrationEventStatus)
  status?: IntegrationEventStatus;

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

export class RetryOrReplayIntegrationEventDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class MangoCallRoutingRuleDto {
  @IsString()
  @MaxLength(32)
  extension!: string;

  @IsString()
  @MaxLength(64)
  userId!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateMangoCallRoutingSettingsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  updateResponsibleOnAnswered?: boolean;

  @IsOptional()
  @IsBoolean()
  updateResponsibleOnTransfer?: boolean;

  @IsOptional()
  @IsBoolean()
  assignMissedCalls?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  fallbackManagerId?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MangoCallRoutingRuleDto)
  rules?: MangoCallRoutingRuleDto[];
}

export class UpdateSiteLeadRoutingSettingsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  preserveExistingManager?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  fallbackManagerId?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  managerIds?: string[];
}
