import { ReactNode, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../ui/utils';

export interface GroupedListGroup<T> {
  id: string;
  title: string;
  items: T[];
  /** Dot colour — accepts Tailwind bg class or arbitrary [#hex] value. */
  colorClass?: string;
  hint?: string;
}

export interface GroupedListProps<T> {
  groups: GroupedListGroup<T>[];
  /** Render one row. Wrapper handles spacing/divider; keep row compact. */
  renderRow: (item: T) => ReactNode;
  /** Column header strip shown ONCE at the top of the list. */
  columnsHeader?: ReactNode;
  /** Controlled expansion map by group id. */
  expanded?: Record<string, boolean>;
  onToggleGroup?: (id: string) => void;
  emptyGroupHint?: string;
  /** If true, groups without items collapse by default and render as a
   *  single compact line (still clickable to expand). */
  collapseEmptyGroups?: boolean;
}

/**
 * Grouped list with sticky group headers, colour dot, item count and
 * collapse chevron. Column header renders once at the top to reduce visual
 * repetition across groups. Groups with zero items can be auto-collapsed.
 */
export function GroupedList<T>({
  groups,
  renderRow,
  columnsHeader,
  expanded,
  onToggleGroup,
  emptyGroupHint = 'Нет записей',
  collapseEmptyGroups = true,
}: GroupedListProps<T>) {
  const defaultExpanded = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const g of groups) map[g.id] = collapseEmptyGroups ? g.items.length > 0 : true;
    return map;
  }, [groups, collapseEmptyGroups]);

  const [localExpanded, setLocalExpanded] = useState<Record<string, boolean>>(defaultExpanded);
  const isExpanded = (id: string) => {
    const map = expanded ?? localExpanded;
    return map[id] ?? (collapseEmptyGroups ? false : true);
  };
  const toggle = (id: string) => {
    if (onToggleGroup) onToggleGroup(id);
    else setLocalExpanded((prev) => ({ ...prev, [id]: !isExpanded(id) }));
  };

  return (
    <div className="flex flex-col">
      {columnsHeader ? (
        <div className="sticky top-0 z-[2] bg-white">{columnsHeader}</div>
      ) : null}
      {groups.map((g) => {
        const open = isExpanded(g.id);
        const isEmpty = g.items.length === 0;
        return (
          <section key={g.id} className="border-b border-border/60 last:border-b-0">
            <header
              className={cn(
                'sticky z-[1] flex items-center gap-2 border-b border-border/40 bg-muted/30 px-4 backdrop-blur-sm transition-colors',
                columnsHeader ? 'top-[28px]' : 'top-0',
                isEmpty ? 'h-7 opacity-70 hover:opacity-100' : 'h-9 hover:bg-muted/50',
              )}
              role="button"
              tabIndex={0}
              onClick={() => toggle(g.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggle(g.id);
                }
              }}
            >
              {open ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span
                className={cn(
                  'inline-block h-2.5 w-2.5 rounded-[3px] shrink-0',
                  g.colorClass ?? 'bg-muted-foreground/40',
                )}
              />
              <span className={cn('text-[12.5px] text-foreground', isEmpty ? 'font-normal' : 'font-semibold')}>
                {g.title}
              </span>
              <span
                className={cn(
                  'rounded px-1.5 text-[11px] tabular-nums',
                  isEmpty ? 'bg-muted/60 text-muted-foreground' : 'bg-white text-foreground border border-border/50',
                )}
              >
                {g.items.length}
              </span>
              {g.hint ? (
                <span className="text-[11px] text-muted-foreground">{g.hint}</span>
              ) : null}
            </header>

            {open ? (
              isEmpty ? (
                <div className="px-4 py-2 text-[12px] text-muted-foreground">{emptyGroupHint}</div>
              ) : (
                <div>
                  {g.items.map((item, idx) => (
                    <div key={idx}>{renderRow(item)}</div>
                  ))}
                </div>
              )
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

