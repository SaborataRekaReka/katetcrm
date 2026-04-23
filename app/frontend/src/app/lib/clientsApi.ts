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

export function createClient(body: CreateClientInput) {
  return apiRequest<{ id: string }>('clients', {
    method: 'POST',
    body,
  });
}

export function updateClient(id: string, patch: Partial<CreateClientInput>) {
  return apiRequest<ClientDetailApi>(`clients/${id}`, {
    method: 'PATCH',
    body: patch,
  });
}

export interface ClientDetailApi extends ClientListItemApi {
  notes: string | null;
  favoriteEquipment: string[];
}

export function getClient(id: string) {
  return apiRequest<ClientDetailApi>(`clients/${id}`);
}
