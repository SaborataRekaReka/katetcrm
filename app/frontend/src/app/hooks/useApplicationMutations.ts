import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ApplicationApi,
  updateApplication,
  addApplicationItem,
  updateApplicationItem,
  deleteApplicationItem,
  cancelApplication,
  ApplicationItemApi,
} from '../lib/applicationsApi';
import { applicationsQueryKeys } from './useApplicationsQuery';

type UpdateAppInput = Parameters<typeof updateApplication>[1];
type CreateItemInput = Parameters<typeof addApplicationItem>[1];
type UpdateItemInput = Parameters<typeof updateApplicationItem>[1];

function invalidateApplications(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: applicationsQueryKeys.all });
}

function invalidateActivity(qc: ReturnType<typeof useQueryClient>, id: string) {
  qc.invalidateQueries({ queryKey: ['activity', 'application', id] });
}

export function useUpdateApplication() {
  const qc = useQueryClient();
  return useMutation<ApplicationApi, Error, { id: string; patch: UpdateAppInput }>({
    mutationFn: ({ id, patch }) => updateApplication(id, patch),
    onSuccess: (fresh) => {
      // Пишем свежий объект прямо в detail-cache, чтобы модалка подхватила
      // обновление синхронно (без ожидания refetch'а листа).
      qc.setQueryData(applicationsQueryKeys.detail(fresh.id), fresh);
      invalidateApplications(qc);
      invalidateActivity(qc, fresh.id);
    },
  });
}

export function useCancelApplication() {
  const qc = useQueryClient();
  return useMutation<ApplicationApi, Error, { id: string; reason?: string }>({
    mutationFn: ({ id, reason }) => cancelApplication(id, reason),
    onSuccess: (fresh) => {
      qc.setQueryData(applicationsQueryKeys.detail(fresh.id), fresh);
      invalidateApplications(qc);
      invalidateActivity(qc, fresh.id);
    },
  });
}

export function useAddApplicationItem() {
  const qc = useQueryClient();
  return useMutation<ApplicationItemApi, Error, { applicationId: string; body: CreateItemInput }>({
    mutationFn: ({ applicationId, body }) => addApplicationItem(applicationId, body),
    onSuccess: (fresh) => {
      invalidateApplications(qc);
      // Форсируем рефетч detail-заявки, чтобы секция «Позиции» перерисовалась сразу.
      qc.invalidateQueries({ queryKey: applicationsQueryKeys.detail(fresh.applicationId) });
      invalidateActivity(qc, fresh.applicationId);
    },
  });
}

export function useUpdateApplicationItem() {
  const qc = useQueryClient();
  return useMutation<ApplicationItemApi, Error, { itemId: string; body: UpdateItemInput }>({
    mutationFn: ({ itemId, body }) => updateApplicationItem(itemId, body),
    onSuccess: (fresh) => {
      invalidateApplications(qc);
      qc.invalidateQueries({ queryKey: applicationsQueryKeys.detail(fresh.applicationId) });
      invalidateActivity(qc, fresh.applicationId);
    },
  });
}

export function useDeleteApplicationItem() {
  const qc = useQueryClient();
  // applicationId передаётся вызывающей стороной, т.к. ответ delete — {ok:true}
  // без контекста, а нам нужен точечный invalidate detail+activity.
  return useMutation<{ ok: true }, Error, { itemId: string; applicationId: string }>({
    mutationFn: ({ itemId }) => deleteApplicationItem(itemId),
    onSuccess: (_res, { applicationId }) => {
      invalidateApplications(qc);
      qc.invalidateQueries({ queryKey: applicationsQueryKeys.detail(applicationId) });
      invalidateActivity(qc, applicationId);
    },
  });
}
