import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createCompletion,
  updateCompletion,
  type CompletionApi,
  type CompletionOutcome,
  type UpdateCompletionPatch,
} from '../lib/completionsApi';
import { completionsQueryKeys } from './useCompletionsQuery';
import { departuresQueryKeys } from './useDeparturesQuery';
import { applicationsQueryKeys } from './useApplicationsQuery';
import { reservationsQueryKeys } from './useReservationsQuery';
import { leadsQueryKeys } from './useLeadsQuery';

function invalidateOpsAndFunnel(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: completionsQueryKeys.all });
  qc.invalidateQueries({ queryKey: departuresQueryKeys.all });
  qc.invalidateQueries({ queryKey: applicationsQueryKeys.all });
  qc.invalidateQueries({ queryKey: reservationsQueryKeys.all });
  qc.invalidateQueries({ queryKey: leadsQueryKeys.all });
}

export function useCreateCompletion() {
  const qc = useQueryClient();
  return useMutation<
    CompletionApi,
    Error,
    {
      departureId: string;
      outcome: CompletionOutcome;
      completionNote?: string;
      unqualifiedReason?: string;
    }
  >({
    mutationFn: ({ departureId, outcome, completionNote, unqualifiedReason }) =>
      createCompletion({
        departureId,
        outcome,
        completionNote,
        unqualifiedReason,
      }),
    onSuccess: (fresh) => {
      qc.setQueryData(completionsQueryKeys.detail(fresh.id), fresh);
      invalidateOpsAndFunnel(qc);
    },
  });
}

export function useUpdateCompletion() {
  const qc = useQueryClient();
  return useMutation<CompletionApi, Error, { id: string; patch: UpdateCompletionPatch }>({
    mutationFn: ({ id, patch }) => updateCompletion(id, patch),
    onSuccess: (fresh) => {
      qc.setQueryData(completionsQueryKeys.detail(fresh.id), fresh);
      invalidateOpsAndFunnel(qc);
    },
  });
}
