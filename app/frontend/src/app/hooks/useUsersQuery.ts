import { useQuery } from '@tanstack/react-query';
import {
  getPermissionsMatrix,
  listManagers,
  listUsers,
  UsersListParams,
} from '../lib/usersApi';

export const usersQueryKeys = {
  all: ['users'] as const,
  list: (params: UsersListParams) => ['users', 'list', params] as const,
  managers: ['users', 'managers'] as const,
  permissionsMatrix: ['users', 'permissions-matrix'] as const,
};

export function useUsersQuery(params: UsersListParams = {}, enabled = true) {
  return useQuery({
    queryKey: usersQueryKeys.list(params),
    queryFn: () => listUsers(params),
    enabled,
  });
}

export function useManagersQuery(enabled = true) {
  return useQuery({
    queryKey: usersQueryKeys.managers,
    queryFn: () => listManagers(),
    enabled,
  });
}

export function usePermissionsMatrixQuery(enabled = true) {
  return useQuery({
    queryKey: usersQueryKeys.permissionsMatrix,
    queryFn: () => getPermissionsMatrix(),
    enabled,
  });
}
