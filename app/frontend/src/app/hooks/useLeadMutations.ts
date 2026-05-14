import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LeadApi,
  LeadChainDeleteResponse,
  PipelineStage,
  changeLeadStage,
  createLead,
  deleteCurrentLeadRepresentation,
  deleteLeadChain,
  rollbackLeadStage,
  updateLead,
} from '../lib/leadsApi';
import { leadsQueryKeys } from './useLeadsQuery';
import { applicationsQueryKeys } from './useApplicationsQuery';
import { reservationsQueryKeys } from './useReservationsQuery';
import { departuresQueryKeys } from './useDeparturesQuery';
import { completionsQueryKeys } from './useCompletionsQuery';

type CreateLeadInput = Parameters<typeof createLead>[0];
type UpdateLeadInput = Parameters<typeof updateLead>[1];

function invalidateLeadQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: leadsQueryKeys.all });
}

function invalidateLifecycleQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: leadsQueryKeys.all });
  qc.invalidateQueries({ queryKey: applicationsQueryKeys.all });
  qc.invalidateQueries({ queryKey: reservationsQueryKeys.all });
  qc.invalidateQueries({ queryKey: departuresQueryKeys.all });
  qc.invalidateQueries({ queryKey: completionsQueryKeys.all });
}

function invalidateActivity(qc: ReturnType<typeof useQueryClient>, id: string) {
  qc.invalidateQueries({ queryKey: ['activity', 'lead', id] });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation<{ lead: LeadApi; duplicates: LeadApi[] }, Error, CreateLeadInput>({
    mutationFn: (input) => createLead(input),
    onSuccess: () => invalidateLeadQueries(qc),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation<LeadApi, Error, { id: string; patch: UpdateLeadInput }>({
    mutationFn: ({ id, patch }) => updateLead(id, patch),
    onSuccess: (fresh) => {
      // Пишем свежий лид в detail-cache синхронно, чтобы LeadDetailModal
      // отрисовал новое значение сразу после save, не дожидаясь refetch листа.
      qc.setQueryData(leadsQueryKeys.detail(fresh.id), fresh);
      invalidateLeadQueries(qc);
      invalidateActivity(qc, fresh.id);
    },
  });
}

export function useChangeLeadStage() {
  const qc = useQueryClient();
  return useMutation<LeadApi, Error, { id: string; stage: PipelineStage; reason?: string }>({
    mutationFn: ({ id, stage, reason }) => changeLeadStage(id, stage, reason),
    onSuccess: (fresh) => {
      qc.setQueryData(leadsQueryKeys.detail(fresh.id), fresh);
      invalidateLeadQueries(qc);
      invalidateActivity(qc, fresh.id);
    },
  });
}

export function useRollbackLeadStage() {
  const qc = useQueryClient();
  return useMutation<LeadApi, Error, { id: string; reason?: string }>({
    mutationFn: ({ id, reason }) => rollbackLeadStage(id, reason),
    onSuccess: (fresh) => {
      qc.setQueryData(leadsQueryKeys.detail(fresh.id), fresh);
      invalidateLifecycleQueries(qc);
      invalidateActivity(qc, fresh.id);
    },
  });
}

export function useDeleteCurrentLeadRepresentation() {
  const qc = useQueryClient();
  return useMutation<LeadApi, Error, { id: string; reason?: string }>({
    mutationFn: ({ id, reason }) => deleteCurrentLeadRepresentation(id, reason),
    onSuccess: (fresh) => {
      qc.setQueryData(leadsQueryKeys.detail(fresh.id), fresh);
      invalidateLifecycleQueries(qc);
      invalidateActivity(qc, fresh.id);
    },
  });
}

export function useDeleteLeadChain() {
  const qc = useQueryClient();
  return useMutation<LeadChainDeleteResponse, Error, { id: string; reason?: string }>({
    mutationFn: ({ id, reason }) => deleteLeadChain(id, reason),
    onSuccess: (_result, { id }) => {
      qc.removeQueries({ queryKey: leadsQueryKeys.detail(id) });
      invalidateLifecycleQueries(qc);
      invalidateActivity(qc, id);
    },
  });
}
