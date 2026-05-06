import { Lead } from '../../types/kanban';
import { AlertTriangle, User, XCircle } from 'lucide-react';

interface UnqualifiedKanbanCardProps {
  lead: Lead;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export function UnqualifiedKanbanCard({
  lead,
  onClick,
  draggable,
  onDragStart,
  onDragEnd,
}: UnqualifiedKanbanCardProps) {
  const reason = lead.unqualifiedReason || lead.completionReason || 'Причина не указана';
  const dateStr = lead.completionDate
    ? new Date(lead.completionDate).toLocaleDateString('ru-RU')
    : lead.lastActivity;

  return (
    <div
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="mb-1 rounded-md border border-rose-200 bg-rose-50/40 px-2 py-1.5 transition-all group cursor-pointer hover:border-rose-300 hover:bg-rose-50"
    >
      <div className="flex items-start gap-1.5">
        <XCircle className="mt-[1px] h-3.5 w-3.5 flex-shrink-0 text-rose-600" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[12px] text-gray-900">{lead.client}</span>
            <span className="truncate text-[10px] text-gray-500">• {lead.equipmentType}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-rose-700">
            <AlertTriangle className="h-2.5 w-2.5" />
            <span className="truncate">{reason}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-500">
            <span className="inline-flex items-center gap-0.5">
              <User className="h-2.5 w-2.5" />
              {lead.manager}
            </span>
            <span>{dateStr}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
