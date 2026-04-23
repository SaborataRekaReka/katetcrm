import { ReactNode } from 'react';
import { cn } from '../../ui/utils';

/**
 * Compact page-level header used inside dashboard/home pages.
 * Sits above the first content block.
 *
 *   <CompactPageHeader title="Срочное сегодня" subtitle="..." />
 */
export function CompactPageHeader({
  title,
  subtitle,
  icon,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {icon ? <span className="text-muted-foreground">{icon}</span> : null}
          <h2 className="truncate text-[14px] font-medium text-foreground">{title}</h2>
        </div>
        {subtitle ? (
          <p className="mt-0.5 text-[12px] text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
