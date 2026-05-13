import { ReactNode } from 'react';
import { cn } from '../../ui/utils';

/**
 * Generic widget surface for dashboards.
 * - white bg on soft page background
 * - thin border
 * - optional header row with title / description / action
 * - padded body
 *
 * Use this instead of bespoke `<div className="rounded-lg border border-border bg-white ...">`
 * blocks on home / dashboard / settings screens.
 */
export interface WidgetCardProps {
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  /** Remove internal body padding (for list-only widgets with own row padding) */
  bodyPadded?: boolean;
  className?: string;
  bodyClassName?: string;
}

export function WidgetCard({
  title,
  description,
  icon,
  action,
  children,
  bodyPadded = true,
  className,
  bodyClassName,
}: WidgetCardProps) {
  const hasHeader = title != null || description != null || action != null;
  return (
    <section className={cn('flex flex-col rounded-lg border border-border bg-white', className)}>
      {hasHeader ? (
        <header className="flex items-center gap-3 border-b border-border/60 px-3 py-2 sm:px-4 sm:py-2.5">
          <div className="min-w-0 flex-1">
            {title != null ? (
              <div className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                {icon ? <span className="text-muted-foreground">{icon}</span> : null}
                <span className="break-words">{title}</span>
              </div>
            ) : null}
            {description != null ? (
              <div className="mt-0.5 text-[11px] text-muted-foreground">{description}</div>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}
      <div className={cn(bodyPadded ? 'p-3 sm:p-4' : '', 'min-w-0 flex-1', bodyClassName)}>{children}</div>
    </section>
  );
}
