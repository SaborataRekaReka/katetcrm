import { Phone, Users, Building2, MoreHorizontal, ExternalLink } from 'lucide-react';
import { cn } from '../ui/utils';
import type { ClientsListItem } from '../../data/mockClientsList';
import { PhoneLink } from '../detail/ContactAtoms';

/**
 * Reusable list view for the Clients module. Row is the whole interactive
 * target; right-side row actions appear on hover; numeric columns are
 * right-aligned; density is tight to match the list-screen family.
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

export interface ClientsListViewProps {
  rows: ClientsListItem[];
  onRowClick: (c: ClientsListItem) => void;
}

export function ClientsListView({ rows, onRowClick }: ClientsListViewProps) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-[13px] text-muted-foreground">
        Клиенты не найдены
      </div>
    );
  }
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="space-y-2 p-2 md:hidden">
        {rows.map((c) => (
          <article
            key={c.id}
            onClick={() => onRowClick(c)}
            className="cursor-pointer rounded-md border border-border/70 bg-white px-3 py-2.5 transition-colors hover:bg-gray-50 active:bg-gray-100"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                {c.type === 'company' ? (
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <div className="truncate text-[13px] text-foreground">{c.name}</div>
                  <div className="truncate font-mono text-[10px] text-muted-foreground">{c.id}</div>
                </div>
              </div>
              <RowAction
                title="Открыть"
                onClick={(e) => {
                  e.stopPropagation();
                  onRowClick(c);
                }}
              >
                <ExternalLink className="h-3 w-3" />
              </RowAction>
            </div>

            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <PhoneLink value={c.phone} prefix={<Phone className="h-3 w-3 text-muted-foreground" />} />
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              {c.tags.map((t) => (
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

            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              <div className="text-muted-foreground">Заказов</div>
              <div className="text-right tabular-nums text-foreground/80">{c.totalOrders}</div>

              <div className="text-muted-foreground">Активные</div>
              <div className="text-right tabular-nums">
                {c.activeApplications + c.activeReservations > 0 ? (
                  <span className="text-[#2a6af0]">{c.activeApplications + c.activeReservations}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>

              <div className="text-muted-foreground">Последний</div>
              <div className="text-right tabular-nums text-muted-foreground">{c.lastOrderDate ?? '—'}</div>

              <div className="text-muted-foreground">Менеджер</div>
              <div className="truncate text-right text-foreground/80">{c.manager}</div>
            </dl>
          </article>
        ))}
      </div>

      <table className="hidden w-full min-w-[1080px] border-collapse text-[12px] md:table">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="border-b border-border/60 text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="w-[26%] px-4 py-1.5 text-left font-medium">Клиент</th>
            <th className="w-[16%] px-3 py-1.5 text-left font-medium">Контакт</th>
            <th className="w-[15%] px-3 py-1.5 text-left font-medium">Сегмент</th>
            <th className="w-[8%] px-3 py-1.5 text-right font-medium">Заказов</th>
            <th className="w-[8%] px-3 py-1.5 text-right font-medium">Активные</th>
            <th className="w-[10%] px-3 py-1.5 text-left font-medium">Последний</th>
            <th className="w-[12%] px-3 py-1.5 text-left font-medium">Менеджер</th>
            <th className="w-[5%] px-3 py-1.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr
              key={c.id}
              onClick={() => onRowClick(c)}
              className="group cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 active:bg-gray-100"
            >
              <td className="px-4 py-1.5">
                <div className="flex items-center gap-2">
                  {c.type === 'company' ? (
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-foreground">{c.name}</div>
                    <div className="truncate font-mono text-[10px] text-muted-foreground">{c.id}</div>
                  </div>
                </div>
              </td>
              <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                <PhoneLink value={c.phone} prefix={<Phone className="h-3 w-3 text-muted-foreground" />} />
              </td>
              <td className="px-3 py-1.5">
                <div className="flex flex-wrap gap-1">
                  {c.tags.map((t) => (
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
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums text-foreground/80">
                {c.totalOrders}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums">
                {c.activeApplications + c.activeReservations > 0 ? (
                  <span className="text-[#2a6af0]">
                    {c.activeApplications + c.activeReservations}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-3 py-1.5 text-muted-foreground tabular-nums">
                {c.lastOrderDate ?? '—'}
              </td>
              <td className="px-3 py-1.5 text-foreground/80">
                <div className="truncate">{c.manager}</div>
              </td>
              <td className="px-3 py-1.5 text-right">
                <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <RowAction
                    title="Открыть"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRowClick(c);
                    }}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </RowAction>
                  <RowAction
                    title="Ещё"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </RowAction>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RowAction({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
    >
      {children}
    </button>
  );
}
