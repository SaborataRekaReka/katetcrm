import { Application } from '../../types/application';
import { GroupedList, GroupedListGroup } from './GroupedList';
import {
  ApplicationGroupId,
  computeGroup,
  countReservedPositions,
  dominantSourcing,
  equipmentSummary,
  hasAnyConflict,
  readyForDeparture,
  subcontractorSummary,
} from '../shell/applicationHelpers';
import { badgeBase, badgeTones } from '../kanban/badgeTokens';
import { cn } from '../ui/utils';
import {
  AlertTriangle,
  Copy,
  Flame,
  MoreHorizontal,
  Plus,
  Truck,
  CheckCircle2,
  Building2,
  Factory,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

const GROUP_ORDER: ApplicationGroupId[] = [
  'no_reservation',
  'in_reservation_work',
  'ready_for_departure',
  'on_departure',
  'completed',
  'cancelled',
];

const GROUP_META: Record<ApplicationGroupId, { title: string; color: string }> = {
  no_reservation: { title: 'Активные заявки', color: 'bg-[#E74C3C]' },
  in_reservation_work: { title: 'В работе по брони', color: 'bg-[#F5A623]' },
  ready_for_departure: { title: 'Готовы к выезду', color: 'bg-[#50C878]' },
  on_departure: { title: 'В выезде', color: 'bg-[#4A90E2]' },
  completed: { title: 'Завершённые', color: 'bg-[#9B9B9B]' },
  cancelled: { title: 'Отменённые', color: 'bg-[#7B68EE]' },
};

function fmtDate(d?: string) {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

function fmtDateWindow(app: Application): string {
  const d = fmtDate(app.requestedDate);
  if (app.requestedTimeFrom && app.requestedTimeTo) {
    return `${d} · ${app.requestedTimeFrom}–${app.requestedTimeTo}`;
  }
  return d;
}

interface ApplicationsListViewProps {
  applications: Application[];
  onRowClick: (app: Application) => void;
  isFiltered?: boolean;
}

export function ApplicationsListView({ applications, onRowClick, isFiltered }: ApplicationsListViewProps) {
  const groups: GroupedListGroup<Application>[] = GROUP_ORDER
    .map((g) => ({
      id: g,
      title: GROUP_META[g].title,
      colorClass: GROUP_META[g].color,
      items: applications.filter((a) => computeGroup(a) === g),
    }))
    .filter((group) => group.items.length > 0);

  if (applications.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-1 text-muted-foreground">
        <p className="text-[13px]">
          {isFiltered ? 'Нет заявок по выбранным фильтрам' : 'Заявок пока нет'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-white">
      <GroupedList
        groups={groups}
        emptyGroupHint="Нет заявок в этой группе"
        columnsHeader={
          <div
            className="grid h-7 items-center border-b border-border/40 bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground"
            style={{ gridTemplateColumns: 'minmax(280px,1fr) 160px 180px 150px 1fr 130px 130px 40px' }}
          >
            <div className="px-4">Заявка · клиент</div>
            <div className="px-3">Позиции</div>
            <div className="px-3">Типы техники</div>
            <div className="px-3">Дата / окно</div>
            <div className="px-3">Адрес</div>
            <div className="px-3">Менеджер</div>
            <div className="px-3">Обновлено</div>
            <div />
          </div>
        }
        renderRow={(app) => <ApplicationListRow app={app} onClick={() => onRowClick(app)} />}
      />
    </div>
  );
}

function ApplicationListRow({ app, onClick }: { app: Application; onClick: () => void }) {
  const total = app.positions.length;
  const reserved = countReservedPositions(app);
  const conflict = hasAnyConflict(app);
  const ready = readyForDeparture(app);
  const sourcing = dominantSourcing(app);

  const readinessTone =
    conflict ? badgeTones.warning
    : reserved === total && total > 0 ? badgeTones.success
    : reserved > 0 ? badgeTones.caution
    : badgeTones.muted;

  const readinessDot =
    conflict ? 'bg-[#E74C3C]'
    : reserved === total && total > 0 ? 'bg-[#50C878]'
    : reserved > 0 ? 'bg-[#F5A623]'
    : 'bg-muted-foreground/40';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick();
      }}
      className="group grid h-9 cursor-pointer items-center border-b border-border/40 text-[12px] transition-colors hover:bg-accent/40"
      style={{ gridTemplateColumns: 'minmax(280px,1fr) 160px 180px 150px 1fr 130px 130px 40px' }}
    >
      <div className="flex min-w-0 items-center gap-2 px-4">
        <span
          className={cn('inline-block h-2 w-2 shrink-0 rounded-full', GROUP_META[computeGroup(app)].color)}
          title={GROUP_META[computeGroup(app)].title}
        />
        <div className="min-w-0 flex-1 truncate">
          <span className="text-[13px] font-medium text-foreground">{app.number}</span>
          <span className="ml-1.5 text-[12px] text-muted-foreground">· {app.clientName}</span>
          {app.clientCompany ? (
            <span className="ml-1 text-[12px] text-muted-foreground/80">({app.clientCompany})</span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {app.isUrgent ? (
            <span className={cn(badgeBase, badgeTones.warning)} title="Срочно">
              <Flame className="h-2.5 w-2.5" />
            </span>
          ) : null}
          {conflict ? (
            <span className={cn(badgeBase, badgeTones.warning)} title="Конфликт брони">
              <AlertTriangle className="h-2.5 w-2.5" /> конфликт
            </span>
          ) : null}
          {ready ? (
            <span className={cn(badgeBase, badgeTones.success)} title="Готова к выезду">
              <Truck className="h-2.5 w-2.5" /> готова
            </span>
          ) : null}
          {sourcing === 'subcontractor' ? (
            <span className={cn(badgeBase, badgeTones.muted)} title="Подрядчик">
              <Factory className="h-2.5 w-2.5" /> подр.
            </span>
          ) : sourcing === 'own' ? (
            <span className={cn(badgeBase, badgeTones.muted)} title="Свой парк">
              <Building2 className="h-2.5 w-2.5" /> парк
            </span>
          ) : sourcing === 'undecided' ? (
            <span className={cn(badgeBase, badgeTones.caution)} title="Источник не выбран">
              источник?
            </span>
          ) : null}
        </div>
      </div>

      {/* Positions cell — explicit multi-item summary with readiness dot */}
      <div className="flex items-center gap-1.5 truncate px-3">
        <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', readinessDot)} />
        <span className="text-foreground tabular-nums">{total}</span>
        <span className="text-muted-foreground">
          {total === 1 ? 'поз.' : 'поз.'}
        </span>
        <span className={cn(badgeBase, readinessTone, 'tabular-nums')} title="Позиций в брони">
          {reserved}/{total}
        </span>
      </div>

      <div className="truncate px-3 text-muted-foreground">{equipmentSummary(app)}</div>
      <div className="truncate px-3 text-muted-foreground">{fmtDateWindow(app)}</div>
      <div className="truncate px-3 text-muted-foreground">{app.address ?? '—'}</div>
      <div className="truncate px-3">{app.responsibleManager}</div>
      <div className="truncate px-3 text-muted-foreground">{app.lastActivity}</div>

      <div className="flex items-center justify-end pr-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(e) => e.stopPropagation()}
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent"
            aria-label="Действия"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onClick={(e) => e.stopPropagation()}
            className="text-[12px]"
          >
            <DropdownMenuItem onSelect={onClick}>Открыть заявку</DropdownMenuItem>
            <DropdownMenuItem>
              <Plus className="mr-1 h-3.5 w-3.5" /> Добавить позицию
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="mr-1 h-3.5 w-3.5" /> Дублировать позицию
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={reserved === total && total > 0}>
              Перейти к брони
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!ready}>
              <Truck className="mr-1 h-3.5 w-3.5" /> Перевести в выезд
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={app.stage !== 'departure' && app.stage !== 'reservation'}
            >
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Завершить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/** Named export helper so other views can reuse subcontractor summary. */
export { subcontractorSummary };
