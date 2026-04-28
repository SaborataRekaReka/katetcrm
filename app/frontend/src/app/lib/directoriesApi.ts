import { apiRequest } from './apiClient';

export interface EquipmentCategoryApi {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentTypeApi {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  category?: EquipmentCategoryApi | null;
  _count?: { units: number };
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentUnitApi {
  id: string;
  name: string;
  equipmentTypeId: string;
  equipmentType?: {
    id: string;
    name: string;
    category?: { id: string; name: string } | null;
  };
  year: number | null;
  plateNumber: string | null;
  notes: string | null;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface SubcontractorApi {
  id: string;
  name: string;
  specialization: string | null;
  region: string | null;
  rating: number | null;
  contactPhone: string | null;
  contactEmail: string | null;
  notes: string | null;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export const listEquipmentCategories = () =>
  apiRequest<EquipmentCategoryApi[]>('equipment-categories');

export const listEquipmentTypes = (categoryId?: string) =>
  apiRequest<EquipmentTypeApi[]>('equipment-types', { query: { categoryId } });

export const listEquipmentUnits = (params: { equipmentTypeId?: string; status?: string } = {}) =>
  apiRequest<EquipmentUnitApi[]>('equipment-units', { query: params as Record<string, string | undefined> });

export const listSubcontractors = (params: { query?: string; status?: string } = {}) =>
  apiRequest<SubcontractorApi[]>('subcontractors', { query: params as Record<string, string | undefined> });

/* ---------- Mutations (admin only) ---------- */

export const createEquipmentCategory = (body: { name: string }) =>
  apiRequest<EquipmentCategoryApi>('equipment-categories', { method: 'POST', body });

export const updateEquipmentCategory = (id: string, body: { name: string }) =>
  apiRequest<EquipmentCategoryApi>(`equipment-categories/${id}`, { method: 'PATCH', body });

export const createEquipmentType = (body: Partial<Pick<EquipmentTypeApi, 'name' | 'description' | 'categoryId'>>) =>
  apiRequest<EquipmentTypeApi>('equipment-types', { method: 'POST', body });

export const updateEquipmentType = (id: string, body: Partial<Pick<EquipmentTypeApi, 'name' | 'description' | 'categoryId'>>) =>
  apiRequest<EquipmentTypeApi>(`equipment-types/${id}`, { method: 'PATCH', body });

export const createEquipmentUnit = (body: Partial<Omit<EquipmentUnitApi, 'id' | 'createdAt' | 'updatedAt' | 'equipmentType'>>) =>
  apiRequest<EquipmentUnitApi>('equipment-units', { method: 'POST', body });

export const updateEquipmentUnit = (id: string, body: Partial<Omit<EquipmentUnitApi, 'id' | 'createdAt' | 'updatedAt' | 'equipmentType'>>) =>
  apiRequest<EquipmentUnitApi>(`equipment-units/${id}`, { method: 'PATCH', body });

export const createSubcontractor = (body: Partial<Omit<SubcontractorApi, 'id' | 'createdAt' | 'updatedAt'>>) =>
  apiRequest<SubcontractorApi>('subcontractors', { method: 'POST', body });

export const updateSubcontractor = (id: string, body: Partial<Omit<SubcontractorApi, 'id' | 'createdAt' | 'updatedAt'>>) =>
  apiRequest<SubcontractorApi>(`subcontractors/${id}`, { method: 'PATCH', body });
