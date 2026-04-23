import { ReactNode } from 'react';
import { cn } from '../../ui/utils';

/**
 * Compact empty-state slot used inside WidgetCards and analytics widgets.
 * Keeps density consistent with the rest of the CRM — not a huge illustration.
 */
export function EmptyPanelState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-1.5 px-6 py-10 text-center',
        className,
      )}
    >
      {icon ? <div className="text-muted-foreground/60">{icon}</div> : null}
      <div className="text-[13px] font-medium text-foreground">{title}</div>
      {description ? <div className="text-[12px] text-muted-foreground">{description}</div> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
