export type CompletionStatus =
  | 'ready_to_complete'
  | 'blocked'
  | 'completed'
  | 'unqualified';

export type CompletionAlert = 'none' | 'stale' | 'missing_arrival' | 'reservation_mismatch';

export interface CompletionActivityItem {
  id: string;
  at: string;
  actor: string;
  kind:
    | 'created'
    | 'departed'
    | 'arrived'
    | 'completion_started'
    | 'completed'
    | 'comment'
    | 'unqualified';
  message: string;
}

export interface CompletionLinked {
  departureId: string;
  departureTitle: string;
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

export interface CompletionDepartureContext {
  plannedDate: string;
  plannedTimeFrom: string;
  plannedTimeTo?: string;
  departedAt?: string;
  arrivedAt?: string;
  address: string;
  contactName?: string;
  contactPhone?: string;
  operationalNote?: string;
}

export interface CompletionFact {
  completedAt?: string;
  completedBy?: string;
  completionNote?: string;
  unqualifiedReason?: string;
}

export interface Completion {
  id: string;
  status: CompletionStatus;
  alert: CompletionAlert;
  manager: string;
  createdAt: string;
  updatedAt: string;
  lastActivity: string;
  comment?: string;
  linked: CompletionLinked;
  context: CompletionDepartureContext;
  fact: CompletionFact;
  activity: CompletionActivityItem[];
}
