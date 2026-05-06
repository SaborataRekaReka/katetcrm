import { apiRequest } from './apiClient';
import type { SourcingType } from './applicationsApi';
import type { StageLinkedIds } from './linkedIds';

export type ReservationInternalStage =
  | 'needs_source_selection'
  | 'searching_own_equipment'
  | 'searching_subcontractor'
  | 'subcontractor_selected'
  | 'type_reserved'
  | 'unit_defined'
  | 'ready_for_departure'
  | 'released';

export type SubcontractorConfirmationStatus =
  | 'not_requested'
  | 'requested'
  | 'confirmed'
  | 'declined'
  | 'no_response';

export type ReservationUiStatus = 'active' | 'released';
export type ReservationUiSource = 'own' | 'subcontractor' | 'undecided';

export interface ReservationDerivedState {
  displayStage: ReservationInternalStage;
  nextStep: string;
  ctaLabel: string;
  ctaDisabled: boolean;
  reason: string | null;
}

export interface ReservationConflictApi {
  id: string;
  summary: string;
  conflictingReservationId: string;
  conflictingAt: string;
}

export interface ReservationApi {
  id: string;
  applicationItemId: string;
  applicationId: string;
  leadId: string | null;
  applicationNumber: string | null;
  clientId: string | null;
  clientName: string | null;
  clientCompany: string | null;
  clientPhone: string | null;
  reservedById: string | null;
  reservedByName: string | null;
  responsibleManagerId: string | null;
  responsibleManagerName: string | null;
  positionLabel: string;
  equipmentTypeId: string | null;
  equipmentTypeLabel: string | null;
  equipmentUnitId: string | null;
  equipmentUnitLabel: string | null;
  subcontractorId: string | null;
  subcontractorLabel: string | null;
  sourcingType: SourcingType;
  /** UI-алиас sourcingType: undecided если бронь на стадии needs_source_selection. */
  source: ReservationUiSource;
  internalStage: ReservationInternalStage;
  status: ReservationUiStatus;
  plannedStart: string;
  plannedEnd: string;
  hasConflict: boolean;
  conflict: ReservationConflictApi | null;
  linkedIds: StageLinkedIds;
  readyForDeparture: boolean;
  subcontractorConfirmation: SubcontractorConfirmationStatus;
  promisedModelOrUnit: string | null;
  subcontractorNote: string | null;
  comment: string | null;
  releasedAt: string | null;
  releaseReason: string | null;
  createdAt: string;
  updatedAt: string;
  /** Derived: stage/nextStep/ctaLabel/ctaDisabled/reason — единый источник правды с бэка. */
  derived: ReservationDerivedState;
}

export interface ReservationListParams {
  applicationId?: string;
  applicationItemId?: string;
  equipmentUnitId?: string;
  subcontractorId?: string;
  isActive?: string;
  query?: string;
}

export function listReservations(params: ReservationListParams = {}) {
  return apiRequest<{ items: ReservationApi[]; total: number }>('reservations', {
    query: params as Record<string, string | undefined>,
  });
}

export function getReservation(id: string) {
  return apiRequest<ReservationApi>(`reservations/${id}`);
}

export function createReservation(body: {
  applicationItemId: string;
  sourcingType: SourcingType;
  equipmentTypeId?: string;
  equipmentUnitId?: string;
  subcontractorId?: string;
  subcontractorConfirmation?: SubcontractorConfirmationStatus;
  internalStage?: ReservationInternalStage;
  plannedStart: string;
  plannedEnd: string;
  promisedModelOrUnit?: string;
  subcontractorNote?: string;
}) {
  return apiRequest<ReservationApi>('reservations', { method: 'POST', body });
}

export function updateReservation(id: string, body: Partial<ReservationApi>) {
  return apiRequest<ReservationApi>(`reservations/${id}`, { method: 'PATCH', body });
}

export function releaseReservation(id: string, reason?: string) {
  return apiRequest<ReservationApi>(`reservations/${id}/release`, {
    method: 'POST',
    body: { reason },
  });
}
