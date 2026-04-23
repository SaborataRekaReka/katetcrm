import { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '../../ui/utils';

/**
 * Quick access tile for home / overview / launcher strips.
 * Compact, utilitarian. Icon · label · optional meta · trailing arrow.
 */
export interface QuickLinkTileProps {
  icon?: ReactNode;
  label: string;
  description?: string;
  onClick?: () => void;
  className?: string;
}

export function QuickLinkTile({ icon, label, description, onClick, className }: QuickLinkTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-left transition-colors',
        'hover:border-gray-300 hover:bg-gray-50',
        className,
      )}
    >
      {icon ? (
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded text-gray-500 group-hover:text-gray-800">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] text-gray-900">{label}</div>
        {description ? (
          <div className="truncate text-[11px] text-gray-500">{description}</div>
        ) : null}
      </div>
      <ArrowUpRight className="h-3 w-3 shrink-0 text-gray-300 transition-colors group-hover:text-gray-500" />
    </button>
  );
}
