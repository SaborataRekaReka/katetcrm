import { apiRequest } from './apiClient';

export interface WorkspaceSettingRowApi {
  label: string;
  value: string;
}

export interface WorkspaceSettingSectionApi {
  id: string;
  title: string;
  description: string;
  rows: WorkspaceSettingRowApi[];
}

export interface WorkspaceSettingsApi {
  sections: WorkspaceSettingSectionApi[];
}

export interface UpdateWorkspaceSectionInput {
  title?: string;
  description?: string;
  rows?: WorkspaceSettingRowApi[];
}

export function getWorkspaceSettings() {
  return apiRequest<WorkspaceSettingsApi>('settings/workspace');
}

export function updateWorkspaceSection(
  sectionId: string,
  patch: UpdateWorkspaceSectionInput,
) {
  return apiRequest<WorkspaceSettingSectionApi>(`settings/workspace/sections/${sectionId}`, {
    method: 'PATCH',
    body: patch,
  });
}
