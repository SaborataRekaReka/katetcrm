import { Plus, LayoutGrid, List, Table as TableIcon } from 'lucide-react';
import { cn } from '../ui/utils';
import { useLayout } from './layoutStore';
import { getModuleMeta } from './navConfig';
import { usePrimaryCta } from './primaryCtaStore';

const TAB_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  board: LayoutGrid,
  list: List,
  table: TableIcon,
};

export function WorkspaceHeader() {
  const { activeSecondaryNav, currentView, setCurrentView } = useLayout();
  const meta = getModuleMeta(activeSecondaryNav);
  const tabs = meta.tabs;
  const ctaHandler = usePrimaryCta(activeSecondaryNav);

  return (
    <div className="shrink-0 border-b border-border/60 bg-white">
      <div className="flex h-10 items-center justify-between px-4">
        <h1 className="text-[14px] font-medium text-foreground">{meta.title}</h1>
        {meta.ctaLabel ? (
          <button
            type="button"
            onClick={ctaHandler ?? undefined}
            disabled={!ctaHandler}
            title={ctaHandler ? undefined : 'Действие пока недоступно'}
            className={cn(
              'flex h-7 items-center gap-1.5 rounded-md px-3 text-[12px] font-medium transition-colors',
              ctaHandler
                ? 'bg-[#2a6af0] text-white hover:bg-[#2358d1]'
                : 'cursor-not-allowed bg-[#2a6af0]/40 text-white/80',
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{meta.ctaLabel}</span>
          </button>
        ) : null}
      </div>

      {tabs && tabs.length > 1 ? (
        <div className="flex items-center gap-0 px-3">
          {tabs.map((tab) => {
            const active = currentView === tab.id;
            const Icon = TAB_ICON[tab.id] ?? List;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCurrentView(tab.id as typeof currentView)}
                className={cn(
                  'relative flex h-8 items-center gap-1.5 border-b-2 px-3 text-[13px] transition-colors',
                  active
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
