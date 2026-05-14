import { useQuery } from '@tanstack/react-query';
import {
  listBugReports,
  type BugReportListParams,
} from '../lib/bugReportsApi';

export const bugReportsQueryKeys = {
  all: ['bug-reports'] as const,
  list: (params: BugReportListParams) => ['bug-reports', params] as const,
};

export function useBugReportsQuery(params: BugReportListParams = {}, enabled = true) {
  return useQuery({
    queryKey: bugReportsQueryKeys.list(params),
    queryFn: () => listBugReports(params),
    enabled,
    refetchInterval: 20_000,
  });
}
