import { Lead } from '../../types/kanban';
import { Sparkles, PhoneOff, FileCheck, Calendar, Clock, Truck, Copy, AlertTriangle } from 'lucide-react';
import { cn } from '../ui/utils';

interface KpiRowProps {
  leads: Lead[];
}

export function KpiRow({ leads }: KpiRowProps) {
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
    { label: 'Новые лиды', value: stats.newLeads, icon: Sparkles, tone: 'blue' },
    { label: 'Без первого контакта', value: stats.noContact, icon: PhoneOff, tone: 'amber' },
    { label: 'Ждут перевода в заявку', value: stats.awaitingApplication, icon: FileCheck, tone: 'violet' },
    { label: 'Требуют брони', value: stats.needsReservation, icon: Calendar, tone: 'orange' },
    { label: 'Выезды сегодня', value: stats.departuresToday, icon: Truck, tone: 'emerald' },
    { label: 'Зависшие', value: stats.stale, icon: Clock, tone: 'red' },
    { label: 'Дубли', value: stats.duplicates, icon: Copy, tone: 'slate' },
    { label: 'Конфликт брони', value: stats.conflicts, icon: AlertTriangle, tone: 'rose' },
  ] as const;

  return (
    <div className="grid shrink-0 grid-cols-8 gap-2 border-b border-border/60 bg-white px-4 py-2">
      {cards.map((s) => {
        const Icon = s.icon;
        return (
          <button
            key={s.label}
            type="button"
            className="flex items-center gap-2 rounded-md border border-transparent bg-[#f7f8fa] px-2 py-1.5 text-left transition-colors hover:border-border/60 hover:bg-white"
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
