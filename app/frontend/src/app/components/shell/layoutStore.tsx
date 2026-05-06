import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  type RouteEntityType,
  parseInitialRoute,
  pathnameForSecondary,
  resolveViewForModule,
  secondaryForPathname,
  writeRoute,
} from './routeSync';
import { getModuleMeta } from './navConfig';

export type ViewMode = string;
export type UserRole = 'admin' | 'manager';

type LayoutState = {
  sidebarExpanded: boolean;
  activePrimaryNav: string;
  activeSecondaryNav: string;
  activeEntityType: RouteEntityType | null;
  activeEntityId: string | null;
  currentView: ViewMode;
  expandedSections: Record<string, boolean>;
  role: UserRole;
  setSidebarExpanded: (v: boolean) => void;
  toggleSidebar: () => void;
  setActivePrimaryNav: (v: string) => void;
  setActiveSecondaryNav: (v: string) => void;
  setActiveEntityRoute: (entityType: RouteEntityType | null, entityId?: string | null) => void;
  clearActiveEntityRoute: () => void;
  openSecondaryWithEntity: (
    secondaryId: string,
    entityType: RouteEntityType,
    entityId: string,
  ) => void;
  setCurrentView: (v: ViewMode) => void;
  toggleSection: (id: string) => void;
  setRole: (r: UserRole) => void;
};

const STORAGE_KEY = 'katet-crm.layout.v5';

const LayoutContext = createContext<LayoutState | null>(null);

type Persisted = Pick<
  LayoutState,
  'sidebarExpanded' | 'activePrimaryNav' | 'activeSecondaryNav' | 'currentView' | 'expandedSections' | 'role'
>;

const DEFAULTS: Persisted = {
  sidebarExpanded: true,
  activePrimaryNav: 'sales',
  activeSecondaryNav: 'leads',
  currentView: 'board',
  expandedSections: {
    'home-main': true,
    'sales-leads': true,
    'sales-apps': true,
    'clients-main': true,
    'ops-main': true,
    'catalogs-main': true,
    'control-main': true,
    'admin-main': true,
    views: true,
  },
  role: 'admin',
};

