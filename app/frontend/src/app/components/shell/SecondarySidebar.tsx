import { ChevronDown, ChevronsLeft, FileText, Search } from 'lucide-react';
import { cn } from '../ui/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { useLayout } from './layoutStore';
import { getDomainConfig, type NavLeaf } from './navConfig';

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

  return (
    <aside
      className="relative h-full shrink-0 overflow-hidden bg-transparent transition-[width] duration-200 ease-out"
      style={{ width: sidebarExpanded ? 232 : 0 }}
      aria-hidden={!sidebarExpanded}
    >
      <div
        className={cn(
          'group flex h-full w-[232px] flex-col bg-transparent',
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
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-accent/70 hover:text-foreground group-hover:opacity-100"
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
                  active={activeSecondaryNav === item.id}
                  onClick={() => setActiveSecondaryNav(item.id)}
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
                    onClick={() => setActiveSecondaryNav(item.id)}
                  />
                ))}
              </SidebarSection>
            </>
          ) : null}
        </div>

        <SidebarFooter />
      </div>
    </aside>
  );
}

function SidebarFooter() {
  const { setActivePrimaryNav, setActiveSecondaryNav } = useLayout();
  return (
    <div className="shrink-0 px-2 pb-2 pt-2">
      <button
        type="button"
        onClick={() => {
          setActivePrimaryNav('home');
          setActiveSecondaryNav('my-tasks');
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
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-accent/70 hover:text-foreground group-hover:opacity-100"
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
  active,
  onClick,
  variant = 'page',
}: {
  item: NavLeaf;
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
      <span className="truncate">{item.label}</span>
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
