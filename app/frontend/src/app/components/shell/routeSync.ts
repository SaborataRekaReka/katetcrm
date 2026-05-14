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

export const ROUTE_ENTITY_TYPES = [
  'lead',
  'application',
  'reservation',
  'departure',
  'completion',
  'client',
] as const;

export type RouteEntityType = (typeof ROUTE_ENTITY_TYPES)[number];

const CANONICAL_SECONDARY_BY_ENTITY_TYPE: Record<RouteEntityType, string> = {
  lead: 'leads',
  application: 'applications',
  reservation: 'reservations',
  departure: 'departures',
  completion: 'completion',
  client: 'clients',
};

function isRouteEntityType(value: string | null): value is RouteEntityType {
  if (!value) return false;
  return (ROUTE_ENTITY_TYPES as readonly string[]).includes(value);
}

export const ROUTED_SECONDARY_IDS = [
  // home
  'overview',
  'my-tasks',
  'urgent-today',
  'recent-activity',
  'quick-links',
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
  'bug-reports',
  'dashboard',
  // admin
  'imports',
  'integrations',
  'settings',
  'users',
  'permissions',
] as const;

export type RoutedSecondaryId = (typeof ROUTED_SECONDARY_IDS)[number];

const PATHNAME_BY_ID: Record<string, string> = {
  // home
  overview: '/home',
  'my-tasks': '/home/tasks',
  'urgent-today': '/home/urgent',
  'recent-activity': '/home/activity',
  'quick-links': '/home/quick-links',
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
  'bug-reports': '/control/bug-reports',
  dashboard: '/dashboard',
  imports: '/admin/imports',
  integrations: '/admin/integrations',
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
  entityType: RouteEntityType | null;
  entityId: string | null;
}

export function parseInitialRoute(): InitialRoute {
  if (typeof window === 'undefined') {
    return {
      secondaryId: null,
      view: null,
      preset: null,
      entityType: null,
      entityId: null,
    };
  }
  const secondaryId = secondaryForPathname(window.location.pathname);
  const params = new URLSearchParams(window.location.search);
  const entityTypeRaw = params.get('entityType');
  const entityIdRaw = params.get('entityId');
  const entityType = isRouteEntityType(entityTypeRaw) ? entityTypeRaw : null;
  const entityId = entityType && entityIdRaw ? entityIdRaw : null;

  return {
    secondaryId,
    view: params.get('view'),
    preset: params.get('preset'),
    entityType,
    entityId,
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
  entityType?: RouteEntityType | null;
  entityId?: string | null;
}

export interface WriteRouteOptions {
  history?: 'replace' | 'push';
}

export function canonicalSecondaryForEntityType(entityType: RouteEntityType): string {
  return CANONICAL_SECONDARY_BY_ENTITY_TYPE[entityType];
}

export function buildRouteLocation(secondaryId: string, state: RouteState = {}): string | null {
  const pathname = pathnameForSecondary(secondaryId);
  if (!pathname) return null;

  const params = new URLSearchParams();

  if (state.view) params.set('view', state.view);
  if (state.preset) params.set('preset', state.preset);

  const entityType = state.entityType ?? null;
  const entityId = state.entityId ?? null;
  if (entityType && entityId) {
    params.set('entityType', entityType);
    params.set('entityId', entityId);
  }

  const qs = params.toString();
  return pathname + (qs ? `?${qs}` : '');
}

export function buildAbsoluteRouteUrl(secondaryId: string, state: RouteState = {}): string | null {
  if (typeof window === 'undefined') return null;
  const relative = buildRouteLocation(secondaryId, state);
  if (!relative) return null;
  return new URL(relative, window.location.origin).toString();
}

export function buildAbsoluteEntityUrl(entityType: RouteEntityType, entityId: string): string | null {
  const secondaryId = canonicalSecondaryForEntityType(entityType);
  return buildAbsoluteRouteUrl(secondaryId, { entityType, entityId });
}

export function writeRoute(
  secondaryId: string,
  state: RouteState,
  options: WriteRouteOptions = {},
) {
  if (typeof window === 'undefined') return;
  const historyMode = options.history ?? 'replace';
  const params = new URLSearchParams(window.location.search);

  const nextView = state.view === undefined ? params.get('view') : state.view;
  const nextPreset = state.preset === undefined ? params.get('preset') : state.preset;

  const currentEntityType = params.get('entityType');
  const currentEntityId = params.get('entityId');
  const nextEntityType =
    state.entityType === undefined
      ? isRouteEntityType(currentEntityType)
        ? currentEntityType
        : null
      : state.entityType;
  const nextEntityId =
    state.entityId === undefined
      ? nextEntityType && currentEntityId
        ? currentEntityId
        : null
      : state.entityId;

  const next = buildRouteLocation(secondaryId, {
    view: nextView,
    preset: nextPreset,
    entityType: nextEntityType,
    entityId: nextEntityType && nextEntityId ? nextEntityId : null,
  });

  if (!next) return;
  const current = window.location.pathname + window.location.search;
  if (next === current) return;
  try {
    if (historyMode === 'push') {
      window.history.pushState(null, '', next);
    } else {
      window.history.replaceState(null, '', next);
    }
  } catch {
    /* ignore */
  }
}
