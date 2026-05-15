import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Factory,
  HelpCircle,
  MapPin,
  MoreHorizontal,
  Truck,
  Wrench,
  XCircle,
} from 'lucide-react';
import { ReservationInternalStage } from '../../types/kanban';
import { GroupedList, GroupedListGroup } from './GroupedList';
import { badgeBase, badgeTones } from '../kanban/badgeTokens';
import { cn } from '../ui/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  RESERVATION_STAGE_COLOR,
  RESERVATION_STAGE_LABEL,
  RESERVATION_STAGE_ORDER,
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

function sourceBadge(source: 'own' | 'subcontractor' | 'undecided') {
  if (source === 'own')
    return (
      <span className={cn(badgeBase, badgeTones.muted)} title="Свой парк">
        <Building2 className="h-2.5 w-2.5" /> парк
      </span>
    );
  if (source === 'subcontractor')
    return (
      <span className={cn(badgeBase, badgeTones.progress)} title="Подрядчик">
        <Factory className="h-2.5 w-2.5" /> подр.
      </span>
    );
  return (
    <span className={cn(badgeBase, badgeTones.caution)} title="Источник не выбран">
      <HelpCircle className="h-2.5 w-2.5" /> источник?
    </span>
  );
}

interface ReservationsListViewProps {
  rows: ReservationRow[];
  onRowClick: (row: ReservationRow) => void;
  isFiltered?: boolean;
  onReleaseReservation?: (row: ReservationRow) => void;
  onOpenApplication?: (row: ReservationRow) => void;
  canOpenApplication?: (row: ReservationRow) => boolean;
  onOpenChangeUnit?: (row: ReservationRow) => void;
  onOpenSelectSubcontractor?: (row: ReservationRow) => void;
  onOpenMoveToDeparture?: (row: ReservationRow) => void;
}

export function ReservationsListView({
  rows,
  onRowClick,
  isFiltered,
  onReleaseReservation,
  onOpenApplication,
  canOpenApplication,
  onOpenChangeUnit,
  onOpenSelectSubcontractor,
  onOpenMoveToDeparture,
}: ReservationsListViewProps) {
  const groups: GroupedListGroup<ReservationRow>[] = RESERVATION_STAGE_ORDER.map((stage) => ({
    id: stage,
    title: RESERVATION_STAGE_LABEL[stage],
    colorClass: RESERVATION_STAGE_COLOR[stage],
    items: rows.filter((r) => deriveReservationState(r.reservation).stage === stage),
  }));

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
    <div className="min-h-0 flex-1 overflow-auto bg-white">
      <GroupedList
        groups={groups}
        emptyGroupHint="Нет броней в этой стадии"
        columnsHeader={
          <div
            className="grid h-7 items-center border-b border-border/40 bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground"
            style={{
              gridTemplateColumns:
                'minmax(260px,1fr) 140px 170px 140px 160px minmax(160px,1fr) 130px 130px 40px',
            }}
          >
            <div className="px-4">Бронь · клиент</div>
            <div className="px-3">Источник</div>
            <div className="px-3">Единица / подрядчик</div>
            <div className="px-3">Тип техники</div>
            <div className="px-3">Дата / окно</div>
            <div className="px-3">Адрес</div>
            <div className="px-3">Менеджер</div>
            <div className="px-3">Обновлено</div>
            <div />
          </div>
        }
        renderRow={(row) => (
          <ReservationListRow
            row={row}
            onClick={() => onRowClick(row)}
            onRelease={onReleaseReservation ? () => onReleaseReservation(row) : undefined}
            onOpenApplication={
              onOpenApplication && (canOpenApplication ? canOpenApplication(row) : true)
                ? () => onOpenApplication(row)
                : undefined
            }
            onOpenChangeUnit={onOpenChangeUnit ? () => onOpenChangeUnit(row) : undefined}
            onOpenSelectSubcontractor={
              onOpenSelectSubcontractor ? () => onOpenSelectSubcontractor(row) : undefined
            }
            onOpenMoveToDeparture={
              onOpenMoveToDeparture ? () => onOpenMoveToDeparture(row) : undefined
            }
          />
        )}
      />
    </div>
  );
}

