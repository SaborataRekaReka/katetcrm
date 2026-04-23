export type DepartureStatus =
  | 'scheduled'
  | 'in_transit'
  | 'arrived'
  | 'completed'
  | 'cancelled';

export type DepartureAlert = 'none' | 'overdue_start' | 'overdue_arrival' | 'stale';

export interface DepartureActivityItem {
  id: string;
  at: string;
  actor: string;
  kind:
    | 'created'
    | 'plan_changed'
    | 'departed'
    | 'arrived'
    | 'completed'
    | 'cancelled'
    | 'comment';
  message: string;
}

export interface DepartureLinkedItem {
  reservationId: string;
  reservationTitle: string;
  applicationId: string;
  applicationTitle: string;
  clientId: string;
  clientName: string;
  leadId?: string;
  leadTitle?: string;
  equipmentType: string;
  equipmentUnit?: string;
  subcontractor?: string;
  quantity: number;
}

export interface DepartureTripPlan {
  plannedDate: string;
  plannedTimeFrom: string;
  plannedTimeTo?: string;
  address: string;
  contactName?: string;
  contactPhone?: string;
  deliveryNotes?: string;
}

export interface DepartureFactTracking {
  departedAt?: string;
  arrivedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

export interface Departure {
  id: string;
  status: DepartureStatus;
  alert: DepartureAlert;
  manager: string;
  createdAt: string;
  updatedAt: string;
  lastActivity: string;
  comment?: string;
  linked: DepartureLinkedItem;
  plan: DepartureTripPlan;
  fact: DepartureFactTracking;
  activity: DepartureActivityItem[];
}
