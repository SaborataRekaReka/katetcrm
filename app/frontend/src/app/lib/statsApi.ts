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

export function getStats() {
  return apiRequest<StatsApi>('stats');
}
