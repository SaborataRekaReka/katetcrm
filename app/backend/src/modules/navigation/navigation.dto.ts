import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export const DEEP_LINK_ENTITY_TYPES = [
  'lead',
  'application',
  'reservation',
  'departure',
  'completion',
] as const;

export type DeepLinkEntityType = (typeof DEEP_LINK_ENTITY_TYPES)[number];

export class ResolveDeepLinkQueryDto {
  @IsIn(DEEP_LINK_ENTITY_TYPES)
  entityType!: DeepLinkEntityType;

  @IsString()
  @IsNotEmpty()
  entityId!: string;
}
