import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  replayIntegrationEvent,
  retryIntegrationEvent,
  type IntegrationActionResultApi,
} from '../lib/integrationsApi';
import { integrationsQueryKeys } from './useIntegrationsQuery';

function invalidateIntegrations(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: integrationsQueryKeys.all });
}

export function useRetryIntegrationEvent() {
  const qc = useQueryClient();

  return useMutation<
    IntegrationActionResultApi,
    Error,
    { id: string; reason?: string }
  >({
    mutationFn: ({ id, reason }) => retryIntegrationEvent(id, reason),
    onSuccess: (result) => {
      qc.setQueryData(integrationsQueryKeys.detail(result.event.id), result.event);
      invalidateIntegrations(qc);
    },
  });
}

export function useReplayIntegrationEvent() {
  const qc = useQueryClient();

  return useMutation<
    IntegrationActionResultApi,
    Error,
    { id: string; reason?: string }
  >({
    mutationFn: ({ id, reason }) => replayIntegrationEvent(id, reason),
    onSuccess: (result) => {
      qc.setQueryData(integrationsQueryKeys.detail(result.event.id), result.event);
      invalidateIntegrations(qc);
    },
  });
}
