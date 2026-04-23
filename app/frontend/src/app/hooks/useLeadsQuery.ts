import { useQuery } from '@tanstack/react-query';
import { getLead, listLeads, LeadListParams } from '../lib/leadsApi';

export const leadsQueryKeys = {
  all: ['leads'] as const,
  list: (params: LeadListParams) => ['leads', 'list', params] as const,
  detail: (id: string) => ['leads', 'detail', id] as const,
};

export function useLeadsQuery(params: LeadListParams = {}, enabled = true) {
  return useQuery({
    queryKey: leadsQueryKeys.list(params),
    queryFn: () => listLeads(params),
    enabled,
  });
}

export function useLeadQuery(id: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: leadsQueryKeys.detail(id ?? ''),
    queryFn: () => getLead(id as string),
    enabled: enabled && !!id,
  });
}
