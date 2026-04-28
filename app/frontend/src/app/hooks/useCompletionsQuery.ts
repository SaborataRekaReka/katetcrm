import { useQuery } from '@tanstack/react-query';
import {
  getCompletion,
  listCompletions,
  listPendingCompletions,
  type CompletionListParams,
  type PendingCompletionListParams,
} from '../lib/completionsApi';

export const completionsQueryKeys = {
  all: ['completions'] as const,
  list: (params: CompletionListParams) => ['completions', 'list', params] as const,
  pending: (params: PendingCompletionListParams) => ['completions', 'pending', params] as const,
  detail: (id: string) => ['completions', 'detail', id] as const,
};

export function useCompletionsQuery(params: CompletionListParams = {}, enabled = true) {
  return useQuery({
    queryKey: completionsQueryKeys.list(params),
    queryFn: () => listCompletions(params),
    enabled,
  });
}

export function usePendingCompletionsQuery(
  params: PendingCompletionListParams = {},
  enabled = true,
) {
  return useQuery({
    queryKey: completionsQueryKeys.pending(params),
    queryFn: () => listPendingCompletions(params),
    enabled,
  });
}

export function useCompletionQuery(id: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: completionsQueryKeys.detail(id ?? ''),
    queryFn: () => getCompletion(id as string),
    enabled: enabled && !!id,
  });
}
