import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createEquipmentCategory,
  createEquipmentType,
  createEquipmentUnit,
  createSubcontractor,
  deleteEquipmentCategory,
  deleteEquipmentType,
  deleteEquipmentUnit,
  deleteSubcontractor,
  updateEquipmentCategory,
  updateEquipmentType,
  updateEquipmentUnit,
  updateSubcontractor,
  type EquipmentCategoryApi,
  type EquipmentTypeApi,
  type EquipmentUnitApi,
  type SubcontractorApi,
} from '../lib/directoriesApi';

/**
 * Мутации справочников. После успеха инвалидируем все ключи directories,
 * чтобы и списки, и typeahead'ы в модалках брони подтянули свежие данные.
 */
function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['directories'] });
}

export function useCreateEquipmentCategory() {
  const qc = useQueryClient();
  return useMutation<EquipmentCategoryApi, Error, { name: string }>({
    mutationFn: (body) => createEquipmentCategory(body),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateEquipmentCategory() {
  const qc = useQueryClient();
  return useMutation<EquipmentCategoryApi, Error, { id: string; body: { name: string } }>({
    mutationFn: ({ id, body }) => updateEquipmentCategory(id, body),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteEquipmentCategory() {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, Error, { id: string }>({
    mutationFn: ({ id }) => deleteEquipmentCategory(id),
    onSuccess: () => invalidateAll(qc),
  });
}

type EquipmentTypeInput = Parameters<typeof createEquipmentType>[0];

export function useCreateEquipmentType() {
  const qc = useQueryClient();
  return useMutation<EquipmentTypeApi, Error, EquipmentTypeInput>({
    mutationFn: (body) => createEquipmentType(body),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateEquipmentType() {
  const qc = useQueryClient();
  return useMutation<EquipmentTypeApi, Error, { id: string; body: EquipmentTypeInput }>({
    mutationFn: ({ id, body }) => updateEquipmentType(id, body),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteEquipmentType() {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, Error, { id: string }>({
    mutationFn: ({ id }) => deleteEquipmentType(id),
    onSuccess: () => invalidateAll(qc),
  });
}

type EquipmentUnitInput = Parameters<typeof createEquipmentUnit>[0];

export function useCreateEquipmentUnit() {
  const qc = useQueryClient();
  return useMutation<EquipmentUnitApi, Error, EquipmentUnitInput>({
    mutationFn: (body) => createEquipmentUnit(body),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateEquipmentUnit() {
  const qc = useQueryClient();
  return useMutation<EquipmentUnitApi, Error, { id: string; body: EquipmentUnitInput }>({
    mutationFn: ({ id, body }) => updateEquipmentUnit(id, body),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteEquipmentUnit() {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, Error, { id: string }>({
    mutationFn: ({ id }) => deleteEquipmentUnit(id),
    onSuccess: () => invalidateAll(qc),
  });
}

type SubcontractorInput = Parameters<typeof createSubcontractor>[0];

export function useCreateSubcontractor() {
  const qc = useQueryClient();
  return useMutation<SubcontractorApi, Error, SubcontractorInput>({
    mutationFn: (body) => createSubcontractor(body),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateSubcontractor() {
  const qc = useQueryClient();
  return useMutation<SubcontractorApi, Error, { id: string; body: SubcontractorInput }>({
    mutationFn: ({ id, body }) => updateSubcontractor(id, body),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteSubcontractor() {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, Error, { id: string }>({
    mutationFn: ({ id }) => deleteSubcontractor(id),
    onSuccess: () => invalidateAll(qc),
  });
}