function loadPersisted(): Persisted {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function LayoutProvider({ children }: { children: ReactNode }) {
  const initial = loadPersisted();
  // URL takes precedence over localStorage on first mount so deep links and
  // reloads behave predictably.
  const initialRoute = parseInitialRoute();
  const [sidebarExpanded, setSidebarExpanded] = useState(initial.sidebarExpanded);
  const [activePrimaryNav, setActivePrimaryNav] = useState(initial.activePrimaryNav);
  const [activeSecondaryNavState, setActiveSecondaryNavState] = useState(
    initialRoute.secondaryId ?? initial.activeSecondaryNav,
  );
  const [activeEntityType, setActiveEntityType] = useState<RouteEntityType | null>(
    initialRoute.entityType,
  );
  const [activeEntityId, setActiveEntityId] = useState<string | null>(initialRoute.entityId);
  const [currentView, setCurrentView] = useState<ViewMode>(() => {
    const effective = initialRoute.secondaryId ?? initial.activeSecondaryNav;
    const requested = initialRoute.view ?? initial.currentView;
    return resolveViewForModule(effective, requested) ?? requested;
  });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    initial.expandedSections,
  );
  const [role, setRole] = useState<UserRole>(initial.role);

  const resolveWritableSecondary = (fallbackSecondaryId: string): string | null => {
    if (pathnameForSecondary(activeSecondaryNavState)) {
      return activeSecondaryNavState;
    }

    if (typeof window !== 'undefined') {
      const fromPathname = secondaryForPathname(window.location.pathname);
      if (fromPathname && pathnameForSecondary(fromPathname)) {
        return fromPathname;
      }
    }

    if (pathnameForSecondary(fallbackSecondaryId)) {
      return fallbackSecondaryId;
    }

    return null;
  };

  // Persist to localStorage
  useEffect(() => {
    const data: Persisted = {
      sidebarExpanded,
      activePrimaryNav,
      activeSecondaryNav: activeSecondaryNavState,
      currentView,
      expandedSections,
      role,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, [
    sidebarExpanded,
    activePrimaryNav,
    activeSecondaryNavState,
    currentView,
    expandedSections,
    role,
  ]);

  // Mirror current page + view mode into the URL for routed secondary ids.
  // Also: when switching modules, coerce currentView to a value valid for the
  // new module's tabs so stale values like `view=board` don't leak across.
  useEffect(() => {
    const moduleDomain = getModuleMeta(activeSecondaryNavState).domain;
    if (moduleDomain !== activePrimaryNav) {
      setActivePrimaryNav(moduleDomain);
    }
  }, [activePrimaryNav, activeSecondaryNavState]);

  useEffect(() => {
    const valid = resolveViewForModule(activeSecondaryNavState, currentView);
    if (valid && valid !== currentView) {
      setCurrentView(valid);
      return;
    }
    if (pathnameForSecondary(activeSecondaryNavState)) {
      writeRoute(activeSecondaryNavState, {
        view: currentView || null,
        entityType: activeEntityType,
        entityId: activeEntityId,
      });
    }
  }, [activeSecondaryNavState, currentView, activeEntityType, activeEntityId]);

  const setActiveEntityRoute = (
    entityType: RouteEntityType | null,
    entityId?: string | null,
  ) => {
    const writableSecondary = resolveWritableSecondary(activeSecondaryNavState);

    if (!entityType || !entityId) {
      setActiveEntityType(null);
      setActiveEntityId(null);
      if (writableSecondary) {
        writeRoute(
          writableSecondary,
          {
            view: currentView || null,
            entityType: null,
            entityId: null,
          },
          { history: 'push' },
        );
      }
      return;
    }
    if (writableSecondary) {
      writeRoute(
        writableSecondary,
        {
          view: currentView || null,
          entityType,
          entityId,
        },
        { history: 'push' },
      );
    }
    setActiveEntityType(entityType);
    setActiveEntityId(entityId);
  };

  const clearActiveEntityRoute = () => {
    setActiveEntityType(null);
    setActiveEntityId(null);
    const writableSecondary = resolveWritableSecondary(activeSecondaryNavState);
    if (writableSecondary) {
      writeRoute(
        writableSecondary,
        {
          view: currentView || null,
          entityType: null,
          entityId: null,
        },
        { history: 'push' },
      );
    }
  };

  const setActiveSecondaryNav = (secondaryId: string) => {
    const nextView = resolveViewForModule(secondaryId, currentView) ?? currentView;
    if (pathnameForSecondary(secondaryId)) {
      writeRoute(
        secondaryId,
        {
          view: nextView || null,
          entityType: null,
          entityId: null,
        },
        { history: 'push' },
      );
    }
    setActiveSecondaryNavState(secondaryId);
    setActiveEntityType(null);
    setActiveEntityId(null);
  };

  const openSecondaryWithEntity = (
    secondaryId: string,
    entityType: RouteEntityType,
    entityId: string,
  ) => {
    // Keep users in the current workspace context and open linked entity as an overlay.
    // We still persist entityType/entityId in URL query so share links stay deterministic.
    const targetSecondary = resolveWritableSecondary(secondaryId);

    if (targetSecondary) {
      writeRoute(
        targetSecondary,
        {
          view: currentView || null,
          entityType,
          entityId,
        },
        { history: 'push' },
      );
    }
    setActiveEntityType(entityType);
    setActiveEntityId(entityId);
  };

  // React to browser back/forward and to programmatic history updates.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = () => {
      const route = parseInitialRoute();
      const nextId = route.secondaryId;
      if (nextId) {
        setActiveSecondaryNavState(nextId);
      }
      setActiveEntityType(route.entityType);
      setActiveEntityId(route.entityId);
      const v = route.view;
      if (v) {
        const id = nextId ?? activeSecondaryNavState;
        const valid = resolveViewForModule(id, v);
        if (valid) setCurrentView(valid);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [activeSecondaryNavState]);

  const value: LayoutState = {
    sidebarExpanded,
    activePrimaryNav,
    activeSecondaryNav: activeSecondaryNavState,
    activeEntityType,
    activeEntityId,
    currentView,
    expandedSections,
    role,
    setSidebarExpanded,
    toggleSidebar: () => setSidebarExpanded((v) => !v),
    setActivePrimaryNav,
    setActiveSecondaryNav,
    setActiveEntityRoute,
    clearActiveEntityRoute,
    openSecondaryWithEntity,
    setCurrentView,
    toggleSection: (id) =>
      setExpandedSections((prev) => ({ ...prev, [id]: !(prev[id] ?? true) })),
    setRole,
  };

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayout must be used within LayoutProvider');
  return ctx;
}
