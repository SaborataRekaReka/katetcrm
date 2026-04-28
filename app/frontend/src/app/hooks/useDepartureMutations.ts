import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  arriveDeparture,
  cancelDeparture,
  completeDeparture,
  startDeparture,
  updateDeparture,
  type CompletionOutcome,
  type DepartureApi,
  type UpdateDeparturePatch,
} from '../lib/departuresApi';
import { departuresQueryKeys } from './useDeparturesQuery';
import { completionsQueryKeys } from './useCompletionsQuery';
import { applicationsQueryKeys } from './useApplicationsQuery';
import { reservationsQueryKeys } from './useReservationsQuery';
import { leadsQueryKeys } from './useLeadsQuery';

function invalidateOpsAndFunnel(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: departuresQueryKeys.all });
  qc.invalidateQueries({ queryKey: completionsQueryKeys.all });
  qc.invalidateQueries({ queryKey: applicationsQueryKeys.all });
  qc.invalidateQueries({ queryKey: reservationsQueryKeys.all });
  qc.invalidateQueries({ queryKey: leadsQueryKeys.all });
}

export function useUpdateDeparture() {
  const qc = useQueryClient();
  return useMutation<DepartureApi, Error, { id: string; patch: UpdateDeparturePatch }>({
    mutationFn: ({ id, patch }) => updateDeparture(id, patch),
    onSuccess: (fresh) => {
      qc.setQueryData(departuresQueryKeys.detail(fresh.id), fresh);
      invalidateOpsAndFunnel(qc);
    },
  });
}

export function useStartDeparture() {
  const qc = useQueryClient();
  return useMutation<DepartureApi, Error, string>({
    mutationFn: (id) => startDeparture(id),
    onSuccess: (fresh) => {
      qc.setQueryData(departuresQueryKeys.detail(fresh.id), fresh);
      invalidateOpsAndFunnel(qc);
    },
  });
}

export function useArriveDeparture() {
  const qc = useQueryClient();
  return useMutation<DepartureApi, Error, string>({
    mutationFn: (id) => arriveDeparture(id),
    onSuccess: (fresh) => {
      qc.setQueryData(departuresQueryKeys.detail(fresh.id), fresh);
      invalidateOpsAndFunnel(qc);
    },
  });
}

export function useCancelDeparture() {
  const qc = useQueryClient();
  return useMutation<DepartureApi, Error, { id: string; reason?: string }>({
    mutationFn: ({ id, reason }) => cancelDeparture(id, reason),
    onSuccess: (fresh) => {
      qc.setQueryData(departuresQueryKeys.detail(fresh.id), fresh);
      invalidateOpsAndFunnel(qc);
    },
  });
}

export function useCompleteDeparture() {
  const qc = useQueryClient();
  return useMutation<
    DepartureApi,
    Error,
    {
      id: string;
      outcome: CompletionOutcome;
      completionNote?: string;
      unqualifiedReason?: string;
    }
  >({
    mutationFn: ({ id, outcome, completionNote, unqualifiedReason }) =>
      completeDeparture(id, {
        outcome,
        completionNote,
        unqualifiedReason,
      }),
    onSuccess: (fresh) => {
      qc.setQueryData(departuresQueryKeys.detail(fresh.id), fresh);
      invalidateOpsAndFunnel(qc);
    },
  });
}
