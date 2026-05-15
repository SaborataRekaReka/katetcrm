import { useQuery } from '@tanstack/react-query';
import {
  getIntegrationEvent,
  getMangoCallRoutingSettings,
  getSiteLeadRoutingSettings,
  listIntegrationEvents,
  type IntegrationListParams,
} from '../lib/integrationsApi';

export const integrationsQueryKeys = {
  all: ['integrations-events'] as const,
  list: (params: IntegrationListParams) => ['integrations-events', 'list', params] as const,
  detail: (id: string) => ['integrations-events', 'detail', id] as const,
  mangoCallRouting: ['integrations-events', 'mango-call-routing'] as const,
  siteLeadRouting: ['integrations-events', 'site-lead-routing'] as const,
};

export function useIntegrationEventsQuery(
  params: IntegrationListParams = {},
  enabled = true,
) {
  return useQuery({
    queryKey: integrationsQueryKeys.list(params),
    queryFn: () => listIntegrationEvents(params),
    enabled,
    refetchInterval: 30_000,
  });
}

export function useIntegrationEventQuery(
  id: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: integrationsQueryKeys.detail(id ?? ''),
    queryFn: () => getIntegrationEvent(id as string),
    enabled: enabled && !!id,
    refetchInterval: 30_000,
  });
}

export function useMangoCallRoutingSettingsQuery(enabled = true) {
  return useQuery({
    queryKey: integrationsQueryKeys.mangoCallRouting,
    queryFn: () => getMangoCallRoutingSettings(),
    enabled,
  });
}

export function useSiteLeadRoutingSettingsQuery(enabled = true) {
  return useQuery({
    queryKey: integrationsQueryKeys.siteLeadRouting,
    queryFn: () => getSiteLeadRoutingSettings(),
    enabled,
  });
}
