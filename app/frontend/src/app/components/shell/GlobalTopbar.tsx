import { useCallback, useEffect } from 'react';
import { Search, Bell, HelpCircle, ChevronDown } from 'lucide-react';
import { cn } from '../ui/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { useLayout } from './layoutStore';
import { getDomainConfig } from './navConfig';

export function GlobalTopbar() {
  const {
    role,
    setRole,
    activePrimaryNav,
    setActivePrimaryNav,
    setActiveSecondaryNav,
  } = useLayout();
  const domain = getDomainConfig(activePrimaryNav);
  const placeholder = domain?.searchPlaceholder ?? 'Поиск';

  const focusWorkspaceSearch = useCallback(() => {
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
  }, [setActivePrimaryNav, setActiveSecondaryNav]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        focusWorkspaceSearch();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusWorkspaceSearch]);

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

  return (
    <header className="flex h-10 w-full shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-white px-3">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded bg-rose-500 text-[11px] font-bold text-white">
          К
        </span>
        <span className="text-[13px] font-semibold tracking-tight">Катет CRM</span>
      </div>

      <div className="flex max-w-[480px] flex-1 items-center">
        <button
          type="button"
          onClick={focusWorkspaceSearch}
          className="group flex h-7 w-full items-center gap-2 rounded-md border border-border/60 bg-[#f7f8fa] px-2.5 text-[12px] text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-white"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">{placeholder}</span>
          <kbd className="rounded bg-muted px-1 py-0.5 text-[10px] font-medium text-muted-foreground">
            Ctrl K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-0.5">
        {/* Role switcher - dev helper */}
        <button
          type="button"
          onClick={() => setRole(role === 'admin' ? 'manager' : 'admin')}
          className="mr-1 flex h-6 items-center gap-1 rounded-md border border-border px-2 text-[11px] text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
          title="Переключить роль"
        >
          {role === 'admin' ? 'Admin' : 'Manager'}
        </button>
        <TopbarIconButton icon={Bell} label="Уведомления" onClick={openAudit} />
        <TopbarIconButton icon={HelpCircle} label="Помощь" onClick={openHelp} />
        <button
          type="button"
          onClick={openProfile}
          className="ml-1 flex h-7 items-center gap-1 rounded-md px-1 text-xs transition-colors hover:bg-accent"
          aria-label="Профиль"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-[11px] font-semibold text-orange-700">
            TK
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
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
