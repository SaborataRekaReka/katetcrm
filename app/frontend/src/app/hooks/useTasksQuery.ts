import { useQuery } from '@tanstack/react-query';
import { getTask, listTasks, type TasksListParams } from '../lib/tasksApi';

export const tasksQueryKeys = {
  all: ['tasks'] as const,
  list: (params: TasksListParams) => ['tasks', 'list', params] as const,
  detail: (id: string) => ['tasks', 'detail', id] as const,
};

export function useTasksQuery(params: TasksListParams = {}, enabled = true) {
  return useQuery({
    queryKey: tasksQueryKeys.list(params),
    queryFn: () => listTasks(params),
    enabled,
  });
}

export function useTaskQuery(id: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: tasksQueryKeys.detail(id ?? ''),
    queryFn: () => getTask(id as string),
    enabled: enabled && !!id,
  });
}
