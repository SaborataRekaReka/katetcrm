import { Circle, CheckCircle2, CircleDot, Ban, Flag } from 'lucide-react';
import { cn } from '../../ui/utils';
import type { TaskStatus, TaskPriority, TaskDomain, TaskDueKind } from '../../../data/mockTasks';
import { TASK_DOMAIN_LABEL } from '../../../data/mockTasks';

const STATUS_ICON: Record<TaskStatus, { icon: typeof Circle; cls: string }> = {
  open: { icon: Circle, cls: 'text-muted-foreground/70' },
  in_progress: { icon: CircleDot, cls: 'text-[#2a6af0]' },
  blocked: { icon: Ban, cls: 'text-rose-500' },
  done: { icon: CheckCircle2, cls: 'text-emerald-600' },
};

const PRIORITY_FLAG: Record<TaskPriority, string> = {
  urgent: 'text-rose-500 fill-rose-500',
  high: 'text-amber-500 fill-amber-500',
  normal: 'text-slate-400',
  low: 'text-slate-300',
};

const DUE_TONE: Record<TaskDueKind, string> = {
  overdue: 'text-rose-600',
  today: 'text-[#2a6af0]',
  tomorrow: 'text-foreground/80',
  later: 'text-muted-foreground',
  none: 'text-muted-foreground',
};

const DOMAIN_CHIP: Record<TaskDomain, string> = {
  lead: 'bg-sky-50 text-sky-700 border-sky-200',
  application: 'bg-violet-50 text-violet-700 border-violet-200',
  reservation: 'bg-amber-50 text-amber-700 border-amber-200',
  departure: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completion: 'bg-slate-50 text-slate-700 border-slate-200',
  client: 'bg-rose-50 text-rose-700 border-rose-200',
};

export interface TaskListRowProps {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: string;
  dueLabel?: string;
  dueKind: TaskDueKind;
  linkedDomain?: TaskDomain;
  linkedId?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * Dense, ClickUp-like task row.
 * Layout: [status] [priority flag] [title | meta] [linked chip] [assignee] [due]
 */
export function TaskListRow({
  id,
  title,
  status,
  priority,
  assignee,
  dueLabel,
  dueKind,
  linkedDomain,
  linkedId,
  onClick,
  className,
}: TaskListRowProps) {
  const Status = STATUS_ICON[status];
  const StatusIcon = Status.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-2 text-left text-[12px] transition-colors hover:bg-gray-50 active:bg-gray-100',
        className,
      )}
    >
      <StatusIcon className={cn('h-3.5 w-3.5 shrink-0', Status.cls)} />
      <Flag className={cn('h-3 w-3 shrink-0', PRIORITY_FLAG[priority])} />

      <div className="min-w-0 flex-1">
        <span
          className={cn(
            'truncate text-gray-900',
            status === 'done' && 'text-gray-400 line-through',
          )}
        >
          {title}
        </span>
      </div>

      {linkedDomain && linkedId ? (
        <span
          className={cn(
            'hidden w-40 shrink-0 truncate rounded border px-1.5 py-0.5 text-[10px] font-medium md:inline-flex md:items-center',
            DOMAIN_CHIP[linkedDomain],
          )}
          title={`${TASK_DOMAIN_LABEL[linkedDomain]} · ${linkedId}`}
        >
          {TASK_DOMAIN_LABEL[linkedDomain]} · {linkedId}
        </span>
      ) : (
        <span className="hidden w-40 shrink-0 md:inline" />
      )}

      <span className="hidden w-32 shrink-0 truncate text-[11px] text-gray-500 lg:inline">
        {assignee ?? ''}
      </span>

      <span
        className={cn('w-28 shrink-0 text-right text-[11px] tabular-nums', DUE_TONE[dueKind])}
      >
        {dueLabel ?? ''}
      </span>

      <span className="hidden w-20 shrink-0 text-right font-mono text-[10px] text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 xl:inline">
        {id}
      </span>
    </button>
  );
}
