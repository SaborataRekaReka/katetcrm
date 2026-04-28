import {
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { CompletionOutcome } from '@prisma/client';

export class CompletionListQueryDto {
  @IsOptional()
  @IsString()
  departureId?: string;

  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsOptional()
  @IsEnum(CompletionOutcome)
  outcome?: CompletionOutcome;

  @IsOptional()
  @IsString()
  query?: string;
}

export class CreateCompletionDto {
  @IsString()
  departureId!: string;

  @IsEnum(CompletionOutcome)
  outcome!: CompletionOutcome;

  @IsOptional()
  @IsString()
  completionNote?: string;

  @IsOptional()
  @IsString()
  unqualifiedReason?: string;
}

export class UpdateCompletionDto {
  @IsOptional()
  @IsString()
  completionNote?: string | null;

  @IsOptional()
  @IsString()
  unqualifiedReason?: string | null;
}
