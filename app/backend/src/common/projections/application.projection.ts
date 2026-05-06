/**
 * Application projection — "бэк как продолжение фронта".
 *
 * Проецируем Application + вложенные ApplicationItem[] + активные Reservation[]
 * в плоский вид, готовый к отрисовке. Вычисляем:
 *
 * Per-item:
 *   - status: 'no_reservation' | 'unit_selected' | 'reserved' | 'conflict'
 *     (ранее делал фронт из мока; теперь — из Reservation.internalStage +
 *      hasConflictWarning).
 *   - unit, subcontractor (из активных броней).
 *
 * Per-application (derived aggregates):
 *   - positionsTotal / positionsReserved / positionsReady
 *   - hasAnyConflict
 *   - dominantSourcing: 'own' | 'subcontractor' | 'mixed' | 'undecided'
 *   - equipmentSummary: string (первое слово типа техники, уникальные)
 *   - subcontractorSummary: string | null
 *   - applicationGroup: 'no_reservation' | 'in_reservation_work' |
 *     'ready_for_departure' | 'on_departure' | 'completed' | 'cancelled'
 *   - readyForDeparture: boolean
 *
 * Плоские поля для таблиц:
 *   - clientName / clientCompany / clientPhone (из Client)
 *   - responsibleManagerName (из User)
 */
import type {
  Application,
  ApplicationItem,
  Client,
  Completion,
  Departure,
  DepartureStatus,
  EquipmentType,
  EquipmentUnit,
  PipelineStage,
  Reservation,
  SourcingType,
  Subcontractor,
  User,
  DeliveryMode,
} from '@prisma/client';
import { buildStageLinkedIds, type StageLinkedIds } from './linked-ids';

export type ApplicationItemStatus =
  | 'no_reservation'
  | 'unit_selected'
  | 'reserved'
  | 'conflict';

export type ApplicationGroup =
  | 'no_reservation'
  | 'in_reservation_work'
  | 'ready_for_departure'
  | 'on_departure'
  | 'completed'
  | 'cancelled';

export type DominantSourcing = 'own' | 'subcontractor' | 'mixed' | 'undecided';

const ACTIVE_DEPARTURE_STATUSES = new Set<DepartureStatus>([
  'scheduled',
  'in_transit',
  'arrived',
]);

type DepartureWithCompletion = Pick<Departure, 'id' | 'status' | 'scheduledAt'> & {
  completion?: Pick<Completion, 'id'> | null;
};

type ReservationWithRelations = Reservation & {
  equipmentUnit?: EquipmentUnit | null;
  subcontractor?: Subcontractor | null;
  departures?: DepartureWithCompletion[];
};

type ApplicationItemWithRelations = ApplicationItem & {
  equipmentType?: EquipmentType | null;
  reservations?: ReservationWithRelations[];
};

export interface ApplicationWithRelations extends Application {
  client?: Pick<Client, 'id' | 'name' | 'company' | 'phone'> | Client | null;
  lead?: { id: string; stage: PipelineStage } | null;
  responsibleManager?: Pick<User, 'id' | 'fullName' | 'email'> | { id: string; fullName: string } | null;
  items?: ApplicationItemWithRelations[];
  _count?: { items: number };
}

export interface ApplicationItemView {
  id: string;
  applicationId: string;
  equipmentTypeId: string | null;
  equipmentTypeLabel: string;
  quantity: number;
  shiftCount: number;
  overtimeHours: number | null;
  downtimeHours: number | null;
  plannedDate: string | null;
  plannedTimeFrom: string | null;
  plannedTimeTo: string | null;
  address: string | null;
  comment: string | null;
  sourcingType: SourcingType;
  pricePerShift: string | null;
  deliveryPrice: string | null;
  surcharge: string | null;
  readyForReservation: boolean;

