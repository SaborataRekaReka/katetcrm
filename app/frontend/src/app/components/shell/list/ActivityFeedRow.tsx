import { ReactNode } from 'react';
import { cn } from '../../ui/utils';

/**
 * Dense activity feed row. Matches the visual pattern used in DetailShell's
 * Journal tab — single line, icon + actor + action + optional entity + time.
 */
export interface ActivityFeedRowProps {
  icon: ReactNode;
  actor: string;
  text: ReactNode;
  entity?: ReactNode;
  onEntityClick?: () => void;
  time: string;
  className?: string;
}

export function ActivityFeedRow({
  icon,
  actor,
  text,
  entity,
  onEntityClick,
  time,
  className,
}: ActivityFeedRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 border-b border-gray-100 px-4 py-2 text-[12px]',
        className,
      )}
    >
      <span className="shrink-0 text-gray-300">{icon}</span>
      <div className="min-w-0 flex-1 truncate">
        <span className="text-gray-900">{actor}</span>
        <span className="mx-1 text-gray-600">{text}</span>
        {entity ? (
          onEntityClick ? (
            <button type="button" className="text-blue-600 hover:underline" onClick={onEntityClick}>
              {entity}
            </button>
          ) : (
            <span className="text-gray-700">{entity}</span>
          )
        ) : null}
      </div>
      <span className="shrink-0 text-[11px] text-gray-400 tabular-nums">{time}</span>
    </div>
  );
}
