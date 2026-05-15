import { Lead } from '../../types/kanban';
import { Sparkles, PhoneOff, FileCheck, Calendar, Clock, Truck, Copy, AlertTriangle } from 'lucide-react';
import { cn } from '../ui/utils';

export type KpiCardId =
  | 'new_leads'
  | 'no_contact'
  | 'awaiting_application'
  | 'needs_reservation'
  | 'departures_today'
  | 'stale'
  | 'duplicates'
  | 'conflicts';

interface KpiRowProps {
  leads: Lead[];
  onSelect?: (id: KpiCardId) => void;
}

export function KpiRow({ leads, onSelect }: KpiRowProps) {
  const stats = {
    newLeads: leads.filter((l) => l.stage === 'lead' && l.isNew).length,
    noContact: leads.filter((l) => l.hasNoContact).length,
    awaitingApplication: leads.filter((l) => l.stage === 'lead' && !l.isNew).length,
    needsReservation: leads.filter((l) => l.stage === 'application').length,
    departuresToday: leads.filter((l) => l.stage === 'departure' && l.departureStatus === 'today').length,
    stale: leads.filter((l) => l.isStale).length,
    duplicates: leads.filter((l) => (l as { isDuplicate?: boolean }).isDuplicate).length,
    conflicts: leads.filter(
      (l) => l.stage === 'reservation' && (l as { hasConflict?: boolean }).hasConflict,
    ).length,
  };

  const cards = [
    { id: 'new_leads' as const, label: 'Новые лиды', value: stats.newLeads, icon: Sparkles, tone: 'blue' },
    { id: 'no_contact' as const, label: 'Без первого контакта', value: stats.noContact, icon: PhoneOff, tone: 'amber' },
    { id: 'awaiting_application' as const, label: 'Ждут перевода в заявку', value: stats.awaitingApplication, icon: FileCheck, tone: 'violet' },
    { id: 'needs_reservation' as const, label: 'Требуют брони', value: stats.needsReservation, icon: Calendar, tone: 'orange' },
    { id: 'departures_today' as const, label: 'Выезды сегодня', value: stats.departuresToday, icon: Truck, tone: 'emerald' },
    { id: 'stale' as const, label: 'Зависшие', value: stats.stale, icon: Clock, tone: 'red' },
    { id: 'duplicates' as const, label: 'Дубли', value: stats.duplicates, icon: Copy, tone: 'slate' },
    { id: 'conflicts' as const, label: 'Конфликт брони', value: stats.conflicts, icon: AlertTriangle, tone: 'rose' },
  ] as const;

  return (
    <div className="scroll-thin shrink-0 overflow-x-auto overflow-y-hidden border-b border-border/60 bg-white px-4 py-2 [scrollbar-gutter:stable]">
      <div className="grid w-max min-w-full grid-flow-col auto-cols-[minmax(136px,1fr)] gap-2 lg:w-full lg:grid-flow-row lg:grid-cols-8 lg:auto-cols-auto">
      {cards.map((s) => {
        const Icon = s.icon;
        return (
          <button
            key={s.id}
            type="button"
            onClick={onSelect ? () => onSelect(s.id) : undefined}
            disabled={!onSelect}
            className="flex items-center gap-2 rounded-md border border-transparent bg-[#f7f8fa] px-2 py-1.5 text-left transition-colors hover:border-border/60 hover:bg-white disabled:cursor-default disabled:hover:border-transparent disabled:hover:bg-[#f7f8fa]"
          >
            <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded', toneBg(s.tone))}>
              <Icon className={cn('h-3.5 w-3.5', toneText(s.tone))} />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[10px] text-muted-foreground">{s.label}</span>
              <span className="text-[14px] font-semibold leading-tight text-foreground">{s.value}</span>
            </span>
          </button>
        );
      })}
      </div>
    </div>
  );
}

function toneBg(tone: string) {
  switch (tone) {
    case 'blue': return 'bg-blue-50';
    case 'amber': return 'bg-amber-50';
    case 'violet': return 'bg-violet-50';
    case 'orange': return 'bg-orange-50';
    case 'emerald': return 'bg-emerald-50';
    case 'red': return 'bg-red-50';
    case 'slate': return 'bg-slate-100';
    case 'rose': return 'bg-rose-50';
    default: return 'bg-muted';
  }
}
function toneText(tone: string) {
  switch (tone) {
    case 'blue': return 'text-blue-600';
    case 'amber': return 'text-amber-600';
    case 'violet': return 'text-violet-600';
    case 'orange': return 'text-orange-600';
    case 'emerald': return 'text-emerald-600';
    case 'red': return 'text-red-600';
    case 'slate': return 'text-slate-600';
    case 'rose': return 'text-rose-600';
    default: return 'text-foreground';
  }
}
