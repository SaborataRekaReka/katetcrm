import { Search } from 'lucide-react';
import { useLayout } from './layoutStore';
import { Input } from '../ui/input';
import { WorkspaceHeader } from './WorkspaceHeader';
import { getModuleMeta } from './navConfig';

export function ModulePlaceholder() {
  const { activeSecondaryNav } = useLayout();
  const meta = getModuleMeta(activeSecondaryNav);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <WorkspaceHeader />

      <div className="flex h-11 shrink-0 items-center gap-1.5 border-b border-border/60 bg-white px-4">
        <div className="relative w-[260px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={meta.searchPlaceholder}
            className="h-7 border-border/70 pl-8 text-[12px]"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground">
        <p className="text-sm font-medium text-foreground/80">Модуль «{meta.title}»</p>
        <p className="max-w-md text-[12px]">
          Интерфейс этого раздела появится в следующей итерации. CRM-структура и навигация уже корректны.
        </p>
      </div>
    </div>
  );
}
