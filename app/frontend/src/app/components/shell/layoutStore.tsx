import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
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
  currentView: ViewMode;
  expandedSections: Record<string, boolean>;
  role: UserRole;
  setSidebarExpanded: (v: boolean) => void;
  toggleSidebar: () => void;
  setActivePrimaryNav: (v: string) => void;
  setActiveSecondaryNav: (v: string) => void;
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
  const [activeSecondaryNav, setActiveSecondaryNav] = useState(
    initialRoute.secondaryId ?? initial.activeSecondaryNav,
  );
  const [currentView, setCurrentView] = useState<ViewMode>(() => {
    const effective = initialRoute.secondaryId ?? initial.activeSecondaryNav;
    const requested = initialRoute.view ?? initial.currentView;
    return resolveViewForModule(effective, requested) ?? requested;
  });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    initial.expandedSections,
  );
  const [role, setRole] = useState<UserRole>(initial.role);

  // Persist to localStorage
  useEffect(() => {
    const data: Persisted = {
      sidebarExpanded,
      activePrimaryNav,
      activeSecondaryNav,
      currentView,
      expandedSections,
      role,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, [sidebarExpanded, activePrimaryNav, activeSecondaryNav, currentView, expandedSections, role]);

  // Mirror current page + view mode into the URL for routed secondary ids.
  // Also: when switching modules, coerce currentView to a value valid for the
  // new module's tabs so stale values like `view=board` don't leak across.
  useEffect(() => {
    const moduleDomain = getModuleMeta(activeSecondaryNav).domain;
    if (moduleDomain !== activePrimaryNav) {
      setActivePrimaryNav(moduleDomain);
    }
  }, [activePrimaryNav, activeSecondaryNav]);

  useEffect(() => {
    const valid = resolveViewForModule(activeSecondaryNav, currentView);
    if (valid && valid !== currentView) {
      setCurrentView(valid);
      return;
    }
    if (pathnameForSecondary(activeSecondaryNav)) {
      writeRoute(activeSecondaryNav, { view: currentView || null });
    }
  }, [activeSecondaryNav, currentView]);

  // React to browser back/forward and to programmatic history updates.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = () => {
      const nextId = secondaryForPathname(window.location.pathname);
      if (nextId) setActiveSecondaryNav(nextId);
      const v = new URLSearchParams(window.location.search).get('view');
      if (v) {
        const id = nextId ?? activeSecondaryNav;
        const valid = resolveViewForModule(id, v);
        if (valid) setCurrentView(valid);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const value: LayoutState = {
    sidebarExpanded,
    activePrimaryNav,
    activeSecondaryNav,
    currentView,
    expandedSections,
    role,
    setSidebarExpanded,
    toggleSidebar: () => setSidebarExpanded((v) => !v),
    setActivePrimaryNav,
    setActiveSecondaryNav,
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
