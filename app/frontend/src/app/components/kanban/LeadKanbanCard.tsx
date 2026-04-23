import { Lead } from '../../types/kanban';
import { Phone, Calendar, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../ui/utils';
import { SourceBadge } from './SourceBadge';
import { badgeBase, badgeTones } from './badgeTokens';

interface LeadKanbanCardProps {
  lead: Lead;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

const missingLabels: Record<NonNullable<Lead['missingFields']>[number], string> = {
  address: 'адреса',
  date: 'даты',
  contact: 'контакта',
  equipment: 'техники',
};

function computeMissing(lead: Lead): string[] {
  if (lead.missingFields && lead.missingFields.length) {
    return lead.missingFields.map((f) => missingLabels[f]);
  }
  const missing: string[] = [];
  if (!lead.address) missing.push('адреса');
  if (!lead.date) missing.push('даты');
  if (lead.hasNoContact || !lead.phone) missing.push('контакта');
  return missing;
}

type WarnTone = 'warning' | 'caution' | 'muted';

function computeWarning(lead: Lead): { label: string; tone: WarnTone } | null {
  if (lead.isUrgent) return { label: 'Срочно', tone: 'warning' };
  if (lead.hasNoContact) return { label: 'Без контакта', tone: 'caution' };
  if (lead.isStale) return { label: 'Завис', tone: 'muted' };
  if (lead.isDuplicate) return { label: 'Дубль', tone: 'caution' };
  return null;
}

export function LeadKanbanCard({ lead, onClick, draggable, onDragStart, onDragEnd }: LeadKanbanCardProps) {
  const missing = computeMissing(lead);
  const isReady = missing.length === 0;
  const warning = computeWarning(lead);

  // Readiness slot: prefer isNew adaptation
  let readiness: { label: string; tone: 'success' | 'caution' | 'progress'; icon: 'check' | 'alert' };
  if (lead.isNew && isReady) {
    readiness = { label: 'Новый', tone: 'progress', icon: 'check' };
  } else if (isReady) {
    readiness = { label: 'Готов к заявке', tone: 'success', icon: 'check' };
  } else {
    const shown = missing.slice(0, 2).join(', ') + (missing.length > 2 ? '…' : '');
    readiness = { label: `Не хватает: ${shown}`, tone: 'caution', icon: 'alert' };
  }

  return (
    <div
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'bg-white border border-gray-200 rounded-md p-2.5 mb-1.5 cursor-pointer hover:shadow-sm hover:border-gray-300 transition-all group'
      )}
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
          {warning && (
            <span className={`${badgeBase} ${badgeTones[warning.tone]}`}>
              {warning.label}
            </span>
          )}
        </div>

        {/* Source — unified single slot */}
        <div className="flex items-center gap-1">
          <SourceBadge source={lead.source} channel={lead.sourceChannel} />
        </div>

        {/* Conversion readiness — single slot */}
        <div>
          <span className={`${badgeBase} ${badgeTones[readiness.tone]}`}>
            {readiness.icon === 'check' ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <AlertCircle className="w-3 h-3" />
            )}
            {readiness.label}
          </span>
        </div>

        {/* Info */}
        <div className="space-y-0.5 text-[11px] text-muted-foreground">
          <div className={cn('flex items-center gap-1', lead.hasNoContact && 'text-amber-700')}>
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
              <span className="truncate">нет телефона</span>
            )}
          </div>

          <div className="truncate">{lead.equipmentType}</div>

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
