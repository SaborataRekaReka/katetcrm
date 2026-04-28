import { useQuery } from '@tanstack/react-query';
import { getDeparture, listDepartures, type DepartureListParams } from '../lib/departuresApi';

export const departuresQueryKeys = {
  all: ['departures'] as const,
  list: (params: DepartureListParams) => ['departures', 'list', params] as const,
  detail: (id: string) => ['departures', 'detail', id] as const,
};

export function useDeparturesQuery(params: DepartureListParams = {}, enabled = true) {
  return useQuery({
    queryKey: departuresQueryKeys.list(params),
    queryFn: () => listDepartures(params),
    enabled,
  });
}

export function useDepartureQuery(id: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: departuresQueryKeys.detail(id ?? ''),
    queryFn: () => getDeparture(id as string),
    enabled: enabled && !!id,
  });
}
