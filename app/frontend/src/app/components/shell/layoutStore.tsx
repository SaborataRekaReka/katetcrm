import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
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
const MOBILE_SIDEBAR_BREAKPOINT = 768;
const MANAGER_FALLBACK_SECONDARY = 'overview';
const CONTROL_SECONDARY_IDS = new Set<string>([
  'dashboard',
  'reports',
  'audit',
  'bug-reports',
  'view-stale-leads',
  'view-lost-leads',
  'view-active-reservations',
  'view-manager-load',
]);

const LayoutContext = createContext<LayoutState | null>(null);

type Persisted = Pick<
  LayoutState,
  'sidebarExpanded' | 'activePrimaryNav' | 'activeSecondaryNav' | 'currentView' | 'expandedSections' | 'role'
> & {
  viewBySecondary: Record<string, ViewMode>;
};

const DEFAULTS: Persisted = {
  sidebarExpanded: true,
  activePrimaryNav: 'sales',
  activeSecondaryNav: 'leads',
  currentView: 'board',
  viewBySecondary: {},
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
  const initialSecondary = initialRoute.secondaryId ?? initial.activeSecondaryNav;
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < MOBILE_SIDEBAR_BREAKPOINT) {
      return false;
    }
    return initial.sidebarExpanded;
  });
  const [activePrimaryNav, setActivePrimaryNav] = useState(initial.activePrimaryNav);
  const [activeSecondaryNavState, setActiveSecondaryNavState] = useState(initialSecondary);
  const [activeEntityType, setActiveEntityType] = useState<RouteEntityType | null>(
    initialRoute.entityType,
  );
  const [activeEntityId, setActiveEntityId] = useState<string | null>(initialRoute.entityId);
  const [viewBySecondary, setViewBySecondary] = useState<Record<string, ViewMode>>(
    initial.viewBySecondary,
  );
  const [currentView, setCurrentViewState] = useState<ViewMode>(() => {
    const requested = initialRoute.view ?? initial.viewBySecondary[initialSecondary] ?? initial.currentView;
    const effective = initialSecondary;
    return resolveViewForModule(effective, requested) ?? requested;
  });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    initial.expandedSections,
  );
  const [role, setRole] = useState<UserRole>(initial.role);
  const isMobileViewportRef = useRef<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_SIDEBAR_BREAKPOINT : false,
  );

  // Keep sidebar closed by default on mobile and auto-close on desktop->mobile transition.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth < MOBILE_SIDEBAR_BREAKPOINT) {
      setSidebarExpanded(false);
    }

    const onResize = () => {
      const isMobile = window.innerWidth < MOBILE_SIDEBAR_BREAKPOINT;
      if (isMobile && !isMobileViewportRef.current) {
        setSidebarExpanded(false);
      }
      isMobileViewportRef.current = isMobile;
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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

  const setPreferredCurrentView = (view: ViewMode, secondaryId = activeSecondaryNavState) => {
    const resolved = resolveViewForModule(secondaryId, view) ?? view;
    setCurrentViewState(resolved);
    setViewBySecondary((prev) => {
      if (prev[secondaryId] === resolved) return prev;
      return { ...prev, [secondaryId]: resolved };
    });
  };

  // Persist to localStorage
  useEffect(() => {
    const data: Persisted = {
      sidebarExpanded,
      activePrimaryNav,
      activeSecondaryNav: activeSecondaryNavState,
      currentView,
      viewBySecondary,
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
    viewBySecondary,
    expandedSections,
    role,
  ]);

  // Mirror current page + view mode into the URL for routed secondary ids.
  // Also: when switching modules, coerce currentView to a value valid for the
  // new module's tabs so stale values like `view=board` don't leak across.
  useEffect(() => {
    if (
      role === 'manager'
      && CONTROL_SECONDARY_IDS.has(activeSecondaryNavState)
      && activeSecondaryNavState !== MANAGER_FALLBACK_SECONDARY
    ) {
      setActiveEntityType(null);
      setActiveEntityId(null);
      setActiveSecondaryNavState(MANAGER_FALLBACK_SECONDARY);
      return;
    }

    const moduleDomain = getModuleMeta(activeSecondaryNavState).domain;
    if (moduleDomain !== activePrimaryNav) {
      setActivePrimaryNav(moduleDomain);
    }
  }, [activePrimaryNav, activeSecondaryNavState, role]);

  useEffect(() => {
    const valid = resolveViewForModule(activeSecondaryNavState, currentView);
    if (valid && valid !== currentView) {
      setPreferredCurrentView(valid, activeSecondaryNavState);
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
    const requestedView = viewBySecondary[secondaryId] ?? currentView;
    const nextView = resolveViewForModule(secondaryId, requestedView) ?? requestedView;
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
    setCurrentViewState(nextView);
    setViewBySecondary((prev) => {
      if (prev[secondaryId] === nextView) return prev;
      return { ...prev, [secondaryId]: nextView };
    });
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
      const id = nextId ?? activeSecondaryNavState;
      const requestedView = route.view ?? viewBySecondary[id];
      if (requestedView) {
        const valid = resolveViewForModule(id, requestedView);
        if (valid) setPreferredCurrentView(valid, id);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [activeSecondaryNavState, currentView, viewBySecondary]);

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
    setCurrentView: (view) => setPreferredCurrentView(view),
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
