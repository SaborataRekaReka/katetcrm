import { apiRequest } from './apiClient';

export type IntegrationChannel = 'site' | 'mango' | 'telegram' | 'max';

export type IntegrationEventStatus =
  | 'received'
  | 'processed'
  | 'failed'
  | 'duplicate'
  | 'replayed';

export interface IntegrationEventApi {
  id: string;
  channel: IntegrationChannel;
  externalId: string | null;
  idempotencyKey: string;
  correlationId: string | null;
  payload: unknown;
  payloadSummary: unknown;
  status: IntegrationEventStatus;
  retryCount: number;
  errorCode: string | null;
  errorClass: string | null;
  errorMessage: string | null;
  relatedLeadId: string | null;
  receivedAt: string;
  processedAt: string | null;
  replayedAt: string | null;
}

export interface IntegrationListParams {
  channel?: IntegrationChannel;
  status?: IntegrationEventStatus;
  query?: string;
  from?: string;
  to?: string;
  take?: number;
  skip?: number;
}

export interface IntegrationFailureApi {
  errorClass: 'validation' | 'business_rule' | 'transient' | 'unknown';
  errorCode: string;
  errorMessage: string;
  transient: boolean;
}

export interface IntegrationActionResultApi {
  event: IntegrationEventApi;
  processed: boolean;
  failure?: IntegrationFailureApi;
}

export function listIntegrationEvents(params: IntegrationListParams = {}) {
  return apiRequest<{ items: IntegrationEventApi[]; total: number }>('integrations/events', {
    query: {
      channel: params.channel,
      status: params.status,
      query: params.query,
      from: params.from,
      to: params.to,
      take: params.take,
      skip: params.skip,
    },
  });
}

export function getIntegrationEvent(id: string) {
  return apiRequest<IntegrationEventApi>(`integrations/events/${id}`);
}

export function retryIntegrationEvent(id: string, reason?: string) {
  return apiRequest<IntegrationActionResultApi>(`integrations/events/${id}/retry`, {
    method: 'POST',
    body: reason ? { reason } : {},
  });
}

export function replayIntegrationEvent(id: string, reason?: string) {
  return apiRequest<IntegrationActionResultApi>(`integrations/events/${id}/replay`, {
    method: 'POST',
    body: reason ? { reason } : {},
  });
}
