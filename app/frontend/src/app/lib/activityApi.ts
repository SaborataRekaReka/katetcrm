import { apiRequest } from './apiClient';

export type ActivityAction =
  | 'LEAD_CREATED'
  | 'LEAD_UPDATED'
  | 'LEAD_STAGE_CHANGED'
  | 'LEAD_QUALIFIED'
  | 'LEAD_UNQUALIFIED'
  | 'APPLICATION_CREATED'
  | 'APPLICATION_UPDATED'
  | 'APPLICATION_CANCELLED'
  | 'APPLICATION_ITEM_ADDED'
  | 'APPLICATION_ITEM_UPDATED'
  | 'APPLICATION_ITEM_REMOVED'
  | 'RESERVATION_CREATED'
  | 'RESERVATION_UPDATED'
  | 'RESERVATION_RELEASED'
  | 'RESERVATION_CONFIRMED'
  | 'CLIENT_CREATED'
  | 'CLIENT_UPDATED'
  | string;

export interface ActivityLogEntryApi {
  id: string;
  action: ActivityAction;
  entityType: string;
  entityId: string;
  summary: string;
  actorId: string | null;
  payload: unknown;
  createdAt: string;
}

export async function listActivityForEntity(
  entityType: string,
  entityId: string,
  take = 50,
): Promise<ActivityLogEntryApi[]> {
  const params = new URLSearchParams({ entityType, entityId, take: String(take) });
  return apiRequest<ActivityLogEntryApi[]>(`/activity?${params.toString()}`);
}
