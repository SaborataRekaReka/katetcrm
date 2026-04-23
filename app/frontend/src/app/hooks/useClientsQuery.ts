import { useQuery } from '@tanstack/react-query';
import { getClient, listClients, ClientListParams } from '../lib/clientsApi';

export const clientsQueryKeys = {
  all: ['clients'] as const,
  list: (params: ClientListParams) => ['clients', 'list', params] as const,
  detail: (id: string) => ['clients', 'detail', id] as const,
};

export function useClientsQuery(params: ClientListParams = {}, enabled = true) {
  return useQuery({
    queryKey: clientsQueryKeys.list(params),
    queryFn: () => listClients(params),
    enabled,
  });
}

export function useClientQuery(id: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: clientsQueryKeys.detail(id ?? ''),
    queryFn: () => getClient(id as string),
    enabled: enabled && !!id,
  });
}
