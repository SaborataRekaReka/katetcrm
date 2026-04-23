import { Application, ApplicationStage } from '../../types/application';
import { DenseDataTable, DenseColumn } from './DenseDataTable';
import { badgeBase, badgeTones } from '../kanban/badgeTokens';
import { cn } from '../ui/utils';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Flame,
  MoreHorizontal,
  Plus,
  Truck,
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
import {
  computeGroup,
  countReservedPositions,
  dominantSourcing,
  equipmentSummary,
  hasAnyConflict,
  readyForDeparture,
  subcontractorSummary,
} from '../shell/applicationHelpers';

const STAGE_META: Record<ApplicationStage, { title: string; color: string }> = {
  application: { title: 'В работе', color: 'bg-[#4A90E2]' },
  reservation: { title: 'Бронь', color: 'bg-[#F5A623]' },
  departure: { title: 'Выезд', color: 'bg-[#50C878]' },
  completed: { title: 'Завершена', color: 'bg-[#9B9B9B]' },
  cancelled: { title: 'Отменена', color: 'bg-[#E74C3C]' },
};

function fmtDate(d?: string) {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

interface ApplicationsTableViewProps {
  applications: Application[];
  onRowClick: (app: Application) => void;
  isFiltered?: boolean;
}

export function ApplicationsTableView({ applications, onRowClick, isFiltered }: ApplicationsTableViewProps) {
  const columns: DenseColumn<Application>[] = [
    {
      id: 'number',
      header: 'Заявка / клиент',
      width: 260,
      sortValue: (a) => a.number,
      cell: (a) => (
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', STAGE_META[a.stage].color)} />
          <span className="truncate font-medium text-foreground">{a.number}</span>
          <span className="truncate text-muted-foreground">· {a.clientName}</span>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Статус',
      width: 130,
      sortValue: (a) => a.stage,
      cell: (a) => (
        <span className={cn(badgeBase, badgeTones.muted)}>
          <span className={cn('mr-1 inline-block h-1.5 w-1.5 rounded-full', STAGE_META[a.stage].color)} />
          {STAGE_META[a.stage].title}
        </span>
      ),
    },
    {
      id: 'positionsCount',
      header: 'Позиции',
      width: 150,
      sortValue: (a) => a.positions.length,
      cell: (a) => {
        const total = a.positions.length;
        const reserved = countReservedPositions(a);
        return (
          <span>
            <span className="text-foreground">{total}</span>
            <span className="ml-1 text-muted-foreground">
              ·{' '}
              {reserved === total
                ? 'все в брони'
                : `${total - reserved} без брони`}
            </span>
          </span>
        );
      },
    },
    {
      id: 'equipment',
      header: 'Типы техники',
      width: 220,
      sortValue: (a) => equipmentSummary(a),
      cell: (a) => <span className="truncate text-muted-foreground">{equipmentSummary(a)}</span>,
    },
    {
      id: 'sourcing',
      header: 'Источник',
      width: 130,
      sortValue: (a) => dominantSourcing(a),
      cell: (a) => {
        const s = dominantSourcing(a);
        if (s === 'own')
          return (
            <span className={cn(badgeBase, badgeTones.muted)}>
              <Building2 className="h-2.5 w-2.5" /> парк
            </span>
          );
        if (s === 'subcontractor')
          return (
            <span className={cn(badgeBase, badgeTones.progress)}>
              <Factory className="h-2.5 w-2.5" /> подр.
            </span>
          );
        if (s === 'undecided')
          return <span className={cn(badgeBase, badgeTones.caution)}>не выбран</span>;
        return <span className={cn(badgeBase, badgeTones.muted)}>микс</span>;
      },
    },
    {
      id: 'subcontractor',
      header: 'Подрядчик',
      width: 160,
      sortValue: (a) => subcontractorSummary(a),
      cell: (a) => <span className="truncate text-muted-foreground">{subcontractorSummary(a)}</span>,
    },
    {
      id: 'reservationReadiness',
      header: 'К брони',
      width: 140,
      sortValue: (a) => countReservedPositions(a) / Math.max(1, a.positions.length),
      cell: (a) => {
        const total = a.positions.length;
        const reserved = countReservedPositions(a);
        const tone =
          total === 0
            ? badgeTones.muted
            : reserved === total
              ? badgeTones.success
              : reserved === 0
                ? badgeTones.caution
                : badgeTones.progress;
        return (
          <span className={cn(badgeBase, tone)}>
            {reserved}/{total}
          </span>
        );
      },
    },
    {
      id: 'departureReadiness',
      header: 'К выезду',
      width: 120,
      sortValue: (a) => Number(readyForDeparture(a)),
      cell: (a) =>
        readyForDeparture(a) ? (
          <span className={cn(badgeBase, badgeTones.success)}>
            <Truck className="h-2.5 w-2.5" /> готова
          </span>
        ) : (
          <span className={cn(badgeBase, badgeTones.muted)}>—</span>
        ),
    },
    {
      id: 'date',
      header: 'Дата',
      width: 100,
      sortValue: (a) => a.requestedDate ?? '',
      cell: (a) => <span className="text-muted-foreground">{fmtDate(a.requestedDate)}</span>,
    },
    {
      id: 'address',
      header: 'Адрес',
      width: 220,
      sortValue: (a) => a.address ?? '',
      cell: (a) => <span className="truncate text-muted-foreground">{a.address ?? '—'}</span>,
    },
    {
      id: 'manager',
      header: 'Менеджер',
      width: 140,
      sortValue: (a) => a.responsibleManager,
      cell: (a) => <span className="truncate">{a.responsibleManager}</span>,
    },
    {
      id: 'lastActivity',
      header: 'Обновлено',
      width: 130,
      sortValue: (a) => a.lastActivity,
      cell: (a) => <span className="truncate text-muted-foreground">{a.lastActivity}</span>,
    },
    {
      id: 'flags',
      header: 'Флаги',
      width: 140,
      sortValue: (a) => Number(a.isUrgent) + Number(hasAnyConflict(a)),
      cell: (a) => (
        <div className="flex items-center gap-1">
          {a.isUrgent ? (
            <span className={cn(badgeBase, badgeTones.warning)} title="Срочно">
              <Flame className="h-2.5 w-2.5" />
            </span>
          ) : null}
          {hasAnyConflict(a) ? (
            <span className={cn(badgeBase, badgeTones.warning)} title="Конфликт брони">
              <AlertTriangle className="h-2.5 w-2.5" />
            </span>
          ) : null}
          {a.nightWork ? (
            <span className={cn(badgeBase, badgeTones.muted)} title="Ночные работы">
              ночь
            </span>
          ) : null}
        </div>
      ),
    },
    // Opcional / off-by-default
    {
      id: 'conflictCount',
      header: 'Конфликтов',
      width: 120,
      defaultVisible: false,
      sortValue: (a) =>
        a.positions.filter((p) => p.status === 'conflict' || p.reservationState === 'conflict').length,
      cell: (a) => {
        const c = a.positions.filter(
          (p) => p.status === 'conflict' || p.reservationState === 'conflict',
        ).length;
        return <span className={c ? 'text-red-600' : 'text-muted-foreground'}>{c}</span>;
      },
    },
    {
      id: 'hasUnit',
      header: 'Есть юнит',
      width: 110,
      defaultVisible: false,
      sortValue: (a) => Number(a.positions.some((p) => !!p.unit)),
      cell: (a) =>
        a.positions.some((p) => !!p.unit) ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'comment',
      header: 'Комментарий',
      width: 220,
      defaultVisible: false,
      sortValue: (a) => a.comment ?? '',
      cell: (a) => <span className="truncate text-muted-foreground">{a.comment ?? '—'}</span>,
    },
    {
      id: 'createdAt',
      header: 'Создана',
      width: 120,
      defaultVisible: false,
      sortValue: (a) => a.createdAt,
      cell: (a) => <span className="text-muted-foreground">{fmtDate(a.createdAt)}</span>,
    },
    {
      id: 'actions',
      header: '',
      width: 44,
      stickyRight: true,
      hideable: false,
      cell: (a) => {
        const total = a.positions.length;
        const reserved = countReservedPositions(a);
        const ready = readyForDeparture(a);
        return (
          <div className="flex w-full justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger
                onClick={(e) => e.stopPropagation()}
                className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent"
                aria-label="Действия"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} className="text-[12px]">
                <DropdownMenuItem onSelect={() => onRowClick(a)}>Открыть заявку</DropdownMenuItem>
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
                  disabled={a.stage !== 'departure' && a.stage !== 'reservation'}
                >
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Завершить
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <DenseDataTable
      columns={columns}
      rows={applications}
      getRowId={(a) => a.id}
      onRowClick={onRowClick}
      storageKey="katet-crm.applications-table.v1"
      emptyMessage={isFiltered ? 'Нет заявок по выбранным фильтрам' : 'Заявок пока нет'}
    />
  );
}
