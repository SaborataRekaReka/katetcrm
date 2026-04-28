import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserApi,
  CreateUserInput,
  PermissionCapabilityApi,
  UpdatePermissionCapabilityInput,
  UpdateUserInput,
  createUser,
  updatePermissionCapability,
  updateUser,
} from '../lib/usersApi';
import { usersQueryKeys } from './useUsersQuery';

const USERS_ROOT_KEY = ['users'] as const;

function invalidateUserQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: USERS_ROOT_KEY });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation<UserApi, Error, CreateUserInput>({
    mutationFn: (input) => createUser(input),
    onSuccess: () => invalidateUserQueries(qc),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation<UserApi, Error, { id: string; patch: UpdateUserInput }>({
    mutationFn: ({ id, patch }) => updateUser(id, patch),
    onSuccess: () => invalidateUserQueries(qc),
  });
}

export function useUpdatePermissionCapability() {
  const qc = useQueryClient();
  return useMutation<
    PermissionCapabilityApi,
    Error,
    { capabilityId: string; patch: UpdatePermissionCapabilityInput }
  >({
    mutationFn: ({ capabilityId, patch }) => updatePermissionCapability(capabilityId, patch),
    onSuccess: () => invalidateUserQueries(qc),
  });
}
