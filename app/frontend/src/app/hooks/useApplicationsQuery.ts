import { useQuery } from '@tanstack/react-query';
import { getApplication, listApplications, ApplicationListParams } from '../lib/applicationsApi';

export const applicationsQueryKeys = {
  all: ['applications'] as const,
  list: (params: ApplicationListParams) => ['applications', 'list', params] as const,
  detail: (id: string) => ['applications', 'detail', id] as const,
};

export function useApplicationsQuery(params: ApplicationListParams = {}, enabled = true) {
  return useQuery({
    queryKey: applicationsQueryKeys.list(params),
    queryFn: () => listApplications(params),
    enabled,
  });
}

export function useApplicationQuery(id: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: applicationsQueryKeys.detail(id ?? ''),
    queryFn: () => getApplication(id as string),
    enabled: enabled && !!id,
  });
}
