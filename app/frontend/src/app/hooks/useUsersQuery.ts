import { useQuery } from '@tanstack/react-query';
import { listManagers } from '../lib/usersApi';

export const usersQueryKeys = {
  managers: ['users', 'managers'] as const,
};

export function useManagersQuery(enabled = true) {
  return useQuery({
    queryKey: usersQueryKeys.managers,
    queryFn: () => listManagers(),
    enabled,
  });
}
