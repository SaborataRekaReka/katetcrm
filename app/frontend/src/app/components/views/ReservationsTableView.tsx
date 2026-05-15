import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Factory,
  HelpCircle,
  Truck,
  Wrench,
  XCircle,
} from 'lucide-react';
import { DenseColumn, DenseDataTable } from './DenseDataTable';
import { badgeBase, badgeTones } from '../kanban/badgeTokens';
import { cn } from '../ui/utils';
import {
  RESERVATION_STAGE_COLOR,
  RESERVATION_STAGE_LABEL,
  ReservationRow,
  deriveReservationState,
} from '../shell/reservationHelpers';
import { formatEntityDisplayId } from '../../lib/entityDisplayId';

function fmtDate(d?: string) {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

interface ReservationsTableViewProps {
  rows: ReservationRow[];
  onRowClick: (row: ReservationRow) => void;
  isFiltered?: boolean;
}

export function ReservationsTableView({ rows, onRowClick, isFiltered }: ReservationsTableViewProps) {
  const columns: DenseColumn<ReservationRow>[] = [
    {
      id: 'id',
      header: 'ID брони',
      width: 160,
      sortValue: (r) => r.reservation.id,
      cell: (r) => (
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              'inline-block h-2 w-2 shrink-0 rounded-full',
              RESERVATION_STAGE_COLOR[deriveReservationState(r.reservation).stage],
            )}
          />
          <span className="truncate font-medium text-foreground">
            {formatEntityDisplayId('reservation', r.reservation.id, '—')}
          </span>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Статус',
      width: 110,
      sortValue: (r) => r.reservation.status,
      cell: (r) =>
        r.reservation.status === 'active' ? (
          <span className={cn(badgeBase, badgeTones.success)}>активна</span>
        ) : (
          <span className={cn(badgeBase, badgeTones.muted)}>снята</span>
        ),
    },
    {
      id: 'internalStage',
      header: 'Внутренняя стадия',
      width: 170,
      sortValue: (r) => deriveReservationState(r.reservation).stage,
      cell: (r) => (
        <span className="truncate text-foreground">
          {RESERVATION_STAGE_LABEL[deriveReservationState(r.reservation).stage]}
        </span>
      ),
    },
    {
      id: 'nextStep',
      header: 'Следующий шаг',
      width: 190,
      sortValue: (r) => deriveReservationState(r.reservation).nextStep,
      cell: (r) => {
        const d = deriveReservationState(r.reservation);
        const tone = r.reservation.hasConflict
          ? badgeTones.warning
          : r.reservation.status === 'released'
            ? badgeTones.muted
            : d.stage === 'ready_for_departure'
              ? badgeTones.success
              : d.stage === 'needs_source_selection'
                ? badgeTones.caution
                : badgeTones.progress;
        return <span className={cn(badgeBase, tone)}>{d.nextStep}</span>;
      },
    },
    {
      id: 'client',
      header: 'Клиент',
      width: 180,
      sortValue: (r) => r.reservation.linked.clientName,
      cell: (r) => {
        const contact = r.reservation.linked.clientName || r.reservation.linked.clientCompany || '—';
        const company = r.reservation.linked.clientCompany;
        const suffix = company && company !== contact ? ` (${company})` : '';
        return (
          <span className="truncate">
            {contact}
            {suffix}
          </span>
        );
      },
    },
    {
      id: 'application',
      header: 'Заявка',
      width: 140,
      sortValue: (r) => r.reservation.linked.applicationTitle,
      cell: (r) => <span className="truncate text-muted-foreground">{r.reservation.linked.applicationTitle}</span>,
    },
    {
      id: 'position',
      header: 'Позиция',
      width: 110,
      sortValue: (r) => r.reservation.linked.positionTitle,
      cell: (r) => <span className="truncate text-muted-foreground">{r.reservation.linked.positionTitle}</span>,
    },
    {
      id: 'equipment',
      header: 'Тип техники',
      width: 160,
      sortValue: (r) => r.reservation.equipmentType,
      cell: (r) => <span className="truncate text-muted-foreground">{r.reservation.equipmentType}</span>,
    },
    {
      id: 'unit',
      header: 'Единица',
      width: 120,
      sortValue: (r) => r.reservation.equipmentUnit ?? '',
      cell: (r) =>
        r.reservation.equipmentUnit ? (
          <span className="truncate">
            <Wrench className="mr-1 inline h-3 w-3" />
            {r.reservation.equipmentUnit}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'source',
      header: 'Источник',
      width: 120,
      sortValue: (r) => r.reservation.source,
      cell: (r) => {
        if (r.reservation.source === 'own')
          return (
            <span className={cn(badgeBase, badgeTones.muted)}>
              <Building2 className="h-2.5 w-2.5" /> парк
            </span>
          );
        if (r.reservation.source === 'subcontractor')
          return (
            <span className={cn(badgeBase, badgeTones.progress)}>
              <Factory className="h-2.5 w-2.5" /> подр.
            </span>
          );
        return (
          <span className={cn(badgeBase, badgeTones.caution)}>
            <HelpCircle className="h-2.5 w-2.5" /> не выбран
          </span>
        );
      },
    },
    {
      id: 'subcontractor',
      header: 'Подрядчик',
      width: 160,
      sortValue: (r) => r.reservation.subcontractor ?? '',
      cell: (r) => <span className="truncate text-muted-foreground">{r.reservation.subcontractor ?? '—'}</span>,
    },
    {
      id: 'date',
      header: 'Дата',
      width: 100,
      sortValue: (r) => r.reservation.linked.plannedDate ?? '',
      cell: (r) => <span className="text-muted-foreground">{fmtDate(r.reservation.linked.plannedDate)}</span>,
    },
    {
      id: 'time',
      header: 'Окно',
      width: 130,
      sortValue: (r) => r.reservation.linked.plannedTime ?? '',
      cell: (r) => <span className="truncate text-muted-foreground">{r.reservation.linked.plannedTime ?? '—'}</span>,
    },
    {
      id: 'address',
      header: 'Адрес',
      width: 220,
      sortValue: (r) => r.reservation.linked.address ?? '',
      cell: (r) => <span className="truncate text-muted-foreground">{r.reservation.linked.address ?? '—'}</span>,
    },
    {
      id: 'conflict',
      header: 'Конфликт',
      width: 110,
      sortValue: (r) => Number(!!r.reservation.hasConflict),
      cell: (r) =>
        r.reservation.hasConflict ? (
          <span className={cn(badgeBase, badgeTones.warning)}>
            <AlertTriangle className="h-2.5 w-2.5" /> да
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'ready',
      header: 'К выезду',
      width: 110,
      sortValue: (r) => Number(!!r.reservation.readyForDeparture),
      cell: (r) =>
        r.reservation.readyForDeparture ? (
          <span className={cn(badgeBase, badgeTones.success)}>
            <Truck className="h-2.5 w-2.5" /> готова
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'manager',
      header: 'Менеджер',
      width: 130,
      sortValue: (r) => r.lead.manager,
      cell: (r) => <span className="truncate">{r.lead.manager}</span>,
    },
    {
      id: 'updated',
      header: 'Обновлено',
      width: 130,
      sortValue: (r) => r.lead.lastActivity,
      cell: (r) => <span className="truncate text-muted-foreground">{r.lead.lastActivity}</span>,
    },
    {
      id: 'reservedBy',
      header: 'Создал',
      width: 130,
      defaultVisible: false,
      sortValue: (r) => r.reservation.reservedBy,
      cell: (r) => <span className="truncate text-muted-foreground">{r.reservation.reservedBy}</span>,
    },
    {
      id: 'createdAt',
      header: 'Создано',
      width: 150,
      defaultVisible: false,
      sortValue: (r) => r.reservation.reservedAt,
      cell: (r) => <span className="truncate text-muted-foreground">{r.reservation.reservedAt}</span>,
    },
    {
      id: 'releasedAt',
      header: 'Снята',
      width: 150,
      defaultVisible: false,
      sortValue: (r) => r.reservation.releasedAt ?? '',
      cell: (r) => <span className="truncate text-muted-foreground">{r.reservation.releasedAt ?? '—'}</span>,
    },
    {
      id: 'releaseReason',
      header: 'Причина снятия',
      width: 180,
      defaultVisible: false,
      sortValue: (r) => r.reservation.releaseReason ?? '',
      cell: (r) => <span className="truncate text-muted-foreground">{r.reservation.releaseReason ?? '—'}</span>,
    },
    {
      id: 'applicationId',
      header: 'ID заявки',
      width: 130,
      defaultVisible: false,
      sortValue: (r) => r.reservation.linked.applicationId,
      cell: (r) => <span className="truncate text-muted-foreground">{r.reservation.linked.applicationId}</span>,
    },
  ];

  if (rows.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-1 text-muted-foreground">
        <p className="text-[13px]">
          {isFiltered ? 'Нет броней по выбранным фильтрам' : 'Броней пока нет'}
        </p>
      </div>
    );
  }

  return (
    <DenseDataTable<ReservationRow>
      columns={columns}
      rows={rows}
      getRowId={(r) => r.reservation.id}
      onRowClick={onRowClick}
      storageKey="katet-crm.reservations.table.v1"
      emptyMessage="Нет броней"
    />
  );
}

export { XCircle, CheckCircle2 };
