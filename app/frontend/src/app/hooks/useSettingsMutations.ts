import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UpdateWorkspaceSectionInput,
  WorkspaceSettingSectionApi,
  updateWorkspaceSection,
} from '../lib/settingsApi';
import { settingsQueryKeys } from './useSettingsQuery';

export function useUpdateWorkspaceSection() {
  const queryClient = useQueryClient();

  return useMutation<
    WorkspaceSettingSectionApi,
    Error,
    { sectionId: string; patch: UpdateWorkspaceSectionInput }
  >({
    mutationFn: ({ sectionId, patch }) => updateWorkspaceSection(sectionId, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsQueryKeys.workspace });
    },
  });
}
