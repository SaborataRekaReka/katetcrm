import { useQuery } from '@tanstack/react-query';
import {
  getStats,
  getStatsAnalyticsView,
  getStatsReports,
  type StatsAnalyticsViewIdApi,
} from '../lib/statsApi';

export const statsQueryKeys = {
  summary: ['stats', 'summary'] as const,
  reports: (periodDays: 7 | 30) => ['stats', 'reports', periodDays] as const,
  analytics: (viewId: StatsAnalyticsViewIdApi, sampleTake: number) =>
    ['stats', 'analytics', viewId, sampleTake] as const,
};

export function useStatsQuery(enabled = true) {
  return useQuery({
    queryKey: statsQueryKeys.summary,
    queryFn: getStats,
    enabled,
    refetchInterval: 30_000,
  });
}

export function useStatsReportsQuery(periodDays: 7 | 30, enabled = true) {
  return useQuery({
    queryKey: statsQueryKeys.reports(periodDays),
    queryFn: () => getStatsReports(periodDays),
    enabled,
    refetchInterval: 30_000,
  });
}

export function useStatsAnalyticsViewQuery(
  viewId: StatsAnalyticsViewIdApi,
  sampleTake = 6,
  enabled = true,
) {
  return useQuery({
    queryKey: statsQueryKeys.analytics(viewId, sampleTake),
    queryFn: () => getStatsAnalyticsView(viewId, sampleTake),
    enabled,
    refetchInterval: 30_000,
  });
}
