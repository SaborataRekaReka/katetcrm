import { Lead } from '../../types/kanban';
import { Phone, Calendar, User, Building2, Truck, AlertTriangle, CheckCircle2, HelpCircle, Wrench } from 'lucide-react';
import { SourceBadge } from './SourceBadge';
import { cn } from '../ui/utils';
import { badgeBase, badgeTones } from './badgeTokens';

interface ReservationKanbanCardProps {
  lead: Lead;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

const reservationStageLabels = {
  own_equipment: 'Подбор своей техники',
  subcontractor: 'Подбор подрядчика',
  type_reserved: 'Тип забронирован',
  unit_confirmed: 'Единица уточнена',
  ready: 'Готово к выезду',
};

export function ReservationKanbanCard({ lead, onClick, draggable, onDragStart, onDragEnd }: ReservationKanbanCardProps) {
  const undecided = lead.ownOrSubcontractor === 'undecided';
  const hasConflict = lead.hasConflict;

  return (
    <div
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'bg-white border rounded-md mb-1.5 cursor-pointer hover:shadow-sm transition-all group relative',
        hasConflict
          ? 'border-red-300 border-l-4 border-l-red-500'
          : undecided
          ? 'border-amber-300 border-l-4 border-l-amber-400'
          : 'border-gray-200 hover:border-gray-300'
      )}
    >
      <div className="p-2.5 space-y-1.5">
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

        {/* Conflict callout */}
        {hasConflict && (
          <div className="flex items-center gap-1 px-1.5 py-1 rounded bg-red-50 border border-red-200 text-[11px] text-red-700">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            <span>Конфликт брони — требуется внимание</span>
          </div>
        )}

        {/* Equipment type */}
        <div className="text-sm">{lead.equipmentType}</div>

        {/* Internal stage */}
        {lead.reservationStage && (
          <span className={`${badgeBase} ${badgeTones.source}`}>
            {reservationStageLabels[lead.reservationStage]}
          </span>
        )}

        {/* Own/Subcontractor — neutral unless undecided (action needed) */}
        <div className="flex flex-wrap gap-1">
          {lead.ownOrSubcontractor === 'own' && (
            <span className={`${badgeBase} ${badgeTones.muted}`}>
              <Truck className="w-3 h-3" />
              Своя техника
            </span>
          )}
          {lead.ownOrSubcontractor === 'subcontractor' && (
            <span className={`${badgeBase} ${badgeTones.muted}`}>
              <Building2 className="w-3 h-3" />
              Подрядчик
            </span>
          )}
          {undecided && (
            <span className={`${badgeBase} ${badgeTones.caution}`}>
              <HelpCircle className="w-3 h-3" />
              Не определено
            </span>
          )}
        </div>

        {/* Sourcing details — neutral info rows */}
        <div className="space-y-1">
          {lead.equipmentUnit && (
            <div className="flex items-center gap-1.5 px-1.5 py-1 rounded bg-gray-50 border border-gray-100 text-[11px]">
              <Wrench className="w-3 h-3 text-gray-500 flex-shrink-0" />
              <span className="text-gray-500">Единица:</span>
              <span className="text-gray-900 truncate">{lead.equipmentUnit}</span>
            </div>
          )}
          {lead.subcontractor && (
            <div className="flex items-center gap-1.5 px-1.5 py-1 rounded bg-gray-50 border border-gray-100 text-[11px]">
              <Building2 className="w-3 h-3 text-gray-500 flex-shrink-0" />
              <span className="text-gray-500">Подрядчик:</span>
              <span className="text-gray-900 truncate">{lead.subcontractor}</span>
            </div>
          )}
        </div>

        {/* Ready — keep as a single clear success signal */}
        {lead.readyForDeparture && (
          <span className={`${badgeBase} ${badgeTones.success}`}>
            <CheckCircle2 className="w-3 h-3" />
            Готово к выезду
          </span>
        )}

        {/* Info */}
        <div className="space-y-0.5 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <Phone className="w-3 h-3 flex-shrink-0" />
            {lead.phone ? (
              <a
                href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`}
                onClick={(e) => e.stopPropagation()}
                className="truncate hover:underline hover:text-blue-600"
              >
                {lead.phone}
              </a>
            ) : (
              <span className="truncate">—</span>
            )}
          </div>

          {lead.date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 flex-shrink-0" />
              <span>{new Date(lead.date).toLocaleDateString('ru-RU')}</span>
              {lead.timeWindow && <span>• {lead.timeWindow}</span>}
            </div>
          )}
        </div>

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
