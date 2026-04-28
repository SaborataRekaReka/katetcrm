/**
 * Adapter ReservationApi (backend projection) → ReservationRow.
 *
 * Session 4: бэк возвращает готовые stage/nextStep/ctaLabel/ctaDisabled/reason
 * через `derived`, а также плоские метки (clientName, managerName, labels).
 * Адаптер собирает минимально необходимые объекты Lead + Reservation для
 * существующего компонента `ReservationsWorkspacePage` (buildReservationRows/
 * applyReservationsFilters работают на этих типах).
 *
 * Детальные справочники (candidateUnits, subcontractorOptions) и активность
 * остаются пустыми для real API — это per-detail модалка подтянет отдельно.
 */
import type {
  Lead,
  Reservation,
  ReservationStage,
} from '../types/kanban';
import type { ReservationRow } from '../components/shell/reservationHelpers';
import type { ReservationApi } from './reservationsApi';

function mapReservationStage(api: ReservationApi): ReservationStage {
  if (api.internalStage === 'ready_for_departure') return 'ready';
  if (api.internalStage === 'unit_defined') return 'unit_confirmed';
  if (api.internalStage === 'type_reserved') return 'type_reserved';
  if (api.internalStage === 'subcontractor_selected') return 'subcontractor';
  if (api.source === 'subcontractor') return 'subcontractor';
  return 'own_equipment';
}

const MS_MIN = 60_000;
const MS_HOUR = 60 * MS_MIN;
const MS_DAY = 24 * MS_HOUR;

function humanizeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < MS_MIN) return 'только что';
  if (diff < MS_HOUR) return `${Math.floor(diff / MS_MIN)} мин назад`;
  if (diff < MS_DAY) return `${Math.floor(diff / MS_HOUR)} ч назад`;
  const days = Math.floor(diff / MS_DAY);
  return days === 1 ? '1 день назад' : `${days} дн назад`;
}

export function toReservationRow(api: ReservationApi): ReservationRow {
  const manager = api.responsibleManagerName ?? '—';
  const reservedBy = api.reservedByName ?? manager;
  const clientName = api.clientName ?? '—';
  const clientCompany = api.clientCompany ?? undefined;
  const equipmentType = api.equipmentTypeLabel ?? api.positionLabel;

  const lead: Lead = {
    id: api.applicationItemId,
    apiClientId: api.clientId ?? undefined,
    stage: 'reservation',
    client: clientName,
    company: clientCompany,
    phone: api.clientPhone ?? '',
    source: 'Заявка',
    equipmentType,
    manager,
    lastActivity: humanizeSince(api.updatedAt),
    reservationStage: mapReservationStage(api),
    ownOrSubcontractor: api.source,
    subcontractor: api.subcontractorLabel ?? undefined,
    equipmentUnit: api.equipmentUnitLabel ?? undefined,
    hasConflict: api.hasConflict,
    readyForDeparture: api.readyForDeparture,
  };

  const reservation: Reservation = {
    id: api.id,
    status: api.status,
    internalStage: api.internalStage,
    reservationType: api.equipmentUnitId ? 'specific_unit' : 'equipment_type',
    equipmentType,
    equipmentUnit: api.equipmentUnitLabel ?? undefined,
    source: api.source,
    subcontractor: api.subcontractorLabel ?? undefined,
    reservedBy,
    reservedAt: api.createdAt,
    releasedAt: api.releasedAt ?? undefined,
    releaseReason: api.releaseReason ?? undefined,
    comment: api.comment ?? undefined,
    lastActivity: humanizeSince(api.updatedAt),
    hasConflict: api.hasConflict,
    readyForDeparture: api.readyForDeparture,
    linked: {
      applicationId: api.applicationId,
      applicationTitle: api.applicationNumber
        ? `Заявка #${api.applicationNumber}`
        : 'Заявка',
      clientId: api.clientId ?? '',
      clientName: clientCompany ?? clientName,
      positionTitle: api.positionLabel,
      equipmentType,
      quantity: 1,
      plannedDate: api.plannedStart.slice(0, 10),
      plannedTime: `${api.plannedStart.slice(11, 16)}–${api.plannedEnd.slice(11, 16)}`,
    },
    candidateUnits: [],
    subcontractorOptions: [],
    activity: [],
  };

  return { lead, reservation };
}

export function toReservationRows(list: ReservationApi[]): ReservationRow[] {
  return list.map(toReservationRow);
}

/**
 * Adapter: ReservationApi → UI Reservation (для detail-модалки).
 *
 * Источник правды для persisted полей — бэк. candidateUnits/subcontractorOptions/
 * activity остаются пустыми: соответствующие endpoint-ы подключаются отдельно.
 * Conflict-context уже приходит в projection и переносится в `Reservation.conflict`.
 */
export function toReservationEntity(api: ReservationApi): Reservation {
  const manager = api.responsibleManagerName ?? '—';
  const reservedBy = api.reservedByName ?? manager;
  const clientName = api.clientName ?? '—';
  const clientCompany = api.clientCompany ?? undefined;
  const equipmentType = api.equipmentTypeLabel ?? api.positionLabel;

  const formatDateTime = (iso: string): string => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const plannedDate = api.plannedStart.slice(0, 10);
  const plannedTime = `${api.plannedStart.slice(11, 16)}–${api.plannedEnd.slice(11, 16)}`;

  return {
    id: api.id,
    status: api.status,
    internalStage: api.internalStage,
    reservationType: api.equipmentUnitId ? 'specific_unit' : 'equipment_type',
    equipmentType,
    equipmentUnit: api.equipmentUnitLabel ?? undefined,
    source: api.source,
    subcontractor: api.subcontractorLabel ?? undefined,
    reservedBy,
    reservedAt: formatDateTime(api.createdAt),
    releasedAt: api.releasedAt ? formatDateTime(api.releasedAt) : undefined,
    releaseReason: api.releaseReason ?? undefined,
    comment: api.comment ?? undefined,
    lastActivity: humanizeSince(api.updatedAt),
    hasConflict: api.hasConflict,
    conflict: api.conflict
      ? {
          id: api.conflict.id,
          summary: api.conflict.summary,
          conflictingReservationId: api.conflict.conflictingReservationId,
          conflictingAt: api.conflict.conflictingAt,
        }
      : undefined,
    readyForDeparture: api.readyForDeparture,
    linked: {
      applicationId: api.applicationId,
      applicationTitle: api.applicationNumber
        ? `Заявка #${api.applicationNumber}`
        : 'Заявка',
      clientId: api.clientId ?? '',
      clientName: clientCompany ?? clientName,
      positionTitle: api.positionLabel,
      equipmentType,
      quantity: 1,
      plannedDate,
      plannedTime,
    },
    candidateUnits: [],
    subcontractorOptions: [],
    activity: [],
  };
}