  // Derived:
  status: ApplicationItemStatus;
  unit: string | null;
  subcontractor: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface ApplicationView {
  id: string;
  number: string;
  stage: PipelineStage;

  // Связи (flat)
  leadId: string;
  clientId: string;
  clientName: string;
  clientCompany: string | null;
  clientPhone: string;
  responsibleManagerId: string | null;
  responsibleManagerName: string | null;

  // Детали запроса
  requestedDate: string | null;
  requestedTimeFrom: string | null;
  requestedTimeTo: string | null;
  address: string | null;
  comment: string | null;
  isUrgent: boolean;
  deliveryMode: DeliveryMode | null;
  nightWork: boolean;

  // Лайфцикл
  isActive: boolean;
  cancelledAt: string | null;
  completedAt: string | null;

  // Timestamps
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;

  // Позиции (спроецированные)
  positions: ApplicationItemView[];

  // Derived aggregates:
  positionsTotal: number;
  positionsReserved: number;
  positionsReady: number;
  hasAnyConflict: boolean;
  dominantSourcing: DominantSourcing;
  equipmentSummary: string;
  subcontractorSummary: string | null;
  applicationGroup: ApplicationGroup;
  readyForDeparture: boolean;
  linkedIds: StageLinkedIds;
}

interface LinkedReservationSelection {
  reservationId: string | null;
  applicationItemId: string | null;
  departureId: string | null;
  completionId: string | null;
}

function projectItem(item: ApplicationItemWithRelations): ApplicationItemView {
  const activeReservations = (item.reservations ?? []).filter((r) => r.isActive);

  let status: ApplicationItemStatus;
  if (activeReservations.some((r) => r.hasConflictWarning)) {
    status = 'conflict';
  } else if (
    activeReservations.some(
      (r) =>
        r.internalStage === 'unit_defined' ||
        r.internalStage === 'ready_for_departure' ||
        r.internalStage === 'subcontractor_selected',
    )
  ) {
    status = 'reserved';
  } else if (activeReservations.length > 0) {
    status = 'unit_selected';
  } else {
    status = 'no_reservation';
  }

  const firstRes = activeReservations[0];
  const unit = firstRes?.equipmentUnit?.name ?? null;
  const subcontractor = firstRes?.subcontractor?.name ?? null;

  return {
    id: item.id,
    applicationId: item.applicationId,
    equipmentTypeId: item.equipmentTypeId,
    equipmentTypeLabel: item.equipmentTypeLabel,
    quantity: item.quantity,
    shiftCount: item.shiftCount,
    overtimeHours: item.overtimeHours,
    downtimeHours: item.downtimeHours,
    plannedDate: item.plannedDate ? item.plannedDate.toISOString() : null,
    plannedTimeFrom: item.plannedTimeFrom,
    plannedTimeTo: item.plannedTimeTo,
    address: item.address,
    comment: item.comment,
    sourcingType: item.sourcingType,
    pricePerShift: item.pricePerShift ? item.pricePerShift.toString() : null,
    deliveryPrice: item.deliveryPrice ? item.deliveryPrice.toString() : null,
    surcharge: item.surcharge ? item.surcharge.toString() : null,
    readyForReservation: item.readyForReservation,

    status,
    unit,
    subcontractor,

    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function computeDominantSourcing(positions: ApplicationItemView[]): DominantSourcing {
  if (positions.length === 0) return 'undecided';
  const set = new Set(positions.map((p) => p.sourcingType));
  if (set.size === 1) {
    return positions[0].sourcingType as DominantSourcing;
  }
  if (set.has('undecided')) return 'undecided';
  return 'mixed';
}

function computeEquipmentSummary(positions: ApplicationItemView[]): string {
  const seen = new Set<string>();
  for (const p of positions) {
    const head = p.equipmentTypeLabel.split(' ')[0];
    if (head) seen.add(head);
  }
  return Array.from(seen).join(', ');
}

function computeSubcontractorSummary(positions: ApplicationItemView[]): string | null {
  const subs = Array.from(
    new Set(positions.map((p) => p.subcontractor).filter((v): v is string => !!v)),
  );
  return subs.length === 0 ? null : subs.join(', ');
}

function computeApplicationGroup(
  stage: PipelineStage,
  positionsTotal: number,
  positionsReserved: number,
  positionsReady: number,
  hasAnyConflict: boolean,
): ApplicationGroup {
  if (stage === 'completed') return 'completed';
  // Legacy compatibility: historical rows may still contain "unqualified",
  // but application UI/domain terminal state is "cancelled".
  if (stage === 'cancelled' || stage === 'unqualified') return 'cancelled';
  if (stage === 'departure') return 'on_departure';
  if (positionsTotal > 0 && positionsReady === positionsTotal && !hasAnyConflict) {
    return 'ready_for_departure';
  }
  if (positionsReserved === 0) return 'no_reservation';
  return 'in_reservation_work';
}

function pickLinkedReservation(items: ApplicationItemWithRelations[]): LinkedReservationSelection {
  const reservations = items.flatMap((item) =>
    (item.reservations ?? []).map((reservation) => ({
      reservation,
      applicationItemId: item.id,
    })),
  );

  if (reservations.length === 0) {
    return {
      reservationId: null,
      applicationItemId: null,
      departureId: null,
      completionId: null,
    };
  }

  reservations.sort((a, b) => {
    if (a.reservation.isActive !== b.reservation.isActive) {
      return Number(b.reservation.isActive) - Number(a.reservation.isActive);
    }
    return b.reservation.createdAt.getTime() - a.reservation.createdAt.getTime();
  });

  const selected = reservations[0];
  if (!selected) {
    return {
      reservationId: null,
      applicationItemId: null,
      departureId: null,
      completionId: null,
    };
  }

  const departure = [...(selected.reservation.departures ?? [])].sort((a, b) => {
    const aActive = ACTIVE_DEPARTURE_STATUSES.has(a.status) ? 1 : 0;
    const bActive = ACTIVE_DEPARTURE_STATUSES.has(b.status) ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    return b.scheduledAt.getTime() - a.scheduledAt.getTime();
  })[0];

  return {
    reservationId: selected.reservation.id,
    applicationItemId: selected.applicationItemId,
    departureId: departure?.id ?? null,
    completionId: departure?.completion?.id ?? null,
  };
}

export function projectApplication(app: ApplicationWithRelations): ApplicationView {
  const sourceItems = app.items ?? [];
  const positions = sourceItems.map(projectItem);

  const positionsTotal = positions.length;
  const positionsReserved = positions.filter((p) => p.status !== 'no_reservation').length;
  const positionsReady = positions.filter((p) => p.status === 'reserved').length;
  const hasAnyConflict = positions.some((p) => p.status === 'conflict');

  const applicationGroup = computeApplicationGroup(
    app.stage,
    positionsTotal,
    positionsReserved,
    positionsReady,
    hasAnyConflict,
  );
  const readyForDeparture =
    applicationGroup === 'ready_for_departure' || app.stage === 'departure';

  const client = app.client ?? null;
  const manager = app.responsibleManager ?? null;
  const linked = pickLinkedReservation(sourceItems);

  return {
    id: app.id,
    number: app.number,
    stage: app.stage,

    leadId: app.leadId,
    clientId: app.clientId,
    clientName: client?.name ?? '',
    clientCompany: client?.company ?? null,
    clientPhone: (client as Client | null)?.phone ?? '',
    responsibleManagerId: app.responsibleManagerId,
    responsibleManagerName: manager?.fullName ?? null,

    requestedDate: app.requestedDate ? app.requestedDate.toISOString() : null,
    requestedTimeFrom: app.requestedTimeFrom,
    requestedTimeTo: app.requestedTimeTo,
    address: app.address,
    comment: app.comment,
    isUrgent: app.isUrgent,
    deliveryMode: app.deliveryMode,
    nightWork: app.nightWork,

    isActive: app.isActive,
    cancelledAt: app.cancelledAt ? app.cancelledAt.toISOString() : null,
    completedAt: app.completedAt ? app.completedAt.toISOString() : null,

    lastActivityAt: app.lastActivityAt.toISOString(),
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),

    positions,

    positionsTotal,
    positionsReserved,
    positionsReady,
    hasAnyConflict,
    dominantSourcing: computeDominantSourcing(positions),
    equipmentSummary: computeEquipmentSummary(positions),
    subcontractorSummary: computeSubcontractorSummary(positions),
    applicationGroup,
    readyForDeparture,
    linkedIds: buildStageLinkedIds({
      leadId: app.leadId,
      applicationId: app.id,
      reservationId: linked.reservationId,
      departureId: linked.departureId,
      completionId: linked.completionId,
      clientId: app.clientId,
      applicationItemId: linked.applicationItemId,
    }),
  };
}

export function projectApplications(apps: ApplicationWithRelations[]): ApplicationView[] {
  return apps.map(projectApplication);
}

export function projectApplicationItem(item: ApplicationItemWithRelations): ApplicationItemView {
  return projectItem(item);
}
