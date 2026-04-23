import { ReactNode } from 'react';
import { cn } from '../../ui/utils';

/**
 * Full-bleed white list surface for operational pages (My Tasks, Urgent Today,
 * Recent Activity). Unlike DashboardPage (soft bg + widget cards), this keeps
 * the page as a single dense list — matching CRM list/table screens and ClickUp
 * list-mode typology.
 */
export function GroupedListPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-h-0 flex-1 overflow-auto bg-white', className)}>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

/**
 * Thin section header for grouped lists. Sits above a <ListGroupBody>.
 *
 *   Сегодня  ·  4        [optional action]
 */
export function ListGroupHeader({
  title,
  count,
  icon,
  action,
  tone,
  className,
}: {
  title: string;
  count?: number;
  icon?: ReactNode;
  action?: ReactNode;
  tone?: 'default' | 'danger' | 'warning' | 'progress';
  className?: string;
}) {
  const labelTone =
    tone === 'danger'
      ? 'text-rose-600'
      : tone === 'warning'
        ? 'text-amber-700'
        : tone === 'progress'
          ? 'text-blue-600'
          : 'text-gray-600';
  return (
    <div
      className={cn(
        'sticky top-0 z-[1] flex items-center gap-2 border-y border-gray-200 bg-gray-50/95 px-4 py-1.5 text-[11px] font-medium uppercase tracking-wider backdrop-blur',
        className,
      )}
    >
      {icon ? <span className={cn('shrink-0', labelTone)}>{icon}</span> : null}
      <span className={labelTone}>{title}</span>
      {count != null ? (
        <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-500 shadow-[0_0_0_1px_rgba(0,0,0,0.04)]">
          {count}
        </span>
      ) : null}
      {action ? <div className="ml-auto">{action}</div> : null}
    </div>
  );
}

/**
 * Container for a group's rows. Use with `ListGroupHeader`.
 */
export function ListGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col', className)}>{children}</div>;
}
