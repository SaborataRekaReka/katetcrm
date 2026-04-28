import {
  ArrayMaxSize,
  IsBoolean,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateClientDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(64)
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  favoriteEquipment?: string[];
}

export class UpdateClientContactDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  role?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateClientRequisitesDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  inn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  kpp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ogrn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  legalAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  bankAccount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  correspondentAccount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  bik?: string;
}

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  favoriteEquipment?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => UpdateClientContactDto)
  contacts?: UpdateClientContactDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateClientRequisitesDto)
  requisites?: UpdateClientRequisitesDto;
}
