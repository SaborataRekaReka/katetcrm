import { Lead } from '../../types/kanban';
import { Phone, Calendar, User, Package, CheckCircle2, Clock, AlertCircle, Link2 } from 'lucide-react';
import { SourceBadge } from './SourceBadge';
import { badgeBase, badgeTones } from './badgeTokens';

interface ApplicationKanbanCardProps {
  lead: Lead;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

function deriveReadiness(lead: Lead) {
  if (lead.applicationReadiness) return lead.applicationReadiness;
  if (lead.incompleteData) return 'no_data' as const;
  const ready = lead.positionsReady ?? 0;
  const total = lead.positionsTotal ?? lead.multipleItems ?? 0;
  if (total > 0 && ready === total) return 'ready' as const;
  if (total > 0 && ready > 0) return 'partial' as const;
  return 'waiting_sourcing' as const;
}

const readinessMeta: Record<string, { label: (l: Lead) => string; tone: string; Icon: React.ComponentType<{ className?: string }> }> = {
  ready: { label: () => 'Готово к брони', tone: badgeTones.success, Icon: CheckCircle2 },
  waiting_sourcing: { label: () => 'Ждёт sourcing', tone: badgeTones.caution, Icon: Clock },
  no_data: { label: () => 'Нет данных', tone: badgeTones.warning, Icon: AlertCircle },
  partial: {
    label: (l) => `${l.positionsReady ?? 0}/${l.positionsTotal ?? l.multipleItems ?? 0} готовы`,
    tone: badgeTones.progress,
    Icon: Package,
  },
  has_active_reservation: { label: () => 'Есть активная бронь', tone: 'bg-violet-50 text-violet-700 border-violet-200', Icon: Link2 },
};

export function ApplicationKanbanCard({ lead, onClick, draggable, onDragStart, onDragEnd }: ApplicationKanbanCardProps) {
  const readiness = deriveReadiness(lead);
  const meta = readinessMeta[readiness];
  const Icon = meta.Icon;
  const total = lead.positionsTotal ?? lead.multipleItems ?? 0;

  // Compact breakdown line (≤3 segments)
  const readyCount = lead.positionsReady ?? 0;
  const missingDataCount = lead.incompleteData ? Math.max(0, total - readyCount) : 0;
  const hasActiveReservation = readiness === 'has_active_reservation' || readiness === 'ready' || (readyCount > 0);
  const breakdownSegs: string[] = [];
  if (total > 0) breakdownSegs.push(`${readyCount}/${total} готовы`);
  if (missingDataCount > 0) breakdownSegs.push(`${missingDataCount} без данных`);
  if (hasActiveReservation && readyCount > 0) breakdownSegs.push('есть бронь');
  const breakdown = breakdownSegs.slice(0, 3).join(' • ');

  return (
    <div
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="bg-white border border-gray-200 rounded-md p-2.5 mb-1.5 cursor-pointer hover:shadow-sm hover:border-gray-300 transition-all group"
    >
      <div className="space-y-1.5">
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

        {/* Readiness primary badge */}
        <div>
          <span className={`${badgeBase} ${meta.tone}`}>
            <Icon className="w-3 h-3" />
            {meta.label(lead)}
          </span>
        </div>

        {/* Breakdown one-liner */}
        {breakdown && (
          <div className="text-[10px] text-gray-500">{breakdown}</div>
        )}

        {/* Equipment */}
        <div className="text-[11px] text-gray-700 truncate">{lead.equipmentType}</div>

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
