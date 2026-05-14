import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Bell, HelpCircle, ChevronDown, LogOut, Settings, UserRound } from 'lucide-react';
import { cn } from '../ui/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useLayout } from './layoutStore';
import { getDomainConfig, getModuleMeta, PRIMARY_DOMAINS } from './navConfig';
import { useLeadsQuery } from '../../hooks/useLeadsQuery';
import { useClientsQuery } from '../../hooks/useClientsQuery';
import { useApplicationsQuery } from '../../hooks/useApplicationsQuery';
import { useReservationsQuery } from '../../hooks/useReservationsQuery';
import { useDeparturesQuery } from '../../hooks/useDeparturesQuery';
import { useCompletionsQuery } from '../../hooks/useCompletionsQuery';
import { useWorkspaceSettingsQuery } from '../../hooks/useSettingsQuery';
import { useAuth } from '../../auth/AuthProvider';
import type { RouteEntityType } from './routeSync';

const WORKSPACE_SEARCH_SELECTOR = '[data-crm-search-input="true"]';
const ENTITY_SUGGESTION_LIMIT = 3;
const DEFAULT_WORKSPACE_TITLE = 'Катет CRM';
const USE_API = import.meta.env.VITE_USE_API === 'true';

type WorkspaceSuggestion = {
  kind: 'workspace';
  id: string;
  label: string;
  hint: string;
  primaryId: string;
  secondaryId: string;
  searchText: string;
};

type EntitySuggestion = {
  kind: 'entity';
  id: string;
  label: string;
  hint: string;
  primaryId: string;
  secondaryId: string;
  entityType: RouteEntityType;
  entityId: string;
};

type QuerySuggestion = {
  kind: 'query';
  id: 'query-current';
  label: string;
  hint: string;
};

type QuickSuggestion = WorkspaceSuggestion | EntitySuggestion | QuerySuggestion;

