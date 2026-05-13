import { ReactNode } from 'react';
import { cn } from '../../ui/utils';

type StatTone = 'default' | 'progress' | 'success' | 'warning' | 'danger' | 'muted';

const TONE_ICON: Record<StatTone, string> = {
  default: 'text-foreground',
  progress: 'text-[#2a6af0]',
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-rose-600',
  muted: 'text-muted-foreground',
};

/**
 * Compact KPI tile for dashboard / overview rows.
 * Sits inside a responsive grid. Looks and feels consistent with the rest of CRM
 * (white surface + thin border + small icon + medium weight value).
 */
export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  tone?: StatTone;
  onClick?: () => void;
  className?: string;
}

export function StatCard({ label, value, icon, hint, tone = 'default', onClick, className }: StatCardProps) {
  const Tag: any = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex flex-col gap-0.5 rounded-md border border-gray-200 bg-white px-3 py-2 text-left transition-colors',
        onClick && 'cursor-pointer hover:border-gray-300 hover:bg-gray-50',
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
        {icon ? <span className={TONE_ICON[tone]}>{icon}</span> : null}
        <span className="break-words leading-tight">{label}</span>
      </div>
      <div className="text-[18px] leading-6 tabular-nums text-gray-900">{value}</div>
      {hint != null ? <div className="text-[11px] text-gray-500">{hint}</div> : null}
    </Tag>
  );
}
