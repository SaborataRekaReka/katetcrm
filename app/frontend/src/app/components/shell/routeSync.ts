/**
 * Lightweight URL ↔ layout-store sync.
 *
 * SPA without react-router; we mirror three axes into the URL:
 *   - pathname for first-class pages (`/clients`, `/directory/units`, ...)
 *   - `?view=<id>` for the view type (list / cards / table / board)
 *   - `?preset=<id>` for saved-view / preset state inside an entity module
 */

import { getModuleMeta } from './navConfig';

export type ViewMode = 'board' | 'list' | 'table' | 'cards' | string;

export const ROUTED_SECONDARY_IDS = [
  // sales
  'leads',
  'my-leads',
  'applications',
  'my-applications',
  'apps-no-reservation',
  'apps-ready',
  'clients',
  'clients-new',
  'clients-repeat',
  'clients-vip',
  'clients-debt',
  // ops
  'reservations',
  'departures',
  'completion',
  // catalogs
  'equipment-types',
  'equipment-units',
  'subcontractors',
  'equipment-categories',
  // control
  'reports',
  'audit',
  'dashboard',
  // admin
  'imports',
  'settings',
  'users',
  'permissions',
] as const;

export type RoutedSecondaryId = (typeof ROUTED_SECONDARY_IDS)[number];

const PATHNAME_BY_ID: Record<string, string> = {
  leads: '/leads',
  'my-leads': '/leads/my',
  applications: '/applications',
  'my-applications': '/applications/my',
  'apps-no-reservation': '/applications/no-reservation',
  'apps-ready': '/applications/ready',
  clients: '/clients',
  'clients-new': '/clients/new',
  'clients-repeat': '/clients/repeat',
  'clients-vip': '/clients/vip',
  'clients-debt': '/clients/debt',
  reservations: '/reservations',
  departures: '/departures',
  completion: '/completion',
  'equipment-types': '/directory/equipment-types',
  'equipment-units': '/directory/units',
  subcontractors: '/directory/contractors',
  'equipment-categories': '/directory/categories',
  // control
  reports: '/reports',
  audit: '/audit',
  dashboard: '/dashboard',
  imports: '/admin/imports',
  settings: '/admin/settings',
  users: '/admin/users',
  permissions: '/admin/permissions',
};

const ID_BY_PATHNAME: Record<string, string> = Object.fromEntries(
  Object.entries(PATHNAME_BY_ID).map(([id, path]) => [path, id]),
);

export function pathnameForSecondary(id: string): string | null {
  return PATHNAME_BY_ID[id] ?? null;
}

export function secondaryForPathname(pathname: string): string | null {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return ID_BY_PATHNAME[normalized] ?? null;
}

export interface InitialRoute {
  secondaryId: string | null;
  view: string | null;
  preset: string | null;
}

export function parseInitialRoute(): InitialRoute {
  if (typeof window === 'undefined') return { secondaryId: null, view: null, preset: null };
  const secondaryId = secondaryForPathname(window.location.pathname);
  const params = new URLSearchParams(window.location.search);
  return {
    secondaryId,
    view: params.get('view'),
    preset: params.get('preset'),
  };
}

/**
 * Validate `view` against the active module's tabs. Falls back to the first
 * tab id when `requested` isn't one of them. Prevents a stale `view=board`
 * from Leads bleeding into Clients / Catalogs.
 */
export function resolveViewForModule(secondaryId: string, requested: string | null): string | null {
  const meta = getModuleMeta(secondaryId);
  if (!meta.tabs || meta.tabs.length === 0) return null;
  if (requested && meta.tabs.some((t) => t.id === requested)) return requested;
  return meta.tabs[0].id;
}

export interface RouteState {
  view?: string | null;
  preset?: string | null;
}

export function writeRoute(secondaryId: string, state: RouteState) {
  if (typeof window === 'undefined') return;
  const pathname = pathnameForSecondary(secondaryId);
  if (!pathname) return;

  const params = new URLSearchParams(window.location.search);

  if (state.view !== undefined) {
    if (state.view) params.set('view', state.view);
    else params.delete('view');
  }
  if (state.preset !== undefined) {
    if (state.preset) params.set('preset', state.preset);
    else params.delete('preset');
  }

  const qs = params.toString();
  const next = pathname + (qs ? `?${qs}` : '');
  const current = window.location.pathname + window.location.search;
  if (next === current) return;
  try {
    window.history.replaceState(null, '', next);
  } catch {
    /* ignore */
  }
}