export function GlobalTopbar() {
  const { user, logout } = useAuth();
  const {
    role,
    activePrimaryNav,
    activeSecondaryNav,
    setActivePrimaryNav,
    setActiveSecondaryNav,
    setActiveEntityRoute,
  } = useLayout();
  const domain = getDomainConfig(activePrimaryNav);
  const moduleMeta = getModuleMeta(activeSecondaryNav);
  const placeholder = moduleMeta.searchPlaceholder || domain?.searchPlaceholder || 'Поиск';
  const quickSearchRef = useRef<HTMLInputElement | null>(null);
  const [quickQuery, setQuickQuery] = useState('');
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const workspaceSettingsQuery = useWorkspaceSettingsQuery(USE_API && role === 'admin');

  const workspaceTitle = useMemo(() => {
    const sections = workspaceSettingsQuery.data?.sections;
    const generalSection = sections?.find((section) => section.id === 'general');
    if (!generalSection || generalSection.rows.length === 0) {
      return DEFAULT_WORKSPACE_TITLE;
    }

    const titleRow = generalSection.rows.find((row) => {
      const label = row.label.trim().toLowerCase();
      return label === 'название пространства' || label === 'название';
    }) ?? generalSection.rows[0];

    const value = titleRow?.value?.trim();
    return value || DEFAULT_WORKSPACE_TITLE;
  }, [workspaceSettingsQuery.data?.sections]);

  const profileDisplayName = useMemo(() => {
    const fullName = user?.fullName?.trim();
    if (fullName && !fullName.includes('@')) {
      return fullName;
    }

    const email = user?.email?.trim() ?? fullName;
    if (!email) {
      return role === 'admin' ? 'Администратор' : 'Менеджер';
    }

    const localPart = email.split('@')[0] ?? '';
    const normalized = localPart.replace(/[._-]+/g, ' ').trim();
    if (!normalized) {
      return email;
    }

    return normalized
      .split(/\s+/)
      .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
      .join(' ');
  }, [role, user?.email, user?.fullName]);

  const profileEmail = useMemo(() => {
    const email = user?.email?.trim();
    if (email) {
      return email;
    }
    return role === 'admin' ? 'admin@katet.local' : 'manager@katet.local';
  }, [role, user?.email]);

  const profileInitials = useMemo(() => {
    const source = (profileDisplayName || profileEmail).trim();
    if (!source) {
      return 'U';
    }

    const wordInitials = source
      .split(/\s+/)
      .map((word) => Array.from(word.replace(/[^0-9A-Za-zА-Яа-яЁё]/g, ''))[0] ?? '')
      .filter(Boolean);

    if (wordInitials.length >= 2) {
      return `${wordInitials[0]}${wordInitials[wordInitials.length - 1]}`.toUpperCase();
    }

    const singleToken = source.includes('@') ? source.split('@')[0] ?? source : source;
    const chars = Array.from(singleToken.replace(/[^0-9A-Za-zА-Яа-яЁё]/g, ''));
    if (chars.length === 0) {
      return 'U';
    }

    return chars.slice(0, 2).join('').toUpperCase();
  }, [profileDisplayName, profileEmail]);

  const workspaceSuggestions = useMemo<WorkspaceSuggestion[]>(() => {
    const out: WorkspaceSuggestion[] = [];
    for (const d of PRIMARY_DOMAINS) {
      if (d.allowedRoles && !d.allowedRoles.includes(role)) continue;

      for (const group of d.groups) {
        for (const item of group.items) {
          const itemMeta = getModuleMeta(item.id);
          out.push({
            kind: 'workspace',
            id: `${d.id}:${item.id}`,
            label: itemMeta.title || item.label,
            hint: [d.label, group.title].filter(Boolean).join(' · '),
            primaryId: d.id,
            secondaryId: item.id,
            searchText: `${d.label} ${group.title ?? ''} ${item.label} ${itemMeta.title}`.toLowerCase(),
          });
        }
      }

      for (const view of d.savedViews ?? []) {
        const viewMeta = getModuleMeta(view.id);
        out.push({
          kind: 'workspace',
          id: `${d.id}:view:${view.id}`,
          label: viewMeta.title || view.label,
          hint: [d.label, d.savedViewsTitle ?? 'Представления'].join(' · '),
          primaryId: d.id,
          secondaryId: view.id,
          searchText: `${d.label} ${d.savedViewsTitle ?? ''} ${view.label} ${viewMeta.title}`.toLowerCase(),
        });
      }
    }

    return out;
  }, [role]);

  const quickQueryNormalized = quickQuery.trim().toLowerCase();
  const quickQueryTrimmed = quickQuery.trim();
  const [debouncedQuickQuery, setDebouncedQuickQuery] = useState('');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuickQuery(quickQueryTrimmed);
    }, 220);
    return () => window.clearTimeout(timeoutId);
  }, [quickQueryTrimmed]);

  const shouldFetchEntitySuggestions = isSuggestionsOpen && debouncedQuickQuery.length >= 2;

  const leadsQuery = useLeadsQuery(
    {
      query: debouncedQuickQuery,
      scope: role === 'manager' ? 'mine' : 'all',
    },
    shouldFetchEntitySuggestions,
  );

  const clientsQuery = useClientsQuery(
    {
      query: debouncedQuickQuery,
      take: ENTITY_SUGGESTION_LIMIT,
    },
    shouldFetchEntitySuggestions,
  );

  const applicationsQuery = useApplicationsQuery(
    {
      query: debouncedQuickQuery,
      scope: role === 'manager' ? 'mine' : 'all',
    },
    shouldFetchEntitySuggestions,
  );

  const reservationsQuery = useReservationsQuery(
    {
      query: debouncedQuickQuery,
      isActive: 'true',
    },
    shouldFetchEntitySuggestions,
  );

  const departuresQuery = useDeparturesQuery(
    {
      query: debouncedQuickQuery,
    },
    shouldFetchEntitySuggestions,
  );

  const completionsQuery = useCompletionsQuery(
    {
      query: debouncedQuickQuery,
    },
    shouldFetchEntitySuggestions,
  );

  const entitySuggestions = useMemo<EntitySuggestion[]>(() => {
    if (!quickQueryTrimmed || !shouldFetchEntitySuggestions) return [];

    const leadItems = (leadsQuery.data?.items ?? [])
      .slice(0, ENTITY_SUGGESTION_LIMIT)
      .map((lead) => ({
        kind: 'entity' as const,
        id: `lead:${lead.id}`,
        label: lead.contactCompany
          ? `${lead.contactCompany} · ${lead.contactName}`
          : lead.contactName,
        hint: `Лид · ${lead.contactPhone}`,
        primaryId: 'sales',
        secondaryId: 'leads',
        entityType: 'lead' as const,
        entityId: lead.id,
      }));

    const clientItems = (clientsQuery.data?.items ?? [])
      .slice(0, ENTITY_SUGGESTION_LIMIT)
      .map((client) => ({
        kind: 'entity' as const,
        id: `client:${client.id}`,
        label: client.company
          ? `${client.company} · ${client.name}`
          : client.name,
        hint: `Клиент · ${client.phone}`,
        primaryId: 'clients',
        secondaryId: 'clients',
        entityType: 'client' as const,
        entityId: client.id,
      }));

    const applicationItems = (applicationsQuery.data?.items ?? [])
      .slice(0, ENTITY_SUGGESTION_LIMIT)
      .map((application) => ({
        kind: 'entity' as const,
        id: `application:${application.id}`,
        label: `${application.number} · ${application.clientCompany ?? application.clientName}`,
        hint: `Заявка · ${application.equipmentSummary}`,
        primaryId: 'sales',
        secondaryId: 'applications',
        entityType: 'application' as const,
        entityId: application.id,
      }));

    const reservationItems = (reservationsQuery.data?.items ?? [])
      .slice(0, ENTITY_SUGGESTION_LIMIT)
      .map((reservation) => ({
        kind: 'entity' as const,
        id: `reservation:${reservation.id}`,
        label: `${reservation.clientCompany ?? reservation.clientName ?? 'Клиент'} · ${reservation.positionLabel}`,
        hint: `Бронь · ${reservation.applicationNumber ? `#${reservation.applicationNumber}` : reservation.id.slice(0, 8)}`,
        primaryId: 'ops',
        secondaryId: 'reservations',
        entityType: 'reservation' as const,
        entityId: reservation.id,
      }));

    const departureItems = (departuresQuery.data?.items ?? [])
      .slice(0, ENTITY_SUGGESTION_LIMIT)
      .map((departure) => ({
        kind: 'entity' as const,
        id: `departure:${departure.id}`,
        label: `${departure.linked.clientCompany ?? departure.linked.clientName ?? 'Клиент'} · ${departure.linked.positionLabel}`,
        hint: `Выезд · ${departure.linked.applicationNumber ? `#${departure.linked.applicationNumber}` : departure.id.slice(0, 8)}`,
        primaryId: 'ops',
        secondaryId: 'departures',
        entityType: 'departure' as const,
        entityId: departure.id,
      }));

    const completionItems = (completionsQuery.data?.items ?? [])
      .slice(0, ENTITY_SUGGESTION_LIMIT)
      .map((completion) => ({
        kind: 'entity' as const,
        id: `completion:${completion.id}`,
        label: `${completion.linked.clientCompany ?? completion.linked.clientName ?? 'Клиент'} · ${completion.linked.positionLabel}`,
        hint: `Завершение · ${completion.linked.applicationNumber ? `#${completion.linked.applicationNumber}` : completion.id.slice(0, 8)}`,
        primaryId: 'ops',
        secondaryId: 'completion',
        entityType: 'completion' as const,
        entityId: completion.id,
      }));

    return [
      ...leadItems,
      ...clientItems,
      ...applicationItems,
      ...reservationItems,
      ...departureItems,
      ...completionItems,
    ];
  }, [
    applicationsQuery.data?.items,
    clientsQuery.data?.items,
    completionsQuery.data?.items,
    departuresQuery.data?.items,
    leadsQuery.data?.items,
    quickQueryTrimmed,
    reservationsQuery.data?.items,
    shouldFetchEntitySuggestions,
  ]);

  const suggestions = useMemo<QuickSuggestion[]>(() => {
    const filtered = quickQueryNormalized
      ? workspaceSuggestions.filter((item) => item.searchText.includes(quickQueryNormalized))
      : workspaceSuggestions;

    const top = filtered.slice(0, 8);

    if (!quickQueryTrimmed) {
      return top;
    }

    const out: QuickSuggestion[] = [
      {
        kind: 'query',
        id: 'query-current',
        label: `Искать «${quickQueryTrimmed}» в текущем списке`,
        hint: moduleMeta.title,
      },
    ];

    out.push(...entitySuggestions.slice(0, 12));
    out.push(...top);

    return out;
  }, [
    entitySuggestions,
    moduleMeta.title,
    quickQueryNormalized,
    quickQueryTrimmed,
    workspaceSuggestions,
  ]);

  const findWorkspaceSearchInput = useCallback(() => {
    if (typeof document === 'undefined') return null;
    const inputs = Array.from(
      document.querySelectorAll<HTMLInputElement>(WORKSPACE_SEARCH_SELECTOR),
    );
    return (
      inputs.find((input) => {
        if (input.disabled) return false;
        const style = window.getComputedStyle(input);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        return input.offsetParent !== null || style.position === 'fixed';
      }) ?? null
    );
  }, []);

  const syncQuickQueryFromWorkspace = useCallback(() => {
    const input = findWorkspaceSearchInput();
    setQuickQuery(input?.value ?? '');
  }, [findWorkspaceSearchInput]);

  const applyQuickQueryToWorkspace = useCallback(
    (value: string) => {
      const input = findWorkspaceSearchInput();
      if (!input) return false;
      if (input.value !== value) {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return true;
    },
    [findWorkspaceSearchInput],
  );

  const focusQuickSearch = useCallback(() => {
    quickSearchRef.current?.focus();
    quickSearchRef.current?.select();
  }, []);

  useEffect(() => {
    syncQuickQueryFromWorkspace();
    const frameId = window.requestAnimationFrame(syncQuickQueryFromWorkspace);
    const input = findWorkspaceSearchInput();
    if (!input) {
      return () => window.cancelAnimationFrame(frameId);
    }
    const handleInput = () => setQuickQuery(input.value);
    input.addEventListener('input', handleInput);
    return () => {
      window.cancelAnimationFrame(frameId);
      input.removeEventListener('input', handleInput);
    };
  }, [activeSecondaryNav, findWorkspaceSearchInput, syncQuickQueryFromWorkspace]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        focusQuickSearch();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusQuickSearch]);

  const handleQuickQueryChange = (nextValue: string) => {
    setQuickQuery(nextValue);
    applyQuickQueryToWorkspace(nextValue);
    setIsSuggestionsOpen(true);
    setActiveSuggestionIndex(0);
  };

  const handleQuickQuerySubmit = () => {
    if (applyQuickQueryToWorkspace(quickQuery)) return;

    const firstEntitySuggestion = suggestions.find(
      (item): item is EntitySuggestion => item.kind === 'entity',
    );
    if (firstEntitySuggestion) {
      openEntitySuggestion(firstEntitySuggestion);
      return;
    }

    const firstWorkspaceSuggestion = suggestions.find(
      (item): item is WorkspaceSuggestion => item.kind === 'workspace',
    );
    if (firstWorkspaceSuggestion) {
      openWorkspaceSuggestion(firstWorkspaceSuggestion);
      return;
    }

    setActivePrimaryNav('sales');
    setActiveSecondaryNav('leads');
    window.setTimeout(() => {
      applyQuickQueryToWorkspace(quickQuery);
    }, 0);
  };

  const openEntitySuggestion = (item: EntitySuggestion) => {
    setActivePrimaryNav(item.primaryId);
    setActiveSecondaryNav(item.secondaryId);
    setIsSuggestionsOpen(false);
    setActiveSuggestionIndex(0);

    window.setTimeout(() => {
      setActiveEntityRoute(item.entityType, item.entityId);
      applyQuickQueryToWorkspace(quickQueryTrimmed);
      focusQuickSearch();
    }, 0);
  };

  const openWorkspaceSuggestion = (item: WorkspaceSuggestion) => {
    setActivePrimaryNav(item.primaryId);
    setActiveSecondaryNav(item.secondaryId);
    setIsSuggestionsOpen(false);
    setActiveSuggestionIndex(0);

    window.setTimeout(() => {
      applyQuickQueryToWorkspace(quickQueryTrimmed);
      focusQuickSearch();
    }, 0);
  };

  const runSuggestion = (item: QuickSuggestion) => {
    if (item.kind === 'query') {
      handleQuickQuerySubmit();
      setIsSuggestionsOpen(false);
      return;
    }
    if (item.kind === 'entity') {
      openEntitySuggestion(item);
      return;
    }
    openWorkspaceSuggestion(item);
  };

  useEffect(() => {
    if (suggestions.length === 0) {
      setActiveSuggestionIndex(0);
      return;
    }
    setActiveSuggestionIndex((prev) => Math.min(prev, suggestions.length - 1));
  }, [suggestions.length]);

  const openAudit = () => {
    setActivePrimaryNav('control');
    setActiveSecondaryNav('audit');
  };

  const openHelp = () => {
    setActivePrimaryNav('home');
    setActiveSecondaryNav('quick-links');
  };

  const openProfile = () => {
    if (role === 'admin') {
      setActivePrimaryNav('admin');
      setActiveSecondaryNav('users');
      return;
    }
    setActivePrimaryNav('home');
    setActiveSecondaryNav('my-tasks');
  };

  const openAdminSettings = () => {
    setActivePrimaryNav('admin');
    setActiveSecondaryNav('settings');
  };

  return (
    <header className="flex h-10 w-full shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-white px-2 sm:gap-3 sm:px-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded bg-[var(--brand-logo-bg)] text-[13px] font-bold text-black shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]">
          к
        </span>
        <span className="hidden truncate text-[13px] font-semibold tracking-tight sm:inline">{workspaceTitle}</span>
      </div>

      <div className="flex min-w-0 flex-1 items-center sm:max-w-[480px]">
        <div className="relative flex h-7 w-full items-center">
          <Search className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            ref={quickSearchRef}
            type="text"
            value={quickQuery}
            onChange={(event) => handleQuickQueryChange(event.target.value)}
            onFocus={() => {
              syncQuickQueryFromWorkspace();
              setIsSuggestionsOpen(true);
            }}
            onBlur={() => {
              window.setTimeout(() => setIsSuggestionsOpen(false), 120);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                if (suggestions.length === 0) return;
                event.preventDefault();
                setIsSuggestionsOpen(true);
                setActiveSuggestionIndex((prev) => (prev + 1) % suggestions.length);
                return;
              }

              if (event.key === 'ArrowUp') {
                if (suggestions.length === 0) return;
                event.preventDefault();
                setIsSuggestionsOpen(true);
                setActiveSuggestionIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
                return;
              }

              if (event.key === 'Escape') {
                setIsSuggestionsOpen(false);
                return;
              }

              if (event.key === 'Enter') {
                event.preventDefault();
                if (isSuggestionsOpen && suggestions[activeSuggestionIndex]) {
                  runSuggestion(suggestions[activeSuggestionIndex]);
                  return;
                }
                handleQuickQuerySubmit();
              }
            }}
            placeholder={placeholder}
            aria-label="Быстрый поиск"
            className="h-7 w-full rounded-md border border-border/60 bg-[#f7f8fa] pl-7 pr-2 text-[12px] text-foreground outline-none transition-colors placeholder:text-muted-foreground hover:border-foreground/20 focus:border-[var(--brand-accent)] focus:bg-white sm:pr-14"
          />
          <kbd className="pointer-events-none absolute right-2 hidden rounded bg-muted px-1 py-0.5 text-[10px] font-medium text-muted-foreground sm:block">
            Ctrl K
          </kbd>

          {isSuggestionsOpen && suggestions.length > 0 ? (
            <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-md border border-border bg-white shadow-lg">
              <ul className="max-h-72 overflow-y-auto py-1">
                {suggestions.map((item, index) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                      }}
                      onClick={() => runSuggestion(item)}
                      className={cn(
                        'flex w-full flex-col items-start gap-0.5 px-2.5 py-1.5 text-left transition-colors',
                        index === activeSuggestionIndex ? 'bg-[var(--brand-accent-soft)]' : 'hover:bg-muted/70',
                      )}
                    >
                      <span className="text-[12px] leading-4 text-foreground">{item.label}</span>
                      <span className="text-[10px] leading-4 text-muted-foreground">{item.hint}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <TopbarIconButton icon={Bell} label="Уведомления" onClick={openAudit} />
        <TopbarIconButton icon={HelpCircle} label="Помощь" onClick={openHelp} />
        <DropdownMenu onOpenChange={setIsProfileMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="ml-1 flex h-7 items-center gap-1 rounded-md px-1 text-xs transition-colors hover:bg-accent"
              aria-label="Профиль"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--shell-rail-bg)] text-[11px] font-semibold text-[var(--shell-rail-fg)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]">
                {profileInitials}
              </span>
              <ChevronDown
                className={cn(
                  'h-3 w-3 text-muted-foreground transition-transform',
                  isProfileMenuOpen ? 'rotate-180' : '',
                )}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 text-[12px]">
            <DropdownMenuLabel className="py-1.5">
              <div className="flex flex-col gap-0.5">
                <span className="truncate text-[12px] font-medium text-foreground">{profileDisplayName}</span>
                <span className="truncate text-[10px] text-muted-foreground">{profileEmail}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={openProfile}>
              <UserRound className="h-3.5 w-3.5" />
              Профиль
            </DropdownMenuItem>
            {role === 'admin' ? (
              <DropdownMenuItem onSelect={openAdminSettings}>
                <Settings className="h-3.5 w-3.5" />
                Настройки
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={logout} variant="destructive">
              <LogOut className="h-3.5 w-3.5" />
              Выйти
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function TopbarIconButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors',
            'hover:bg-accent hover:text-foreground',
          )}
          aria-label={label}
        >
          <Icon className="h-[15px] w-[15px]" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
