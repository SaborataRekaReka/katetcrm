import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createReservation,
  updateReservation,
  releaseReservation,
  ReservationApi,
} from '../lib/reservationsApi';
import { reservationsQueryKeys } from './useReservationsQuery';
import { applicationsQueryKeys } from './useApplicationsQuery';

type CreateInput = Parameters<typeof createReservation>[0];
type UpdateInput = Parameters<typeof updateReservation>[1];

function invalidateReservations(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: reservationsQueryKeys.all });
  // Бронь влияет на positionsReserved/hasAnyConflict/applicationGroup заявки.
  qc.invalidateQueries({ queryKey: applicationsQueryKeys.all });
}

function invalidateActivity(qc: ReturnType<typeof useQueryClient>, id: string) {
  qc.invalidateQueries({ queryKey: ['activity', 'reservation', id] });
}

export function useCreateReservation() {
  const qc = useQueryClient();
  return useMutation<ReservationApi, Error, CreateInput>({
    mutationFn: (input) => createReservation(input),
    onSuccess: () => invalidateReservations(qc),
  });
}

export function useUpdateReservation() {
  const qc = useQueryClient();
  return useMutation<ReservationApi, Error, { id: string; patch: UpdateInput }>({
    mutationFn: ({ id, patch }) => updateReservation(id, patch),
    onSuccess: (fresh) => {
      qc.setQueryData(reservationsQueryKeys.detail(fresh.id), fresh);
      invalidateReservations(qc);
      invalidateActivity(qc, fresh.id);
    },
  });
}

export function useReleaseReservation() {
  const qc = useQueryClient();
  return useMutation<ReservationApi, Error, { id: string; reason?: string }>({
    mutationFn: ({ id, reason }) => releaseReservation(id, reason),
    onSuccess: (fresh) => {
      qc.setQueryData(reservationsQueryKeys.detail(fresh.id), fresh);
      invalidateReservations(qc);
      invalidateActivity(qc, fresh.id);
    },
  });
}
