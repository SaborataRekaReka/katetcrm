import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Task, TaskStatus } from '../data/mockTasks';
import {
  addTaskSubtask,
  archiveTask,
  createTask,
  duplicateTask,
  type AddTaskSubtaskInputApi,
  type CreateTaskInputApi,
  updateTask,
  type UpdateTaskInputApi,
  updateTaskStatus,
} from '../lib/tasksApi';
import { tasksQueryKeys } from './useTasksQuery';

function invalidateTasks(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: tasksQueryKeys.all });
}

export function useCreateTaskMutation() {
  const qc = useQueryClient();
  return useMutation<Task, Error, CreateTaskInputApi>({
    mutationFn: (payload) => createTask(payload),
    onSuccess: () => invalidateTasks(qc),
  });
}

export function useUpdateTaskMutation() {
  const qc = useQueryClient();
  return useMutation<Task, Error, { id: string; patch: UpdateTaskInputApi }>({
    mutationFn: ({ id, patch }) => updateTask(id, patch),
    onSuccess: () => invalidateTasks(qc),
  });
}

export function useUpdateTaskStatusMutation() {
  const qc = useQueryClient();
  return useMutation<Task, Error, { id: string; status: TaskStatus }>({
    mutationFn: ({ id, status }) => updateTaskStatus(id, status),
    onSuccess: () => invalidateTasks(qc),
  });
}

export function useDuplicateTaskMutation() {
  const qc = useQueryClient();
  return useMutation<Task, Error, { id: string }>({
    mutationFn: ({ id }) => duplicateTask(id),
    onSuccess: () => invalidateTasks(qc),
  });
}

export function useArchiveTaskMutation() {
  const qc = useQueryClient();
  return useMutation<Task, Error, { id: string }>({
    mutationFn: ({ id }) => archiveTask(id),
    onSuccess: () => invalidateTasks(qc),
  });
}

export function useAddTaskSubtaskMutation() {
  const qc = useQueryClient();
  return useMutation<Task, Error, { id: string; payload: AddTaskSubtaskInputApi }>({
    mutationFn: ({ id, payload }) => addTaskSubtask(id, payload),
    onSuccess: () => invalidateTasks(qc),
  });
}
