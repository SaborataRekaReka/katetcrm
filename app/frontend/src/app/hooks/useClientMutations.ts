import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClientDetailApi,
  CreateClientInput,
  UpdateClientInput,
  createClient,
  updateClient,
} from '../lib/clientsApi';
import { clientsQueryKeys } from './useClientsQuery';

const CLIENTS_ROOT_KEY = ['clients'] as const;

function invalidateClientQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: CLIENTS_ROOT_KEY });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation<{ id: string }, Error, CreateClientInput>({
    mutationFn: (input) => createClient(input),
    onSuccess: () => invalidateClientQueries(qc),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation<ClientDetailApi, Error, { id: string; patch: UpdateClientInput }>({
    mutationFn: ({ id, patch }) => updateClient(id, patch),
    onSuccess: (fresh) => {
      qc.setQueryData(clientsQueryKeys.detail(fresh.id), fresh);
      invalidateClientQueries(qc);
    },
  });
}
