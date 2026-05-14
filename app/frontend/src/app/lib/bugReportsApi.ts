import { apiRequest } from './apiClient';

export type BugReportSeverityApi = 'low' | 'normal' | 'high' | 'blocker';
export type BugReportStatusApi = 'open' | 'resolved';

export interface BugReportApi {
  id: string;
  title: string;
  description: string;
  steps: string | null;
  expected: string | null;
  routePath: string | null;
  severity: BugReportSeverityApi;
  status: BugReportStatusApi;
  reporterId: string | null;
  reporterName: string | null;
  resolvedAt: string | null;
  resolvedById: string | null;
  resolvedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BugReportListResponseApi {
  items: BugReportApi[];
  total: number;
}

export interface BugReportListParams {
  status?: BugReportStatusApi;
  severity?: BugReportSeverityApi;
  query?: string;
  take?: number;
  skip?: number;
}

export interface CreateBugReportInputApi {
  title: string;
  description: string;
  steps?: string;
  expected?: string;
  routePath?: string;
  severity?: BugReportSeverityApi;
}

export function listBugReports(params: BugReportListParams = {}) {
  return apiRequest<BugReportListResponseApi>('bug-reports', {
    query: {
      status: params.status,
      severity: params.severity,
      query: params.query,
      take: params.take,
      skip: params.skip,
    },
  });
}

export function createBugReport(body: CreateBugReportInputApi) {
  return apiRequest<BugReportApi>('bug-reports', {
    method: 'POST',
    body,
  });
}

export function updateBugReportStatus(id: string, status: BugReportStatusApi) {
  return apiRequest<BugReportApi>(`bug-reports/${id}/status`, {
    method: 'POST',
    body: { status },
  });
}

export function deleteBugReport(id: string) {
  return apiRequest<{ ok: true; id: string }>(`bug-reports/${id}`, {
    method: 'DELETE',
  });
}
