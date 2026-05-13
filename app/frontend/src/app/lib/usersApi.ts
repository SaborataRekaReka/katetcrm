import { apiRequest } from './apiClient';

export type UserRole = 'admin' | 'manager';

export interface UserApi {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ManagerApi {
  id: string;
  fullName: string;
  email: string;
}

export interface UsersListParams {
  role?: UserRole;
  query?: string;
  isActive?: boolean;
}

export interface UsersListResponse {
  items: UserApi[];
  total: number;
}

export interface PermissionCapabilityApi {
  id: string;
  label: string;
  matrix: Record<UserRole, boolean>;
}

export interface PermissionsMatrixApi {
  roles: UserRole[];
  capabilities: PermissionCapabilityApi[];
}

export interface UpdatePermissionCapabilityInput {
  label?: string;
  admin?: boolean;
  manager?: boolean;
}

export function listUsers(params: UsersListParams = {}) {
  return apiRequest<UsersListResponse>('users', {
    query: {
      role: params.role,
      query: params.query,
      isActive: params.isActive,
    },
  });
}

export interface CreateUserInput {
  email: string;
  fullName: string;
  password: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UpdateUserInput {
  email?: string;
  fullName?: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
}

export function createUser(body: CreateUserInput) {
  return apiRequest<UserApi>('users', {
    method: 'POST',
    body,
  });
}

export function updateUser(id: string, patch: UpdateUserInput) {
  return apiRequest<UserApi>(`users/${id}`, {
    method: 'PATCH',
    body: patch,
  });
}

export function getPermissionsMatrix() {
  return apiRequest<PermissionsMatrixApi>('users/permissions-matrix');
}

export function updatePermissionCapability(
  capabilityId: string,
  patch: UpdatePermissionCapabilityInput,
) {
  return apiRequest<PermissionCapabilityApi>(`users/permissions-matrix/${capabilityId}`, {
    method: 'PATCH',
    body: patch,
  });
}

export const listManagers = () => apiRequest<ManagerApi[]>('users/managers');
