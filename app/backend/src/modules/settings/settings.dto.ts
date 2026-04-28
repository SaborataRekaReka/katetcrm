import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class WorkspaceSettingRowDto {
  @IsString()
  @MaxLength(120)
  label!: string;

  @IsString()
  @MaxLength(240)
  value!: string;
}

export class UpdateWorkspaceSectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => WorkspaceSettingRowDto)
  rows?: WorkspaceSettingRowDto[];
}
