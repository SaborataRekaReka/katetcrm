export type ClientType = 'company' | 'person';

export type ClientTagTone =
  | 'success'
  | 'caution'
  | 'progress'
  | 'warning'
  | 'muted'
  | 'source';

export interface ClientTag {
  label: string;
  tone: ClientTagTone;
}

export interface ClientContact {
  id: string;
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
}

export interface ClientRequisites {
  inn?: string;
  kpp?: string;
  ogrn?: string;
  legalAddress?: string;
  bankName?: string;
  bankAccount?: string;
  correspondentAccount?: string;
  bik?: string;
}

export interface ClientFavoriteCategory {
  category: string;
  count: number;
}

export type ClientLeadStatus = 'converted' | 'lost' | 'in_progress' | 'unqualified';

export interface ClientLeadHistoryItem {
  id: string;
  date: string;
  source: string;
  status: ClientLeadStatus;
  equipmentType: string;
  address?: string;
  manager: string;
}

export type ClientOrderStatus = 'completed' | 'in_progress' | 'cancelled';

export interface ClientOrderPosition {
  equipmentType: string;
  quantity: number;
  unit?: string;
  subcontractor?: string;
}

export interface ClientOrderHistoryItem {
  id: string;
  leadId?: string;
  number: string;
  date: string;
  status: ClientOrderStatus;
  positions: ClientOrderPosition[];
  equipmentSummary: string;
  address?: string;
  amount?: string;
  hasActiveReservation?: boolean;
  hasActiveDeparture?: boolean;
  reservationId?: string;
  departureId?: string;
  completionId?: string;
  comment?: string;
}

export interface ClientActiveRecords {
  leadsCount: number;
  applicationsCount: number;
  reservationsCount: number;
  departuresCount: number;
  topActiveApplication?: { id: string; title: string; entityId?: string };
  topActiveReservation?: { id: string; title: string; entityId?: string };
  topActiveDeparture?: { id: string; title: string; entityId?: string };
}

export interface ClientPossibleDuplicate {
  id: string;
  name: string;
  reason: string;
}

export type ClientActivityKind =
  | 'created'
  | 'updated'
  | 'contact_changed'
  | 'requisites_changed'
  | 'lead_created'
  | 'application_created'
  | 'order_repeated'
  | 'order_completed'
  | 'comment';

export interface ClientActivityItem {
  id: string;
  at: string;
  actor: string;
  message: string;
  kind: ClientActivityKind;
}

export interface Client {
  id: string;
  type: ClientType;
  displayName: string;
  shortName?: string;
  primaryPhone: string;
  primaryEmail?: string;
  manager?: string;
  createdAt: string;
  updatedAt: string;
  lastActivity: string;
  totalOrders: number;
  totalRevenue?: string;
  daysSinceLastOrder?: number;
  tags: ClientTag[];
  contacts: ClientContact[];
  requisites: ClientRequisites;
  favoriteCategories: ClientFavoriteCategory[];
  workingNotes?: string;
  comment?: string;
  leadsHistory: ClientLeadHistoryItem[];
  ordersHistory: ClientOrderHistoryItem[];
  activeRecords: ClientActiveRecords;
  possibleDuplicates: ClientPossibleDuplicate[];
  activity: ClientActivityItem[];
}
