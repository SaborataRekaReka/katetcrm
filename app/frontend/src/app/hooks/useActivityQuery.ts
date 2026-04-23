import { useQuery } from '@tanstack/react-query';
import { listActivityForEntity } from '../lib/activityApi';

export const activityQueryKeys = {
  forEntity: (entityType: string, entityId: string) =>
    ['activity', entityType, entityId] as const,
};

export function useEntityActivity(
  entityType: string,
  entityId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: activityQueryKeys.forEntity(entityType, entityId ?? ''),
    queryFn: () => listActivityForEntity(entityType, entityId as string, 50),
    enabled: enabled && !!entityId,
    refetchInterval: 30_000,
  });
}
