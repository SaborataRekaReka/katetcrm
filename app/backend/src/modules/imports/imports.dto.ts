import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const IMPORT_ENTITY_TYPE = {
  lead: 'lead',
  client: 'client',
} as const;

export type ImportEntityType =
  (typeof IMPORT_ENTITY_TYPE)[keyof typeof IMPORT_ENTITY_TYPE];

export const IMPORT_DEDUP_POLICY = {
  skip: 'skip',
  update: 'update',
} as const;

export type ImportDedupPolicy =
  (typeof IMPORT_DEDUP_POLICY)[keyof typeof IMPORT_DEDUP_POLICY];

export class ImportPreviewDto {
  @IsEnum(IMPORT_ENTITY_TYPE)
  entityType!: ImportEntityType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sourceLabel?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5000)
  @IsObject({ each: true })
  rows!: Array<Record<string, unknown>>;

  @IsOptional()
  @IsObject()
  mapping?: Record<string, string>;
}

export class RunImportDto extends ImportPreviewDto {
  @IsOptional()
  @IsEnum(IMPORT_DEDUP_POLICY)
  dedupPolicy?: ImportDedupPolicy;
}
