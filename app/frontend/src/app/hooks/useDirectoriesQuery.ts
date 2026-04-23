import { useQuery } from '@tanstack/react-query';
import {
  listEquipmentCategories,
  listEquipmentTypes,
  listEquipmentUnits,
  listSubcontractors,
} from '../lib/directoriesApi';

export const directoriesQueryKeys = {
  categories: ['directories', 'equipment-categories'] as const,
  types: (categoryId?: string) =>
    ['directories', 'equipment-types', { categoryId: categoryId ?? null }] as const,
  units: (params: { equipmentTypeId?: string; status?: string }) =>
    ['directories', 'equipment-units', params] as const,
  subcontractors: (params: { query?: string; status?: string }) =>
    ['directories', 'subcontractors', params] as const,
};

export function useEquipmentCategoriesQuery(enabled = true) {
  return useQuery({
    queryKey: directoriesQueryKeys.categories,
    queryFn: () => listEquipmentCategories(),
    enabled,
  });
}

export function useEquipmentTypesQuery(categoryId?: string, enabled = true) {
  return useQuery({
    queryKey: directoriesQueryKeys.types(categoryId),
    queryFn: () => listEquipmentTypes(categoryId),
    enabled,
  });
}

export function useEquipmentUnitsQuery(
  params: { equipmentTypeId?: string; status?: string } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: directoriesQueryKeys.units(params),
    queryFn: () => listEquipmentUnits(params),
    enabled,
  });
}

export function useSubcontractorsQuery(
  params: { query?: string; status?: string } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: directoriesQueryKeys.subcontractors(params),
    queryFn: () => listSubcontractors(params),
    enabled,
  });
}
