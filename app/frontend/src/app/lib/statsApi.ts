import { apiRequest } from './apiClient';

export interface StatsApi {
  generatedAt: string;
  pipeline: {
    lead: number;
    application: number;
    reservation: number;
    departure: number;
    completed: number;
    unqualified: number;
    cancelled: number;
    total: number;
    active: number;
  };
  operations: {
    urgentLeads: number;
    staleLeads: number;
    conflicts: number;
    departuresToday: number;
    activeReservations: number;
    activeDepartures: number;
    completions7d: number;
  };
  audit: {
    events24h: number;
    events7d: number;
  };
  managers: Array<{
    id: string;
    name: string;
    openLeads: number;
    openApplications: number;
    activeReservations: number;
    activeDepartures: number;
  }>;
}

export interface StatsReportRowApi {
  id: string;
  name: string;
  category: 'Продажи' | 'Операции' | 'Контроль' | 'Импорт';
  period: string;
  owner: string;
  value: string;
  targetModule: 'dashboard' | 'audit' | 'imports';
}

export interface StatsReportsApi {
  generatedAt: string;
  periodDays: 7 | 30;
  items: StatsReportRowApi[];
}

export type StatsAnalyticsViewIdApi =
  | 'view-stale-leads'
  | 'view-lost-leads'
  | 'view-active-reservations'
  | 'view-manager-load';

export interface StatsAnalyticsManagerRowApi {
  id: string;
  name: string;
  count: number;
}

export interface StatsAnalyticsSampleRowApi {
  id: string;
  stage: string;
  manager: string;
  company: string | null;
  client: string;
  equipmentType: string;
  isUrgent: boolean;
  isStale: boolean;
  hasConflict: boolean;
  lastActivityAt: string;
}

export interface StatsAnalyticsViewApi {
  generatedAt: string;
  viewId: StatsAnalyticsViewIdApi;
  summary: {
    total: number;
    managers: number;
    urgent: number;
    conflicts: number;
  };
  managers: StatsAnalyticsManagerRowApi[];
  samples: StatsAnalyticsSampleRowApi[];
}

export function getStats() {
  return apiRequest<StatsApi>('stats');
}

export function getStatsReports(periodDays: 7 | 30) {
  return apiRequest<StatsReportsApi>('stats/reports', {
    query: { periodDays },
  });
}

export function getStatsAnalyticsView(
  viewId: StatsAnalyticsViewIdApi,
  sampleTake = 6,
) {
  return apiRequest<StatsAnalyticsViewApi>('stats/analytics', {
    query: { viewId, sampleTake },
  });
}
