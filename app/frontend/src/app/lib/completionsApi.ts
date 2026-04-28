import { apiRequest } from './apiClient';
import type { DepartureApi } from './departuresApi';

export type CompletionOutcome = 'completed' | 'unqualified';

export type CompletionStatus =
  | 'ready_to_complete'
  | 'blocked'
  | 'completed'
  | 'unqualified';

export type CompletionAlert =
  | 'none'
  | 'stale'
  | 'missing_arrival'
  | 'reservation_mismatch';

export interface CompletionApi {
  id: string;
  departureId: string;
  outcome: CompletionOutcome;
  completionNote: string | null;
  unqualifiedReason: string | null;
  completedById: string | null;
  completedByName: string | null;
  completedAt: string;
  linked: {
    reservationId: string;
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
    subcontractorId: string | null;
    subcontractorLabel: string | null;
  };
  context: {
    plannedStart: string;
    plannedEnd: string;
    scheduledAt: string;
    startedAt: string | null;
    arrivedAt: string | null;
    address: string | null;
    plannedDate: string | null;
    plannedTimeFrom: string | null;
    plannedTimeTo: string | null;
    deliveryNotes: string | null;
    cancellationReason: string | null;
  };
  derived: {
    status: CompletionStatus;
    alert: CompletionAlert;
  };
}

export interface CompletionListParams {
  departureId?: string;
  applicationId?: string;
  outcome?: CompletionOutcome;
  query?: string;
}

export interface PendingCompletionListParams {
  departureId?: string;
  applicationId?: string;
  query?: string;
}

export interface UpdateCompletionPatch {
  completionNote?: string | null;
  unqualifiedReason?: string | null;
}

export function listCompletions(params: CompletionListParams = {}) {
  return apiRequest<{ items: CompletionApi[]; total: number }>('completions', {
    query: params as Record<string, string | undefined>,
  });
}

export function listPendingCompletions(params: PendingCompletionListParams = {}) {
  return apiRequest<{ items: DepartureApi[]; total: number }>('completions/pending', {
    query: params as Record<string, string | undefined>,
  });
}

export function getCompletion(id: string) {
  return apiRequest<CompletionApi>(`completions/${id}`);
}

export function createCompletion(body: {
  departureId: string;
  outcome: CompletionOutcome;
  completionNote?: string;
  unqualifiedReason?: string;
}) {
  return apiRequest<CompletionApi>('completions', {
    method: 'POST',
    body,
  });
}

export function updateCompletion(id: string, patch: UpdateCompletionPatch) {
  return apiRequest<CompletionApi>(`completions/${id}`, {
    method: 'PATCH',
    body: patch,
  });
}
