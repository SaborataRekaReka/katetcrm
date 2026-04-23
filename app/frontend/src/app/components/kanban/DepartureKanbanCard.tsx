import { Lead } from '../../types/kanban';
import { MapPin, User, Clock, AlertTriangle } from 'lucide-react';
import { SourceBadge } from './SourceBadge';
import { cn } from '../ui/utils';
import { badgeBase, badgeTones } from './badgeTokens';

interface DepartureKanbanCardProps {
  lead: Lead;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

const departureStatusTones: Record<NonNullable<Lead['departureStatus']>, string> = {
  today: badgeTones.progress,
  soon: badgeTones.success,
  overdue: badgeTones.warning,
  awaiting: badgeTones.caution,
};

const departureStatusLabels = {
  today: 'Сегодня',
  soon: 'Скоро',
  overdue: 'Просрочен',
  awaiting: 'Ждёт завершения',
};

export function DepartureKanbanCard({ lead, onClick, draggable, onDragStart, onDragEnd }: DepartureKanbanCardProps) {
  const overdue = lead.departureStatus === 'overdue';
  const today = lead.departureStatus === 'today';

  return (
    <div
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'bg-white border rounded-md mb-1.5 cursor-pointer hover:shadow-sm transition-all group',
        overdue
          ? 'border-red-300 border-l-4 border-l-red-500'
          : today
          ? 'border-blue-200 border-l-4 border-l-blue-500'
          : 'border-gray-200 hover:border-gray-300'
      )}
    >
      <div className="p-2.5 space-y-1.5">
        {/* Prominent time block */}
        {(lead.date || lead.timeWindow) && (
          <div
            className={cn(
              'flex items-center gap-1.5 px-1.5 py-1 rounded text-[11px] border',
              overdue
                ? 'bg-red-50 border-red-200 text-red-700'
                : today
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-gray-50 border-gray-200 text-gray-700'
            )}
          >
            {overdue ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {lead.date && <span>{new Date(lead.date).toLocaleDateString('ru-RU')}</span>}
            {lead.timeWindow && <span>• {lead.timeWindow}</span>}
            {lead.departureStatus && (
              <span className={`ml-auto ${badgeBase} ${departureStatusTones[lead.departureStatus]}`}>
                {departureStatusLabels[lead.departureStatus]}
              </span>
            )}
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate">{lead.client}</div>
            {lead.company && (
              <div className="text-xs text-muted-foreground truncate">{lead.company}</div>
            )}
          </div>
          <SourceBadge source={lead.source} channel={lead.sourceChannel} />
        </div>

        {/* Equipment */}
        <div className="text-[11px] text-gray-700 truncate">{lead.equipmentType}</div>

        {lead.address && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{lead.address}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-gray-100">
          <div className="flex items-center gap-1 text-muted-foreground">
            <User className="w-3 h-3" />
            <span>{lead.manager}</span>
          </div>
          <span className="text-muted-foreground">{lead.lastActivity}</span>
        </div>
      </div>
    </div>
  );
}
