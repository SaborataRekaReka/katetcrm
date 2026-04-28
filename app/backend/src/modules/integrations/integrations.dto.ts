import { IntegrationChannel, IntegrationEventStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
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
