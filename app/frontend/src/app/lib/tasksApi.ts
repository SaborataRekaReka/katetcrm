import { apiRequest } from './apiClient';
import type { Task, TaskPriority, TaskStatus } from '../data/mockTasks';

export interface TasksListParams {
  scope?: 'mine' | 'all';
  status?: TaskStatus;
  priority?: TaskPriority;
  query?: string;
  includeArchived?: boolean;
  take?: number;
  skip?: number;
}

export interface TasksListResponseApi {
  items: Task[];
  total: number;
}

export interface TaskLinkedEntityInputApi {
  domain: string;
  id: string;
  label: string;
}

export interface CreateTaskInputApi {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  startDate?: string;
  dueDate?: string | null;
  estimateMinutes?: number;
  tags?: string[];
  linkedEntity?: TaskLinkedEntityInputApi;
}

export interface UpdateTaskInputApi {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  startDate?: string;
  dueDate?: string | null;
  estimateMinutes?: number;
  trackedMinutes?: number;
  tags?: string[];
  linkedEntity?: TaskLinkedEntityInputApi;
}

export interface AddTaskSubtaskInputApi {
  title: string;
  assignee?: string;
  priority?: TaskPriority;
}

export function listTasks(params: TasksListParams = {}) {
  return apiRequest<TasksListResponseApi>('tasks', {
    query: {
      scope: params.scope,
      status: params.status,
      priority: params.priority,
      query: params.query,
      includeArchived: params.includeArchived,
      take: params.take,
      skip: params.skip,
    },
  });
}

export function getTask(id: string) {
  return apiRequest<Task>(`tasks/${id}`);
}

export function createTask(body: CreateTaskInputApi) {
  return apiRequest<Task>('tasks', {
    method: 'POST',
    body,
  });
}

export function updateTask(id: string, patch: UpdateTaskInputApi) {
  return apiRequest<Task>(`tasks/${id}`, {
    method: 'PATCH',
    body: patch,
  });
}

export function updateTaskStatus(id: string, status: TaskStatus) {
  return apiRequest<Task>(`tasks/${id}/status`, {
    method: 'POST',
    body: { status },
  });
}

export function duplicateTask(id: string) {
  return apiRequest<Task>(`tasks/${id}/duplicate`, {
    method: 'POST',
  });
}

export function archiveTask(id: string) {
  return apiRequest<Task>(`tasks/${id}/archive`, {
    method: 'POST',
  });
}

export function addTaskSubtask(id: string, body: AddTaskSubtaskInputApi) {
  return apiRequest<Task>(`tasks/${id}/subtasks`, {
    method: 'POST',
    body,
  });
}
