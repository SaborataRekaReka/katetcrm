import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../ui/utils';

/**
 * Dense priority-queue row used on pages like "Срочное сегодня".
 * Layout: [leading icon] [title + secondary] [badge] [trailing meta / cta]
 */
export interface PriorityRowProps {
  leading: ReactNode;
  title: ReactNode;
  secondary?: ReactNode;
  badge?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function PriorityRow({
  leading,
  title,
  secondary,
  badge,
  trailing,
  onClick,
  className,
}: PriorityRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-2 text-left text-[12px] transition-colors hover:bg-gray-50 active:bg-gray-100',
        className,
      )}
    >
      <span className="shrink-0">{leading}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-gray-900">{title}</div>
        {secondary != null ? (
          <div className="mt-0.5 truncate text-[11px] text-gray-500">{secondary}</div>
        ) : null}
      </div>
      {badge != null ? <span className="shrink-0">{badge}</span> : null}
      {trailing != null ? (
        <span className="w-28 shrink-0 truncate text-right text-[11px] tabular-nums text-gray-500">
          {trailing}
        </span>
      ) : null}
      <ArrowHint />
    </button>
  );
}

function ArrowHint() {
  return (
    <ChevronRight className="h-3 w-3 shrink-0 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
  );
}
