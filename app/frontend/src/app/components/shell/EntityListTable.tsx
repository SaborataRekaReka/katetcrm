import { ReactNode } from 'react';
import { MoreHorizontal, ExternalLink } from 'lucide-react';
import { cn } from '../ui/utils';

/**
 * `EntityListTable` — dense, ClickUp-like table surface for entity lists.
 * Contract:
 *   - tight rows (h-[30px]), 11px text, subtle `gray-100` dividers
 *   - sticky header, uppercase labels
 *   - whole row is the interactive target (`cursor-pointer`)
 *   - trailing row-actions column appears only on hover
 *   - numeric columns use `tabular-nums` and right-align
 *
 * Columns are consumer-defined; the table just provides the surface.
 * This primitive replaces ad-hoc `<table>` blocks in catalogs, clients, etc.
 */
export interface EntityColumn<T> {
  id: string;
  header: string;
  width?: string;
  align?: 'left' | 'right';
  render: (row: T) => ReactNode;
  className?: string;
}

export interface EntityRowAction<T> {
  id: string;
  title: string;
  icon: ReactNode;
  onClick: (row: T, e: React.MouseEvent) => void;
}

export interface EntityListTableProps<T extends { id: string }> {
  rows: T[];
  columns: EntityColumn<T>[];
  onRowClick?: (row: T) => void;
  rowActions?: EntityRowAction<T>[];
  emptyLabel?: string;
  minWidth?: number;
}

export function EntityListTable<T extends { id: string }>({
  rows,
  columns,
  onRowClick,
  rowActions,
  emptyLabel = 'Записей не найдено',
  minWidth = 800,
}: EntityListTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-[13px] text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }
  const defaultActions: EntityRowAction<T>[] = rowActions ?? (onRowClick
    ? [
        {
          id: 'open',
          title: 'Открыть',
          icon: <ExternalLink className="h-3 w-3" />,
          onClick: (row, e) => {
            e.stopPropagation();
            onRowClick(row);
          },
        },
        {
          id: 'more',
          title: 'Ещё',
          icon: <MoreHorizontal className="h-3 w-3" />,
          onClick: (_, e) => e.stopPropagation(),
        },
      ]
    : []);

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table
        className="w-full border-collapse text-[12px]"
        style={{ minWidth }}
      >
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="border-b border-border/60 text-[11px] uppercase tracking-wide text-muted-foreground">
            {columns.map((c) => (
              <th
                key={c.id}
                className={cn(
                  'px-3 py-1.5 font-medium',
                  c.align === 'right' ? 'text-right' : 'text-left',
                  c.className,
                )}
                style={c.width ? { width: c.width } : undefined}
              >
                {c.header}
              </th>
            ))}
            {defaultActions.length > 0 ? <th className="w-[56px] px-3 py-1.5" /> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'group border-b border-gray-100 transition-colors hover:bg-gray-50 active:bg-gray-100',
                onRowClick && 'cursor-pointer',
              )}
            >
              {columns.map((c) => (
                <td
                  key={c.id}
                  className={cn(
                    'px-3 py-1.5 align-middle',
                    c.align === 'right' ? 'text-right tabular-nums' : 'text-left',
                    c.className,
                  )}
                >
                  {c.render(row)}
                </td>
              ))}
              {defaultActions.length > 0 ? (
                <td className="px-3 py-1.5 text-right">
                  <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    {defaultActions.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        title={a.title}
                        onClick={(e) => a.onClick(row, e)}
                        className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                      >
                        {a.icon}
                      </button>
                    ))}
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
