import { apiRequest } from './apiClient';

export type ClientTypeUi = 'company' | 'person';
export type ClientListTag = 'vip' | 'repeat' | 'new' | 'debt';

export interface ClientListItemApi {
  id: string;
  name: string;
  type: ClientTypeUi;
  company: string | null;
  phone: string;
  email: string | null;
  totalOrders: number;
  activeApplications: number;
  activeReservations: number;
  lastOrderDate: string | null;
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
  tags: ClientListTag[];
}

export interface ClientListParams {
  query?: string;
  take?: number;
  skip?: number;
}

export interface ClientListResponse {
  items: ClientListItemApi[];
  total: number;
}

export function listClients(params: ClientListParams = {}) {
  return apiRequest<ClientListResponse>('clients', {
    query: {
      query: params.query,
      take: params.take,
      skip: params.skip,
    },
  });
}

export interface CreateClientInput {
  name: string;
  company?: string;
  phone: string;
  email?: string;
  notes?: string;
  favoriteEquipment?: string[];
}

export interface ClientContactInput {
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
}

export interface ClientRequisitesInput {
  inn?: string;
  kpp?: string;
  ogrn?: string;
  legalAddress?: string;
  bankName?: string;
  bankAccount?: string;
  correspondentAccount?: string;
  bik?: string;
}

export interface UpdateClientInput extends Partial<CreateClientInput> {
  contacts?: ClientContactInput[];
  requisites?: ClientRequisitesInput;
}

export function createClient(body: CreateClientInput) {
  return apiRequest<{ id: string }>('clients', {
    method: 'POST',
    body,
  });
}

export function updateClient(id: string, patch: UpdateClientInput) {
  return apiRequest<ClientDetailApi>(`clients/${id}`, {
    method: 'PATCH',
    body: patch,
  });
}

export interface ClientDetailApi extends ClientListItemApi {
  notes: string | null;
  workingNotes: string | null;
  favoriteEquipment: string[];
  contacts: Array<{
    id: string;
    name: string;
    role: string | null;
    phone: string | null;
    email: string | null;
    isPrimary: boolean;
  }>;
  requisites: {
    inn: string | null;
    kpp: string | null;
    ogrn: string | null;
    legalAddress: string | null;
    bankName: string | null;
    bankAccount: string | null;
    correspondentAccount: string | null;
    bik: string | null;
  } | null;
  assignedTags: Array<{
    id: string;
    label: string;
    tone: 'success' | 'caution' | 'progress' | 'warning' | 'muted' | 'source';
    isSystem: boolean;
  }>;
}

export function getClient(id: string) {
  return apiRequest<ClientDetailApi>(`clients/${id}`);
}
