import { apiRequest } from './apiClient';

export type ActivityAction =
  | 'created'
  | 'updated'
  | 'stage_changed'
  | 'cancelled'
  | 'completed'
  | 'unqualified'
  | 'imported'
  | 'note_added'
  | string;

export type ActivityModule = 'sales' | 'ops' | 'admin';

export interface ActivityLogEntryApi {
  id: string;
  action: ActivityAction;
  entityType: string;
  entityId: string;
  summary: string;
  actorId: string | null;
  actor?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  payload: unknown;
  createdAt: string;
}

export interface ActivitySearchParams {
  entityType?: string;
  entityId?: string;
  actorId?: string;
  action?: ActivityAction;
  module?: ActivityModule;
  query?: string;
  from?: string;
  to?: string;
  take?: number;
  skip?: number;
}

export interface ActivitySearchResponse {
  items: ActivityLogEntryApi[];
  total: number;
}

export async function listActivityForEntity(
  entityType: string,
  entityId: string,
  take = 50,
): Promise<ActivityLogEntryApi[]> {
  const params = new URLSearchParams({ entityType, entityId, take: String(take) });
  return apiRequest<ActivityLogEntryApi[]>(`/activity?${params.toString()}`);
}

export async function listRecentActivity(take = 100): Promise<ActivityLogEntryApi[]> {
  const params = new URLSearchParams({ take: String(take) });
  return apiRequest<ActivityLogEntryApi[]>(`/activity?${params.toString()}`);
}

export async function searchActivity(
  params: ActivitySearchParams = {},
): Promise<ActivitySearchResponse> {
  return apiRequest<ActivitySearchResponse>('activity/search', {
    query: {
      entityType: params.entityType,
      entityId: params.entityId,
      actorId: params.actorId,
      action: params.action,
      module: params.module,
      query: params.query,
      from: params.from,
      to: params.to,
      take: params.take,
      skip: params.skip,
    },
  });
}
