import { ReactNode } from 'react';
import { cn } from '../../ui/utils';

/**
 * Compact list row used inside WidgetCards:
 *   leading icon/avatar · primary title (+ secondary line) · trailing meta
 *
 * Matches the density and tone of CRM list screens.
 */
export interface InsightRowProps {
  leading?: ReactNode;
  primary: ReactNode;
  secondary?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  className?: string;
  interactive?: boolean;
}

export function InsightRow({
  leading,
  primary,
  secondary,
  trailing,
  onClick,
  interactive,
  className,
}: InsightRowProps) {
  const hoverable = interactive || !!onClick;
  const Tag: any = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex w-full min-w-0 flex-col items-start gap-1.5 px-3 py-2 text-left text-[12px] sm:flex-row sm:items-center sm:gap-3 sm:px-4',
        hoverable && 'cursor-pointer transition-colors hover:bg-muted/30',
        className,
      )}
    >
      {leading ? <span className="shrink-0 text-muted-foreground">{leading}</span> : null}
      <div className="min-w-0 w-full flex-1 sm:w-auto">
        <div className="truncate text-foreground">{primary}</div>
        {secondary != null ? (
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{secondary}</div>
        ) : null}
      </div>
      {trailing != null ? (
        <div className="self-end text-[11px] text-muted-foreground sm:ml-2 sm:self-auto sm:shrink-0">{trailing}</div>
      ) : null}
    </Tag>
  );
}

/**
 * Thin wrapper for rendering a divided list of InsightRow inside a WidgetCard.
 * Usage:
 *   <WidgetCard title="..." bodyPadded={false}>
 *     <InsightList>
 *       <InsightRow ... />
 *       <InsightRow ... />
 *     </InsightList>
 *   </WidgetCard>
 */
export function InsightList({ children, className }: { children: ReactNode; className?: string }) {
  return <ul className={cn('flex flex-col divide-y divide-border/40', className)}>{children}</ul>;
}
