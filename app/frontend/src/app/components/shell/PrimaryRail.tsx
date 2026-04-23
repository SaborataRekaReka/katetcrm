import { ChevronsRight } from 'lucide-react';
import { cn } from '../ui/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { useLayout } from './layoutStore';
import { PRIMARY_DOMAINS, getDomainConfig } from './navConfig';

export function PrimaryRail() {
  const {
    activePrimaryNav,
    setActivePrimaryNav,
    setActiveSecondaryNav,
    sidebarExpanded,
    setSidebarExpanded,
    role,
  } = useLayout();

  const domains = PRIMARY_DOMAINS.filter((d) => !d.allowedRoles || d.allowedRoles.includes(role));

  const handleClick = (id: string) => {
    setActivePrimaryNav(id);
    const cfg = getDomainConfig(id);
    if (cfg) setActiveSecondaryNav(cfg.defaultSecondary);
    if (!sidebarExpanded) setSidebarExpanded(true);
  };

  return (
    <aside
      className="relative flex h-full shrink-0 flex-col items-center overflow-hidden rounded-lg bg-[var(--shell-rail-bg)] text-[var(--shell-rail-fg)]"
      style={{ width: 48 }}
    >
      <div className="flex w-full flex-col items-center">
        {!sidebarExpanded && (
          <div className="flex h-10 w-full items-center justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setSidebarExpanded(true)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--shell-rail-fg-muted)] transition-colors hover:bg-white/15 hover:text-[var(--shell-rail-fg)]"
                  aria-label="Открыть меню"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Открыть меню <kbd className="ml-1 text-[10px] opacity-70">Ctrl \</kbd>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
        {sidebarExpanded && <div className="h-2" />}

        <div className="mx-2 mb-2 h-px w-8 bg-white/10" />

        <nav className="flex w-full flex-col items-center gap-1">
          {domains.map((d) => {
            const Icon = d.icon;
            const isActive = activePrimaryNav === d.id;
            return (
              <Tooltip key={d.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleClick(d.id)}
                    className={cn(
                      'relative flex h-9 w-9 items-center justify-center rounded-md transition-colors',
                      isActive
                        ? 'bg-[var(--shell-rail-active-bg)] text-[var(--shell-rail-active-fg)] shadow-sm'
                        : 'text-[var(--shell-rail-fg-muted)] hover:bg-white/10 hover:text-[var(--shell-rail-fg)]',
                    )}
                    aria-label={d.label}
                    aria-pressed={isActive}
                  >
                    <Icon className="h-[17px] w-[17px]" />
                    {isActive && (
                      <span className="absolute -left-1 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-white" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {d.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
