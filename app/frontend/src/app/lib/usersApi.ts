import { apiRequest } from './apiClient';

export interface ManagerApi {
  id: string;
  fullName: string;
  email: string;
}

export const listManagers = () => apiRequest<ManagerApi[]>('users/managers');
