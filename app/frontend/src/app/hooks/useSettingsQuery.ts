import { useQuery } from '@tanstack/react-query';
import { getWorkspaceSettings } from '../lib/settingsApi';

export const settingsQueryKeys = {
  workspace: ['settings', 'workspace'] as const,
};

export function useWorkspaceSettingsQuery(enabled = true) {
  return useQuery({
    queryKey: settingsQueryKeys.workspace,
    queryFn: getWorkspaceSettings,
    enabled,
  });
}
