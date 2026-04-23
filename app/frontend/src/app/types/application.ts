export type ApplicationStage = 'application' | 'reservation' | 'departure' | 'completed' | 'cancelled';

export type SourcingType = 'own' | 'subcontractor' | 'undecided';

export interface ApplicationPosition {
  id: string;
  equipmentType: string;
  quantity: number;
  shiftCount: number;
  overtimeHours?: number;
  downtimeHours?: number;
  plannedDate?: string;
  plannedTimeFrom?: string;
  plannedTimeTo?: string;
  address?: string;
  comment?: string;
  sourcingType: SourcingType;
  subcontractor?: string;
  unit?: string;
  pricePerShift?: number;
  deliveryPrice?: number;
  surcharge?: number;
  reservationState?: 'pending' | 'confirmed' | 'conflict';
  readyForReservation: boolean;
  status?: 'no_reservation' | 'unit_selected' | 'reserved' | 'conflict';
}

export interface Application {
  id: string;
  number: string;
  stage: ApplicationStage;
  leadId?: string;
  clientId: string;
  clientName: string;
  clientCompany?: string;
  clientPhone: string;
  responsibleManager: string;
  requestedDate?: string;
  requestedTimeFrom?: string;
  requestedTimeTo?: string;
  address?: string;
  comment?: string;
  isUrgent: boolean;
  deliveryMode?: 'pickup' | 'delivery';
  nightWork: boolean;
  positions: ApplicationPosition[];
  createdAt: string;
  updatedAt: string;
  lastActivity: string;
}

export interface ApplicationActivity {
  id: string;
  type: 'created' | 'edited' | 'position_added' | 'position_removed' | 'position_edited' | 'stage_changed' | 'reservation_created';
  timestamp: string;
  user: string;
  description: string;
}
