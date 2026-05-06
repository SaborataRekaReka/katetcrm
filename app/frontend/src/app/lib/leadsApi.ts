import { apiRequest } from './apiClient';
import type { StageLinkedIds } from './linkedIds';

export type PipelineStage =
  | 'lead'
  | 'application'
  | 'reservation'
  | 'departure'
  | 'completed'
  | 'unqualified'
  | 'cancelled';

export type SourceChannel = 'site' | 'mango' | 'telegram' | 'max' | 'manual' | 'other';

export type LeadMissingField = 'address' | 'date' | 'contact' | 'equipment';

export interface LeadApi {
  id: string;
  stage: PipelineStage;
  source: SourceChannel;
  sourceLabel: string;
  contactName: string;
  contactCompany: string | null;
  contactPhone: string;
  phoneNormalized: string;
  equipmentTypeHint: string | null;
  requestedDate: string | null;
  timeWindow: string | null;
  address: string | null;
  comment: string | null;
  managerId: string | null;
  managerName: string | null;
  manager: { id: string; fullName: string } | null;
  clientId: string | null;
  client: { id: string; name: string; company: string | null } | null;
  isDuplicate: boolean;
  isUrgent: boolean;
  isStale: boolean;
  hasNoContact: boolean;
  incompleteData: boolean;
  missingFields: LeadMissingField[];
  unqualifiedReason: string | null;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
  linkedIds: StageLinkedIds;
}

export interface LeadListResponse {
  items: LeadApi[];
  total: number;
}

export interface LeadListParams {
  stage?: PipelineStage;
  source?: SourceChannel;
  managerId?: string;
  clientId?: string;
  query?: string;
  equipmentTypeHint?: string;
  isUrgent?: boolean;
  isStale?: boolean;
  isDuplicate?: boolean;
  hasNoContact?: boolean;
  scope?: 'all' | 'mine';
}

export function listLeads(params: LeadListParams = {}) {
  return apiRequest<LeadListResponse>('leads', { query: params as Record<string, string | undefined> });
}

export function getLead(id: string) {
  return apiRequest<LeadApi>(`leads/${id}`);
}

export function createLead(body: {
  contactName: string;
  contactCompany?: string;
  contactPhone: string;
  clientId?: string;
  source?: SourceChannel;
  sourceLabel?: string;
  equipmentTypeHint?: string;
  requestedDate?: string;
  timeWindow?: string;
  address?: string;
  comment?: string;
  isUrgent?: boolean;
}) {
  return apiRequest<{ lead: LeadApi; duplicates: LeadApi[] }>('leads', {
    method: 'POST',
    body,
  });
}

export function changeLeadStage(id: string, stage: PipelineStage, reason?: string) {
  return apiRequest<LeadApi>(`leads/${id}/stage`, {
    method: 'POST',
    body: { stage, reason },
  });
}

export function updateLead(
  id: string,
  patch: Partial<{
    contactName: string;
    contactCompany: string | null;
    contactPhone: string;
    source: SourceChannel;
    sourceLabel: string;
    equipmentTypeHint: string | null;
    requestedDate: string | null;
    timeWindow: string | null;
    address: string | null;
    comment: string | null;
    managerId: string | null;
    clientId: string | null;
    isUrgent: boolean;
    isDuplicate: boolean;
  }>,
) {
  return apiRequest<LeadApi>(`leads/${id}`, {
    method: 'PATCH',
    body: patch,
  });
}
