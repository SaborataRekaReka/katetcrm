/**
 * Adapter ApplicationApi (backend projection) → Application (UI-тип).
 *
 * Session 3: вся бизнес-логика (applicationGroup, readiness, hasAnyConflict,
 * positionsReady/Total, dominantSourcing, equipmentSummary,
 * subcontractorSummary, status per position, unit, subcontractor name) уже
 * вычислена на бэке. Здесь остаётся:
 *   - humanize lastActivity;
 *   - форма UI `ApplicationStage` (урезанная: без 'lead' и 'unqualified');
 *   - маппинг ApplicationItemApi → ApplicationPosition.
 */
import type {
  Application,
  ApplicationPosition,
  ApplicationStage,
} from '../types/application';
import type { ApplicationApi, ApplicationItemApi } from './applicationsApi';

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

function toStage(api: ApplicationApi['stage']): ApplicationStage {
  switch (api) {
    case 'application':
    case 'reservation':
    case 'departure':
    case 'completed':
    case 'cancelled':
      return api;
    case 'unqualified':
      return 'cancelled';
    case 'lead':
    default:
      return 'application';
  }
}

function parseMoney(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toPosition(it: ApplicationItemApi): ApplicationPosition {
  return {
    id: it.id,
    equipmentType: it.equipmentTypeLabel,
    quantity: it.quantity,
    shiftCount: it.shiftCount,
    overtimeHours: it.overtimeHours ?? undefined,
    downtimeHours: it.downtimeHours ?? undefined,
    plannedDate: it.plannedDate ?? undefined,
    plannedTimeFrom: it.plannedTimeFrom ?? undefined,
    plannedTimeTo: it.plannedTimeTo ?? undefined,
    address: it.address ?? undefined,
    comment: it.comment ?? undefined,
    sourcingType: it.sourcingType,
    subcontractor: it.subcontractor ?? undefined,
    unit: it.unit ?? undefined,
    pricePerShift: parseMoney(it.pricePerShift),
    deliveryPrice: parseMoney(it.deliveryPrice),
    surcharge: parseMoney(it.surcharge),
    readyForReservation: it.readyForReservation,
    status: it.status,
    reservationState: it.status === 'conflict' ? 'conflict' : undefined,
  };
}

export function toUiApplication(a: ApplicationApi): Application {
  return {
    id: a.id,
    number: a.number,
    stage: toStage(a.stage),
    leadId: a.leadId,
    clientId: a.clientId,
    clientName: a.clientName,
    clientCompany: a.clientCompany ?? undefined,
    clientPhone: a.clientPhone,
    responsibleManagerId: a.responsibleManagerId ?? undefined,
    responsibleManager: a.responsibleManagerName ?? '—',
    requestedDate: a.requestedDate ?? undefined,
    requestedTimeFrom: a.requestedTimeFrom ?? undefined,
    requestedTimeTo: a.requestedTimeTo ?? undefined,
    address: a.address ?? undefined,
    comment: a.comment ?? undefined,
    isUrgent: a.isUrgent,
    deliveryMode: a.deliveryMode ?? undefined,
    nightWork: a.nightWork,
    positions: a.positions.map(toPosition),
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    lastActivity: humanizeSince(a.lastActivityAt),
  };
}
