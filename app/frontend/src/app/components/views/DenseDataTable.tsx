import { ReactNode, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Columns3, ChevronsUpDown } from 'lucide-react';
import { cn } from '../ui/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Checkbox } from '../ui/checkbox';

export interface DenseColumn<T> {
  id: string;
  header: string;
  /** Min/preferred column width (px). */
  width?: number;
  cell: (row: T) => ReactNode;
  /** Return sortable key; undefined disables sort. */
  sortValue?: (row: T) => string | number | null | undefined;
  /** If true, column can be hidden via visibility menu. */
  hideable?: boolean;
  /** Default visibility. */
  defaultVisible?: boolean;
  /** Align content. */
  align?: 'left' | 'right' | 'center';
  /** Sticky to right edge (for actions). */
  stickyRight?: boolean;
}

export interface DenseDataTableProps<T> {
  columns: DenseColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Persistence key for column visibility + sort in localStorage. */
  storageKey?: string;
  emptyMessage?: ReactNode;
  /** Total height is governed by the parent; table scrolls internally. */
}

type SortState = { columnId: string; dir: 'asc' | 'desc' } | null;

function readPersisted(storageKey?: string): { visible?: Record<string, boolean>; sort?: SortState } {
  if (!storageKey || typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writePersisted(storageKey: string | undefined, data: { visible: Record<string, boolean>; sort: SortState }) {
  if (!storageKey || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

/**
 * Dense data grid à la ClickUp Table. Uses a single scroll container so the
 * header stays sticky and horizontal scroll is internal to the table only.
 */
export function DenseDataTable<T>({
  columns,
  rows,
  getRowId,
  onRowClick,
  storageKey,
  emptyMessage,
}: DenseDataTableProps<T>) {
  const persisted = useMemo(() => readPersisted(storageKey), [storageKey]);
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() => {
    const base: Record<string, boolean> = {};
    for (const c of columns) base[c.id] = c.defaultVisible ?? true;
    return { ...base, ...(persisted.visible ?? {}) };
  });
  const [sort, setSort] = useState<SortState>(persisted.sort ?? null);

  const persist = (nextVis: Record<string, boolean>, nextSort: SortState) => {
    writePersisted(storageKey, { visible: nextVis, sort: nextSort });
  };

  const toggleVisible = (id: string) => {
    setVisibility((prev) => {
      const next = { ...prev, [id]: !(prev[id] ?? true) };
      persist(next, sort);
      return next;
    });
  };

  const handleSort = (col: DenseColumn<T>) => {
    if (!col.sortValue) return;
    setSort((prev) => {
      let next: SortState;
      if (!prev || prev.columnId !== col.id) next = { columnId: col.id, dir: 'asc' };
      else if (prev.dir === 'asc') next = { columnId: col.id, dir: 'desc' };
      else next = null;
      persist(visibility, next);
      return next;
    });
  };

  const visibleColumns = columns.filter((c) => visibility[c.id] ?? true);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.id === sort.columnId);
    if (!col || !col.sortValue) return rows;
    const arr = [...rows];
    arr.sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [rows, sort, columns]);

  const gridTemplate = visibleColumns
    .map((c) => (c.width ? `${c.width}px` : 'minmax(140px,1fr)'))
    .join(' ');

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Column-visibility control bar */}
      <div className="flex h-7 shrink-0 items-center justify-end gap-3 border-b border-border/50 bg-white px-3 text-[11px] text-muted-foreground">
        <span className="tabular-nums">
          {rows.length} {rows.length === 1 ? 'запись' : rows.length < 5 ? 'записи' : 'записей'}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-5 items-center gap-1 rounded px-1.5 hover:bg-accent hover:text-foreground">
            <Columns3 className="h-3 w-3" />
            Колонки
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-[11px]">Видимость колонок</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {columns
              .filter((c) => c.hideable !== false)
              .map((c) => {
                const on = visibility[c.id] ?? true;
                return (
                  <DropdownMenuItem
                    key={c.id}
                    onSelect={(e) => {
                      e.preventDefault();
                      toggleVisible(c.id);
                    }}
                    className="gap-2 text-[12px]"
                  >
                    <Checkbox checked={on} className="h-3.5 w-3.5" />
                    {c.header}
                  </DropdownMenuItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="min-h-0 flex-1 overflow-auto scroll-xthin">
        <div className="min-w-full" style={{ minWidth: 'fit-content' }}>
          {/* Header */}
          <div
            className="sticky top-0 z-[2] grid border-b border-border/70 bg-white text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            {visibleColumns.map((c) => {
              const active = sort?.columnId === c.id;
              const align =
                c.align === 'right' ? 'justify-end' : c.align === 'center' ? 'justify-center' : 'justify-start';
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSort(c)}
                  disabled={!c.sortValue}
                  className={cn(
                    'flex h-8 select-none items-center gap-1 border-r border-border/40 px-3 text-left last:border-r-0',
                    align,
                    c.sortValue ? 'hover:text-foreground' : 'cursor-default',
                    c.stickyRight && 'sticky right-0 z-[1] bg-white shadow-[-1px_0_0_theme(colors.border)]',
                  )}
                >
                  <span className="truncate">{c.header}</span>
                  {c.sortValue ? (
                    active ? (
                      sort!.dir === 'asc' ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )
                    ) : (
                      <ChevronsUpDown className="h-3 w-3 opacity-40" />
                    )
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Rows */}
          {sortedRows.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-[12px] text-muted-foreground">
              {emptyMessage ?? 'Нет данных'}
            </div>
          ) : (
            sortedRows.map((row) => (
              <div
                key={getRowId(row)}
                className={cn(
                  'group grid h-8 items-center border-b border-border/40 bg-white text-[12px] transition-colors',
                  onRowClick ? 'cursor-pointer hover:bg-accent/40' : 'cursor-default',
                )}
                style={{ gridTemplateColumns: gridTemplate }}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {visibleColumns.map((c) => {
                  const align =
                    c.align === 'right'
                      ? 'justify-end text-right'
                      : c.align === 'center'
                        ? 'justify-center text-center'
                        : 'justify-start text-left';
                  const isActions = c.id === 'actions' || (c.stickyRight && !c.sortValue);
                  return (
                    <div
                      key={c.id}
                      className={cn(
                        'flex h-8 items-center overflow-hidden border-r border-border/30 px-3 last:border-r-0',
                        align,
                        isActions && 'opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity',
                        c.stickyRight && 'sticky right-0 z-[1] bg-white group-hover:bg-accent/40 shadow-[-1px_0_0_theme(colors.border)]',
                      )}
                    >
                      <div className="min-w-0 flex-1 truncate">{c.cell(row)}</div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
