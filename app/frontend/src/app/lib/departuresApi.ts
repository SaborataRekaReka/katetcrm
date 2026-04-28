import { apiRequest } from './apiClient';

export type DepartureStatus =
  | 'scheduled'
  | 'in_transit'
  | 'arrived'
  | 'completed'
  | 'cancelled';

export type DepartureAlert = 'none' | 'overdue_start' | 'overdue_arrival' | 'stale';

export type CompletionOutcome = 'completed' | 'unqualified';

export interface DepartureApi {
  id: string;
  reservationId: string;
  status: DepartureStatus;
  scheduledAt: string;
  startedAt: string | null;
  arrivedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  notes: string | null;
  deliveryNotes: string | null;
  createdAt: string;
  updatedAt: string;
  linked: {
    applicationId: string;
    applicationNumber: string | null;
    leadId: string | null;
    clientId: string | null;
    clientName: string | null;
    clientCompany: string | null;
    clientPhone: string | null;
    responsibleManagerId: string | null;
    responsibleManagerName: string | null;
    applicationItemId: string;
    positionLabel: string;
    quantity: number;
    equipmentTypeId: string | null;
    equipmentTypeLabel: string | null;
    equipmentUnitId: string | null;
    equipmentUnitLabel: string | null;
    equipmentUnitPlate: string | null;
    subcontractorId: string | null;
    subcontractorLabel: string | null;
    address: string | null;
    plannedStart: string;
    plannedEnd: string;
    plannedDate: string | null;
    plannedTimeFrom: string | null;
    plannedTimeTo: string | null;
    reservationComment: string | null;
  };
  completion: {
    id: string;
    outcome: CompletionOutcome;
    completedAt: string;
  } | null;
  derived: {
    alert: DepartureAlert;
    canStart: boolean;
    canArrive: boolean;
    canComplete: boolean;
  };
}

export interface DepartureListParams {
  reservationId?: string;
  applicationId?: string;
  status?: DepartureStatus;
  query?: string;
}

export interface UpdateDeparturePatch {
  status?: DepartureStatus;
  scheduledAt?: string;
  startedAt?: string | null;
  arrivedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  notes?: string | null;
  deliveryNotes?: string | null;
}

export function listDepartures(params: DepartureListParams = {}) {
  return apiRequest<{ items: DepartureApi[]; total: number }>('departures', {
    query: params as Record<string, string | undefined>,
  });
}

export function getDeparture(id: string) {
  return apiRequest<DepartureApi>(`departures/${id}`);
}

export function updateDeparture(id: string, patch: UpdateDeparturePatch) {
  return apiRequest<DepartureApi>(`departures/${id}`, {
    method: 'PATCH',
    body: patch,
  });
}

export function startDeparture(id: string) {
  return apiRequest<DepartureApi>(`departures/${id}/start`, {
    method: 'POST',
    body: {},
  });
}

export function arriveDeparture(id: string) {
  return apiRequest<DepartureApi>(`departures/${id}/arrive`, {
    method: 'POST',
    body: {},
  });
}

export function cancelDeparture(id: string, reason?: string) {
  return apiRequest<DepartureApi>(`departures/${id}/cancel`, {
    method: 'POST',
    body: reason ? { reason } : {},
  });
}

export function completeDeparture(
  id: string,
  body: {
    outcome: CompletionOutcome;
    completionNote?: string;
    unqualifiedReason?: string;
  },
) {
  return apiRequest<DepartureApi>(`departures/${id}/complete`, {
    method: 'POST',
    body,
  });
}
