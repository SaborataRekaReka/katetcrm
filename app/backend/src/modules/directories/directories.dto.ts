import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { EquipmentUnitStatus, SubcontractorStatus } from '@prisma/client';

// ---------- Equipment categories ----------

export class UpsertEquipmentCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;
}

// ---------- Equipment types ----------

export class CreateEquipmentTypeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class UpdateEquipmentTypeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string | null;
}

// ---------- Equipment units ----------

export class CreateEquipmentUnitDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsString()
  equipmentTypeId!: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  year?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  plateNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsEnum(EquipmentUnitStatus)
  status?: EquipmentUnitStatus;
}

export class UpdateEquipmentUnitDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  equipmentTypeId?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  year?: number;

  @IsOptional()
  @IsString()
  plateNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(EquipmentUnitStatus)
  status?: EquipmentUnitStatus;
}

// ---------- Subcontractors ----------

export class CreateSubcontractorDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  specialization?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  region?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsEnum(SubcontractorStatus)
  status?: SubcontractorStatus;
}

export class UpdateSubcontractorDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(SubcontractorStatus)
  status?: SubcontractorStatus;
}