function ReservationListRow({
  row,
  onClick,
  onRelease,
  onOpenApplication,
  onOpenChangeUnit,
  onOpenSelectSubcontractor,
  onOpenMoveToDeparture,
}: {
  row: ReservationRow;
  onClick: () => void;
  onRelease?: () => void;
  onOpenApplication?: () => void;
  onOpenChangeUnit?: () => void;
  onOpenSelectSubcontractor?: () => void;
  onOpenMoveToDeparture?: () => void;
}) {
  const { reservation } = row;
  const derived = deriveReservationState(reservation);
  const stage = derived.stage as ReservationInternalStage;
  const conflict = !!reservation.hasConflict;
  const ready = !!reservation.readyForDeparture;
  const released = reservation.status === 'released';

  // Единый операционный хинт — выводится из того же deriveReservationState, что и CTA
  // в модалке брони. Тон подбирается по характеру шага: критично → warning, готово →
  // success, снято → muted, иначе — нейтральный прогресс.
  const hintTone = conflict
    ? badgeTones.warning
    : released
      ? badgeTones.muted
      : stage === 'ready_for_departure'
        ? badgeTones.success
        : stage === 'needs_source_selection'
          ? badgeTones.caution
          : badgeTones.progress;
  const hintIcon = conflict ? (
    <AlertTriangle className="h-2.5 w-2.5" />
  ) : released ? (
    <XCircle className="h-2.5 w-2.5" />
  ) : stage === 'ready_for_departure' ? (
    <Truck className="h-2.5 w-2.5" />
  ) : stage === 'needs_source_selection' ? (
    <HelpCircle className="h-2.5 w-2.5" />
  ) : stage === 'searching_own_equipment' ? (
    <Wrench className="h-2.5 w-2.5" />
  ) : stage === 'searching_subcontractor' ? (
    <Building2 className="h-2.5 w-2.5" />
  ) : (
    <CheckCircle2 className="h-2.5 w-2.5" />
  );

  const unitOrSub = reservation.equipmentUnit
    ? reservation.equipmentUnit
    : reservation.subcontractor
      ? reservation.subcontractor
      : reservation.source === 'undecided'
        ? '—'
        : 'не выбран';
  const reservationDisplayId = formatEntityDisplayId('reservation', reservation.id, '—');
  const clientLabel = reservation.linked.clientName || reservation.linked.clientCompany || '—';
  const showClientCompany =
    !!reservation.linked.clientCompany
    && reservation.linked.clientCompany !== clientLabel;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick();
      }}
      className="group grid h-9 cursor-pointer items-center border-b border-border/40 text-[12px] transition-colors hover:bg-accent/40"
      style={{
        gridTemplateColumns:
          'minmax(260px,1fr) 140px 170px 140px 160px minmax(160px,1fr) 130px 130px 40px',
      }}
    >
      <div className="flex min-w-0 items-center gap-2 px-4">
        <span
          className={cn('inline-block h-2 w-2 shrink-0 rounded-full', RESERVATION_STAGE_COLOR[stage])}
          title={RESERVATION_STAGE_LABEL[stage]}
        />
        <div className="min-w-0 flex-1 truncate">
          <span className="text-[13px] font-medium text-foreground">{reservationDisplayId}</span>
          <span className="ml-1.5 text-[12px] text-muted-foreground">· {clientLabel}</span>
          {showClientCompany ? (
            <span className="ml-1 text-[12px] text-muted-foreground/80">({reservation.linked.clientCompany})</span>
          ) : null}
          <span className="ml-1 text-[11px] text-muted-foreground/70">
            · {reservation.linked.applicationTitle}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className={cn(badgeBase, hintTone)} title={derived.nextStep}>
            {hintIcon} {derived.nextStep}
          </span>
        </div>
      </div>

      <div className="truncate px-3">{sourceBadge(reservation.source)}</div>

      <div className="flex min-w-0 items-center gap-1.5 truncate px-3 text-muted-foreground">
        {reservation.equipmentUnit ? (
          <Wrench className="h-3 w-3 shrink-0" />
        ) : reservation.subcontractor ? (
          <Building2 className="h-3 w-3 shrink-0" />
        ) : null}
        <span className="truncate">{unitOrSub}</span>
      </div>

      <div className="truncate px-3 text-muted-foreground">{reservation.equipmentType}</div>

      <div className="flex min-w-0 items-center gap-1.5 truncate px-3 text-muted-foreground">
        <Calendar className="h-3 w-3 shrink-0" />
        <span className="truncate">
          {fmtDate(reservation.linked.plannedDate)}
          {reservation.linked.plannedTime ? ` · ${reservation.linked.plannedTime}` : ''}
        </span>
      </div>

      <div className="flex min-w-0 items-center gap-1.5 truncate px-3 text-muted-foreground">
        <MapPin className="h-3 w-3 shrink-0" />
        <span className="truncate">{reservation.linked.address ?? '—'}</span>
      </div>

      <div className="truncate px-3">{row.lead.manager}</div>
      <div className="truncate px-3 text-muted-foreground">{row.lead.lastActivity}</div>

      <div className="flex items-center justify-end pr-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(e) => e.stopPropagation()}
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent"
            aria-label="Действия"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} className="text-[12px]">
            <DropdownMenuItem onSelect={onClick}>Открыть бронь</DropdownMenuItem>
            <DropdownMenuItem disabled={!onOpenApplication} onSelect={onOpenApplication}>
              <ExternalLink className="mr-1 h-3.5 w-3.5" /> Открыть заявку
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={reservation.source !== 'own' || !onOpenChangeUnit}
              onSelect={onOpenChangeUnit}
            >
              <Wrench className="mr-1 h-3.5 w-3.5" /> Сменить единицу
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={reservation.source !== 'subcontractor' || !onOpenSelectSubcontractor}
              onSelect={onOpenSelectSubcontractor}
            >
              <Building2 className="mr-1 h-3.5 w-3.5" /> Выбрать подрядчика
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!ready || !onOpenMoveToDeparture}
              onSelect={onOpenMoveToDeparture}
            >
              <Truck className="mr-1 h-3.5 w-3.5" /> Перевести в выезд
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={released} onSelect={onRelease}>
              <XCircle className="mr-1 h-3.5 w-3.5" /> Снять бронь
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/** Helper used by kanban card tooltips/badges — re-exported for convenience. */
export { CheckCircle2 };
