export type StageType = 'lead' | 'application' | 'reservation' | 'departure' | 'completed' | 'unqualified' | 'cancelled';

export type ReservationStage = 'own_equipment' | 'subcontractor' | 'type_reserved' | 'unit_confirmed' | 'ready';

export type ReservationInternalStage =
  | 'needs_source_selection'
  | 'searching_own_equipment'
  | 'searching_subcontractor'
  | 'subcontractor_selected'
  | 'type_reserved'
  | 'unit_defined'
  | 'ready_for_departure'
  | 'released';

export type ReservationStatus = 'active' | 'released';

export interface ReservationActivityItem {
  id: string;
  at: string;
  actor: string;
  kind: 'created' | 'stage_changed' | 'source_changed' | 'unit_assigned' | 'subcontractor_assigned' | 'conflict_detected' | 'released' | 'transferred' | 'comment';
  message: string;
}

export interface ReservationCandidateUnit {
  id: string;
  name: string;
  plate?: string;
  status: 'available' | 'busy' | 'maintenance';
  note?: string;
}

export interface ReservationSubcontractorOption {
  id: string;
  name: string;
  category?: string;
  priceNote?: string;
  usage?: string;
}

export interface ReservationLinkedItem {
  applicationId: string;
  applicationTitle: string;
  clientId: string;
  clientName: string;
  leadId?: string;
  leadTitle?: string;
  positionTitle: string;
  equipmentType: string;
  quantity: number;
  plannedDate?: string;
  plannedTime?: string;
  address?: string;
  comment?: string;
}

export interface ReservationConflict {
  id: string;
  summary: string;
  conflictingReservationId: string;
  conflictingAt: string;
}

export interface Reservation {
  id: string;
  status: ReservationStatus;
  internalStage: ReservationInternalStage;
  reservationType: 'equipment_type' | 'specific_unit';
  equipmentType: string;
  equipmentUnit?: string;
  source: 'own' | 'subcontractor' | 'undecided';
  subcontractor?: string;
  reservedBy: string;
  reservedAt: string;
  releasedAt?: string;
  releaseReason?: string;
  comment?: string;
  lastActivity: string;
  hasConflict?: boolean;
  conflict?: ReservationConflict;
  readyForDeparture?: boolean;
  linked: ReservationLinkedItem;
  candidateUnits: ReservationCandidateUnit[];
  subcontractorOptions: ReservationSubcontractorOption[];
  activity: ReservationActivityItem[];
}

export type SourceChannel = 'site' | 'mango' | 'telegram' | 'max' | 'manual' | 'other';

export type ApplicationReadiness =
  | 'ready'
  | 'waiting_sourcing'
  | 'no_data'
  | 'partial'
  | 'has_active_reservation';

export type LeadReadiness = 'ready' | 'missing';

export interface Lead {
  id: string;
  apiClientId?: string;
  stage: StageType;
  client: string;
  company?: string;
  phone: string;
  source: string;
  equipmentType: string;
  date?: string;
  timeWindow?: string;
  address?: string;
  comment?: string;
  manager: string;
  lastActivity: string;
  isNew?: boolean;
  isDuplicate?: boolean;
  isUrgent?: boolean;
  isStale?: boolean;
  hasNoContact?: boolean;
  multipleItems?: number;
  incompleteData?: boolean;
  reservationStage?: ReservationStage;
  ownOrSubcontractor?: 'own' | 'subcontractor' | 'undecided';
  subcontractor?: string;
  equipmentUnit?: string;
  hasConflict?: boolean;
  readyForDeparture?: boolean;
  departureStatus?: 'today' | 'soon' | 'overdue' | 'awaiting';
  completionReason?: string;
  unqualifiedReason?: string;
  completionDate?: string;
  sourceChannel?: SourceChannel;
  missingFields?: Array<'address' | 'date' | 'contact' | 'equipment'>;
  applicationReadiness?: ApplicationReadiness;
  positionsReady?: number;
  positionsTotal?: number;
}

export interface KanbanColumn {
  id: StageType;
  title: string;
  count: number;
  color: string;
}
