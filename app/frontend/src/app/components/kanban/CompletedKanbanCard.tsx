import { Lead } from '../../types/kanban';
import { User, CheckCircle2, XCircle } from 'lucide-react';

interface CompletedKanbanCardProps {
  lead: Lead;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export function CompletedKanbanCard({ lead, onClick, draggable, onDragStart, onDragEnd }: CompletedKanbanCardProps) {
  const isCompleted = lead.stage === 'completed';
  const finalStatus = lead.completionReason || lead.unqualifiedReason;
  const dateStr = lead.completionDate
    ? new Date(lead.completionDate).toLocaleDateString('ru-RU')
    : lead.lastActivity;

  return (
    <div
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="bg-white/70 border border-gray-200 rounded-md px-2 py-1.5 mb-1 cursor-pointer hover:bg-white hover:border-gray-300 transition-all group"
    >
      <div className="flex items-center gap-1.5">
        {isCompleted ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
        ) : (
          <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-gray-800 truncate">{lead.client}</span>
            <span className="text-[10px] text-muted-foreground truncate">• {lead.equipmentType}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-0.5">
              <User className="w-2.5 h-2.5" />
              {lead.manager}
            </span>
            <span>{dateStr}</span>
            {finalStatus && <span className="truncate">• {finalStatus}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
