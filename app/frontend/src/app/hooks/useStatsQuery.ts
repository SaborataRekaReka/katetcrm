import { useQuery } from '@tanstack/react-query';
import { getStats } from '../lib/statsApi';

export const statsQueryKeys = {
  summary: ['stats', 'summary'] as const,
};

export function useStatsQuery(enabled = true) {
  return useQuery({
    queryKey: statsQueryKeys.summary,
    queryFn: getStats,
    enabled,
    refetchInterval: 30_000,
  });
}
