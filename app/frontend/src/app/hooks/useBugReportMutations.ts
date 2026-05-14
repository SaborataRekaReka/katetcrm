import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createBugReport,
  deleteBugReport,
  type CreateBugReportInputApi,
  type BugReportApi,
  type BugReportStatusApi,
  updateBugReportStatus,
} from '../lib/bugReportsApi';
import { bugReportsQueryKeys } from './useBugReportsQuery';

function invalidateBugReports(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: bugReportsQueryKeys.all });
}

export function useCreateBugReportMutation() {
  const qc = useQueryClient();
  return useMutation<BugReportApi, Error, CreateBugReportInputApi>({
    mutationFn: (payload) => createBugReport(payload),
    onSuccess: () => invalidateBugReports(qc),
  });
}

export function useUpdateBugReportStatusMutation() {
  const qc = useQueryClient();
  return useMutation<BugReportApi, Error, { id: string; status: BugReportStatusApi }>({
    mutationFn: ({ id, status }) => updateBugReportStatus(id, status),
    onSuccess: () => invalidateBugReports(qc),
  });
}

export function useDeleteBugReportMutation() {
  const qc = useQueryClient();
  return useMutation<{ ok: true; id: string }, Error, { id: string }>({
    mutationFn: ({ id }) => deleteBugReport(id),
    onSuccess: () => invalidateBugReports(qc),
  });
}
