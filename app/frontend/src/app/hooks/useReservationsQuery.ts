import { useQuery } from '@tanstack/react-query';
import { getReservation, listReservations, ReservationListParams } from '../lib/reservationsApi';

export const reservationsQueryKeys = {
  all: ['reservations'] as const,
  list: (params: ReservationListParams) => ['reservations', 'list', params] as const,
  detail: (id: string) => ['reservations', 'detail', id] as const,
};

export function useReservationsQuery(params: ReservationListParams = {}, enabled = true) {
  return useQuery({
    queryKey: reservationsQueryKeys.list(params),
    queryFn: () => listReservations(params),
    enabled,
  });
}

export function useReservationQuery(id: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: reservationsQueryKeys.detail(id ?? ''),
    queryFn: () => getReservation(id as string),
    enabled: enabled && !!id,
  });
}
