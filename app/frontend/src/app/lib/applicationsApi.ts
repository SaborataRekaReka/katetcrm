import { apiRequest } from './apiClient';
import type { PipelineStage, SourceChannel } from './leadsApi';

export type SourcingType = 'own' | 'subcontractor' | 'undecided';
export type DeliveryMode = 'pickup' | 'delivery';

export type ApplicationItemStatus =
  | 'no_reservation'
  | 'unit_selected'
  | 'reserved'
  | 'conflict';

export type ApplicationGroup =
  | 'no_reservation'
  | 'in_reservation_work'
  | 'ready_for_departure'
  | 'on_departure'
  | 'completed'
  | 'cancelled';

export type DominantSourcing = 'own' | 'subcontractor' | 'mixed' | 'undecided';

export interface ApplicationItemApi {
  id: string;
  applicationId: string;
  equipmentTypeId: string | null;
  equipmentTypeLabel: string;
  quantity: number;
  shiftCount: number;
  overtimeHours: number | null;
  downtimeHours: number | null;
  plannedDate: string | null;
  plannedTimeFrom: string | null;
  plannedTimeTo: string | null;
  address: string | null;
  comment: string | null;
  sourcingType: SourcingType;
  pricePerShift: string | null;
  deliveryPrice: string | null;
  surcharge: string | null;
  readyForReservation: boolean;

  // Derived (from backend projection):
  status: ApplicationItemStatus;
  unit: string | null;
  subcontractor: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface ApplicationApi {
  id: string;
  number: string;
  stage: PipelineStage;

  leadId: string;
  clientId: string;
  clientName: string;
  clientCompany: string | null;
  clientPhone: string;
  responsibleManagerId: string | null;
  responsibleManagerName: string | null;

  requestedDate: string | null;
  requestedTimeFrom: string | null;
  requestedTimeTo: string | null;
  address: string | null;
  comment: string | null;
  isUrgent: boolean;
  deliveryMode: DeliveryMode | null;
  nightWork: boolean;

  isActive: boolean;
  cancelledAt: string | null;
  completedAt: string | null;

  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;

  positions: ApplicationItemApi[];

  // Derived aggregates:
  positionsTotal: number;
  positionsReserved: number;
  positionsReady: number;
  hasAnyConflict: boolean;
  dominantSourcing: DominantSourcing;
  equipmentSummary: string;
  subcontractorSummary: string | null;
  applicationGroup: ApplicationGroup;
  readyForDeparture: boolean;
}

export interface ApplicationListParams {
  clientId?: string;
  leadId?: string;
  managerId?: string;
  stage?: PipelineStage;
  scope?: 'all' | 'mine';
  query?: string;
  sourcing?: DominantSourcing;
  equipment?: string;
  readinessReservation?: 'ready' | 'waiting' | 'no_data';
  readyForDeparture?: boolean;
  conflict?: boolean;
  isActive?: string;
}

export function listApplications(params: ApplicationListParams = {}) {
  return apiRequest<{ items: ApplicationApi[]; total: number }>('applications', {
    query: params as Record<string, string | undefined>,
  });
}

export function getApplication(id: string) {
  return apiRequest<ApplicationApi>(`applications/${id}`);
}

export function updateApplication(id: string, body: Partial<ApplicationApi>) {
  return apiRequest<ApplicationApi>(`applications/${id}`, { method: 'PATCH', body });
}

export function addApplicationItem(applicationId: string, body: Partial<ApplicationItemApi>) {
  return apiRequest<ApplicationItemApi>(`applications/${applicationId}/items`, {
    method: 'POST',
    body,
  });
}

export function updateApplicationItem(itemId: string, body: Partial<ApplicationItemApi>) {
  return apiRequest<ApplicationItemApi>(`application-items/${itemId}`, {
    method: 'PATCH',
    body,
  });
}

export function deleteApplicationItem(itemId: string) {
  return apiRequest<{ ok: true }>(`application-items/${itemId}`, { method: 'DELETE' });
}

export function cancelApplication(id: string, reason?: string) {
  return apiRequest<ApplicationApi>(`applications/${id}/cancel`, {
    method: 'POST',
    body: reason ? { reason } : {},
  });
}

export type { PipelineStage, SourceChannel };
