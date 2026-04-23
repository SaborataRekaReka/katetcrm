import { Phone, Users, Building2 } from 'lucide-react';
import { cn } from '../ui/utils';
import type { ClientsListItem } from '../../data/mockClientsList';

/**
 * Dense client cards view. Clear three-tier hierarchy:
 *  - primary: client name (+ type icon)
 *  - secondary: id · phone, tags
 *  - tertiary: stats row (orders / active / last)
 * Hover promotes border + soft shadow, whole card is clickable.
 */
const TAG_LABEL: Record<NonNullable<ClientsListItem['tags'][number]>, string> = {
  vip: 'VIP',
  new: 'Новый',
  repeat: 'Повторный',
  debt: 'Долг',
};

const TAG_TONE: Record<NonNullable<ClientsListItem['tags'][number]>, string> = {
  vip: 'bg-amber-50 text-amber-700 border-amber-200',
  new: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  repeat: 'bg-slate-50 text-slate-700 border-slate-200',
  debt: 'bg-rose-50 text-rose-700 border-rose-200',
};

export interface ClientsCardsViewProps {
  rows: ClientsListItem[];
  onCardClick: (c: ClientsListItem) => void;
}

export function ClientsCardsView({ rows, onCardClick }: ClientsCardsViewProps) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-[13px] text-muted-foreground">
        Клиенты не найдены
      </div>
    );
  }
  return (
    <div className="min-h-0 flex-1 overflow-auto p-3">
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}
      >
        {rows.map((c) => (
          <ClientCardCompact key={c.id} client={c} onClick={() => onCardClick(c)} />
        ))}
      </div>
    </div>
  );
}

function ClientCardCompact({
  client,
  onClick,
}: {
  client: ClientsListItem;
  onClick: () => void;
}) {
  const active = client.activeApplications + client.activeReservations;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-2 text-left transition-all hover:border-gray-300 hover:shadow-sm active:bg-gray-50"
    >
      <div className="flex items-start gap-1.5">
        {client.type === 'company' ? (
          <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-foreground">{client.name}</div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className="font-mono">{client.id}</span>
            <span>·</span>
            <Phone className="h-2.5 w-2.5" />
            <span className="truncate">{client.phone}</span>
          </div>
        </div>
      </div>

      {client.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {client.tags.map((t) => (
            <span
              key={t}
              className={cn(
                'inline-flex items-center rounded border px-1.5 py-0 text-[10px] leading-4',
                TAG_TONE[t],
              )}
            >
              {TAG_LABEL[t]}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-0.5 flex items-center justify-between border-t border-gray-100 pt-1.5 text-[11px] tabular-nums">
        <div className="flex items-center gap-2.5">
          <Stat label="Заказов" value={client.totalOrders} />
          <Stat
            label="Активные"
            value={active}
            tone={active > 0 ? 'brand' : undefined}
          />
        </div>
        <span className="truncate text-muted-foreground">{client.lastOrderDate ?? '—'}</span>
      </div>
    </button>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'brand';
}) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          'font-medium',
          tone === 'brand' ? 'text-[#2a6af0]' : 'text-foreground',
        )}
      >
        {value}
      </span>
    </div>
  );
}
