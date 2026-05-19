/**
 * Global feature flags. Derived from Vite env at build time.
 */
export type CrmWorkflowProfile = 'full' | 'sales-lite';

const rawWorkflowProfile = (import.meta.env.VITE_CRM_WORKFLOW_PROFILE as string | undefined)?.trim();

export const CRM_WORKFLOW_PROFILE: CrmWorkflowProfile =
	rawWorkflowProfile === 'sales-lite' ? 'sales-lite' : 'full';

export const IS_SALES_LITE = CRM_WORKFLOW_PROFILE === 'sales-lite';
export const IS_FULL_WORKFLOW = CRM_WORKFLOW_PROFILE === 'full';

export const USE_API = (import.meta.env.VITE_USE_API as string | undefined) === 'true';
