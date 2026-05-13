import { ChevronDown, ChevronsLeft, FileText, Search } from 'lucide-react';
import { cn } from '../ui/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { useLayout } from './layoutStore';
import { getDomainConfig, type NavLeaf } from './navConfig';
import { USE_API } from '../../lib/featureFlags';
import { useClientsQuery } from '../../hooks/useClientsQuery';

const MOBILE_SIDEBAR_BREAKPOINT = 768;

export function SecondarySidebar() {
  const {
    sidebarExpanded,
    setSidebarExpanded,
    activePrimaryNav,
    activeSecondaryNav,
    setActivePrimaryNav,
    setActiveSecondaryNav,
  } = useLayout();

  const domain = getDomainConfig(activePrimaryNav);
  const isClientsDomain = activePrimaryNav === 'clients';
  const clientsCountsQuery = useClientsQuery({ take: 200 }, USE_API && isClientsDomain);

  const clientCounts = (() => {
    if (!isClientsDomain || !clientsCountsQuery.data) return null;
    const rows = clientsCountsQuery.data.items;
    return {
      all: clientsCountsQuery.data.total,
      new: rows.filter((c) => c.tags.includes('new')).length,
      repeat: rows.filter((c) => c.tags.includes('repeat')).length,
      vip: rows.filter((c) => c.tags.includes('vip')).length,
      debt: rows.filter((c) => c.tags.includes('debt')).length,
    };
  })();

  const getNavLabel = (item: NavLeaf) => {
    if (!clientCounts) return item.label;
    switch (item.id) {
      case 'clients':
        return `Все · ${clientCounts.all}`;
      case 'clients-new':
        return `Новые · ${clientCounts.new}`;
      case 'clients-repeat':
        return `Повторные · ${clientCounts.repeat}`;
      case 'clients-vip':
        return `VIP · ${clientCounts.vip}`;
      case 'clients-debt':
        return `С долгом · ${clientCounts.debt}`;
      default:
        return item.label;
    }
  };

  const focusWorkspaceSearch = () => {
    if (typeof document === 'undefined') return;
    const input = document.querySelector<HTMLInputElement>('[data-crm-search-input="true"]');
    if (!input) {
      setActivePrimaryNav('sales');
      setActiveSecondaryNav('leads');
      window.setTimeout(() => {
        const fallbackInput = document.querySelector<HTMLInputElement>('[data-crm-search-input="true"]');
        if (!fallbackInput) return;
        fallbackInput.focus();
        fallbackInput.select();
      }, 0);
      return;
    }
    input.focus();
    input.select();
  };

  const closeOnMobileAfterNavigation = () => {
    if (typeof window !== 'undefined' && window.innerWidth < MOBILE_SIDEBAR_BREAKPOINT) {
      setSidebarExpanded(false);
    }
  };

  return (
    <>
      {sidebarExpanded ? (
        <button
          type="button"
          className="absolute inset-0 z-20 bg-black/25 md:hidden"
          onClick={() => setSidebarExpanded(false)}
          aria-label="Закрыть меню"
        />
      ) : null}

      <aside
        className="absolute inset-y-0 left-0 z-30 h-full shrink-0 overflow-hidden bg-[var(--shell-sidebar-bg)] shadow-[0_8px_28px_rgba(15,23,42,0.24)] transition-[width] duration-200 ease-out md:relative md:z-auto md:bg-transparent md:shadow-none"
        style={{ width: sidebarExpanded ? 232 : 0 }}
        aria-hidden={!sidebarExpanded}
      >
        <div
          className={cn(
            'group flex h-full w-[232px] flex-col border-r border-[var(--shell-sidebar-divider)] bg-[var(--shell-sidebar-bg)] md:border-r-0 md:bg-transparent',
            'transition-opacity duration-150',
            sidebarExpanded ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
        <div className="flex h-10 shrink-0 items-center justify-between px-3">
          <div className="flex min-w-0 items-center gap-1.5">
            {domain ? <domain.icon className="h-[15px] w-[15px] shrink-0 text-foreground/70" /> : null}
            <h2 className="truncate text-[13px] font-medium tracking-tight text-foreground">
              {domain?.label ?? 'Навигация'}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <SidebarUtilityButton
              icon={Search}
              label="Поиск по меню"
              onClick={focusWorkspaceSearch}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setSidebarExpanded(false)}
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground opacity-100 transition-opacity hover:bg-accent/70 hover:text-foreground md:opacity-0 md:group-hover:opacity-100"
                  aria-label="Свернуть меню"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Свернуть <kbd className="ml-1 text-[10px] opacity-70">Ctrl \</kbd>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

          <div className="scroll-thin flex-1 overflow-y-auto px-1.5 pb-2">
          {domain?.groups.map((group) => (
            <SidebarSection key={group.id} id={group.id} title={group.title}>
              {group.items.map((item) => (
                <SidebarNavItem
                  key={item.id}
                  item={item}
                  label={getNavLabel(item)}
                  active={activeSecondaryNav === item.id}
                  onClick={() => {
                    setActiveSecondaryNav(item.id);
                    closeOnMobileAfterNavigation();
                  }}
                />
              ))}
            </SidebarSection>
          ))}

          {domain?.savedViews && domain.savedViews.length > 0 ? (
            <>
              <div className="mx-2 mt-3 h-px bg-[var(--shell-sidebar-divider)]" />
              <SidebarSection id={`${domain.id}-views`} title={domain.savedViewsTitle ?? 'Представления'}>
                {domain.savedViews.map((item) => (
                  <SidebarNavItem
                    key={item.id}
                    item={item}
                    variant="view"
                    active={activeSecondaryNav === item.id}
                    onClick={() => {
                      setActiveSecondaryNav(item.id);
                      closeOnMobileAfterNavigation();
                    }}
                  />
                ))}
              </SidebarSection>
            </>
          ) : null}
        </div>

          <SidebarFooter />
        </div>
      </aside>
    </>
  );
}

function SidebarFooter() {
  const { setActivePrimaryNav, setActiveSecondaryNav, setSidebarExpanded } = useLayout();
  return (
    <div className="shrink-0 px-2 pb-2 pt-2">
      <button
        type="button"
        onClick={() => {
          setActivePrimaryNav('home');
          setActiveSecondaryNav('my-tasks');
          if (typeof window !== 'undefined' && window.innerWidth < MOBILE_SIDEBAR_BREAKPOINT) {
            setSidebarExpanded(false);
          }
        }}
        className={cn(
          'flex h-7 w-full items-center gap-1.5 rounded-md px-2 text-[12px] font-medium',
          'bg-[var(--shell-footer-bg)] text-foreground/80',
          'transition-colors hover:bg-[var(--shell-nav-hover-bg)] hover:text-foreground',
        )}
        aria-label="Черновик"
      >
        <FileText className="h-[14px] w-[14px] text-muted-foreground" />
        <span className="truncate">Черновик</span>
      </button>
    </div>
  );
}

function SidebarUtilityButton({
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
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground opacity-100 transition-opacity hover:bg-accent/70 hover:text-foreground md:opacity-0 md:group-hover:opacity-100"
          aria-label={label}
        >
          <Icon className="h-[14px] w-[14px]" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function SidebarNavItem({
  item,
  label,
  active,
  onClick,
  variant = 'page',
}: {
  item: NavLeaf;
  label?: string;
  active?: boolean;
  onClick?: () => void;
  variant?: 'page' | 'view';
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-7 min-w-0 items-center gap-2 rounded px-2 text-left text-[13px] transition-colors',
        active
          ? variant === 'view'
            ? 'bg-[var(--shell-nav-view-active-bg)] text-[var(--shell-nav-view-active-fg)]'
            : 'bg-[var(--shell-nav-active-bg)] text-[var(--shell-nav-active-fg)]'
          : 'text-foreground/85 hover:bg-[var(--shell-nav-hover-bg)]',
      )}
    >
      <Icon
        className={cn(
          'h-[15px] w-[15px] shrink-0',
          item.iconClassName ??
            (active && variant === 'view' ? 'text-[var(--shell-nav-view-active-fg)]' : 'text-muted-foreground'),
        )}
      />
      <span className="truncate">{label ?? item.label}</span>
    </button>
  );
}

function SidebarSection({
  id,
  title,
  children,
}: {
  id: string;
  title?: string;
  children: React.ReactNode;
}) {
  const { expandedSections, toggleSection } = useLayout();
  const open = expandedSections[id] ?? true;
  if (!title) {
    return <div className="mt-1 flex flex-col">{children}</div>;
  }
  return (
    <div className="mt-3 first:mt-2">
      <button
        type="button"
        onClick={() => toggleSection(id)}
        className="flex h-6 w-full min-w-0 items-center gap-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/90 transition-colors hover:text-foreground"
      >
        <ChevronDown
          className={cn('h-3 w-3 shrink-0 transition-transform', open ? '' : '-rotate-90')}
        />
        <span className="truncate">{title}</span>
      </button>
      {open ? <div className="mt-0.5 flex flex-col">{children}</div> : null}
    </div>
  );
}
