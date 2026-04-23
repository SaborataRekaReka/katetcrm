/**
 * Projection Reservation (raw Prisma с include) → ReservationView (UI-ready).
 *
 * Session 4: бэк становится единственным источником правды для
 * производных полей брони — stage/nextStep/ctaLabel/ctaDisabled/reason
 * (аналог FE `deriveReservationState`), а также плоских меток и
 * булевых флагов-алиасов:
 *   - hasConflict  ← hasConflictWarning
 *   - readyForDeparture ← internalStage === 'ready_for_departure'
 *   - status: 'active'|'released' ← isActive
 *   - source: 'own'|'subcontractor'|'undecided' ← sourcingType
 *   - equipmentTypeLabel / equipmentUnitLabel / subcontractorLabel
 *   - applicationNumber / clientId / positionLabel
 *
 * UI-специфичные ephemeral переходы (user меняет источник внутри модалки
 * ДО сохранения) остаются на фронте — это легитимный случай, потому что
 * они не отражают persisted state.
 */
import type {
  Prisma,
  ReservationInternalStage,
  SourcingType,
} from '@prisma/client';

export type ReservationUiStatus = 'active' | 'released';
export type ReservationUiSource = 'own' | 'subcontractor' | 'undecided';

export interface ReservationDerivedState {
  /** internalStage уровня бизнес-логики (может отличаться от persisted при конфликте). */
  displayStage: ReservationInternalStage;
  nextStep: string;
  ctaLabel: string;
  ctaDisabled: boolean;
  reason: string | null;
}

export interface ReservationView {
  id: string;
  applicationItemId: string;
  applicationId: string;
  applicationNumber: string | null;
  clientId: string | null;
  clientName: string | null;
  clientCompany: string | null;
  clientPhone: string | null;
  responsibleManagerId: string | null;
  responsibleManagerName: string | null;
  positionLabel: string;
  equipmentTypeId: string | null;
  equipmentTypeLabel: string | null;
  equipmentUnitId: string | null;
  equipmentUnitLabel: string | null;
  subcontractorId: string | null;
  subcontractorLabel: string | null;
  sourcingType: SourcingType;
  /** UI-алиас sourcingType: undecided если needs_source_selection. */
  source: ReservationUiSource;
  internalStage: ReservationInternalStage;
  status: ReservationUiStatus;
  plannedStart: string;
  plannedEnd: string;
  hasConflict: boolean;
  readyForDeparture: boolean;
  subcontractorConfirmation: string;
  promisedModelOrUnit: string | null;
  subcontractorNote: string | null;
  comment: string | null;
  releasedAt: string | null;
  releaseReason: string | null;
  createdAt: string;
  updatedAt: string;
  derived: ReservationDerivedState;
}

type WithIncludes = Prisma.ReservationGetPayload<{
  include: {
    applicationItem: {
      select: {
        id: true;
        equipmentTypeLabel: true;
        applicationId: true;
        application: {
          select: {
            id: true;
            number: true;
            clientId: true;
            client: {
              select: { id: true; name: true; company: true; phone: true };
            };
            responsibleManager: {
              select: { id: true; fullName: true };
            };
          };
        };
      };
    };
    equipmentType: { select: { id: true; name: true } };
    equipmentUnit: { select: { id: true; name: true } };
    subcontractor: { select: { id: true; name: true } };
  };
}>;

function toSource(
  sourcingType: SourcingType,
  internalStage: ReservationInternalStage,
): ReservationUiSource {
  if (sourcingType === 'undecided') return 'undecided';
  if (internalStage === 'needs_source_selection') return 'undecided';
  return sourcingType === 'own' ? 'own' : 'subcontractor';
}

/**
 * Портированная логика FE `deriveReservationState`. Единственный источник
 * правды для stage/nextStep/CTA в списковых представлениях.
 */
export function deriveReservationState(input: {
  status: ReservationUiStatus;
  source: ReservationUiSource;
  equipmentUnit: boolean;
  subcontractor: boolean;
  hasConflict: boolean;
  readyForDeparture: boolean;
}): ReservationDerivedState {
  const { status, source, equipmentUnit, subcontractor, hasConflict, readyForDeparture } = input;

  if (status === 'released') {
    return {
      displayStage: 'released',
      nextStep: 'Снято',
      ctaLabel: 'Бронь снята',
      ctaDisabled: true,
      reason: null,
    };
  }
  if (source === 'undecided') {
    return {
      displayStage: 'needs_source_selection',
      nextStep: 'Нужно выбрать источник',
      ctaLabel: 'Выбрать источник',
      ctaDisabled: false,
      reason: 'Источник не выбран',
    };
  }
  if (source === 'own' && !equipmentUnit) {
    return {
      displayStage: 'searching_own_equipment',
      nextStep: 'Нужно назначить unit',
      ctaLabel: 'Назначить unit',
      ctaDisabled: false,
      reason: 'Unit не выбран',
    };
  }
  if (source === 'subcontractor' && !subcontractor) {
    return {
      displayStage: 'searching_subcontractor',
      nextStep: 'Нужно выбрать подрядчика',
      ctaLabel: 'Выбрать подрядчика',
      ctaDisabled: false,
      reason: 'Подрядчик не выбран',
    };
  }
  if (hasConflict) {
    return {
      displayStage: source === 'own' && equipmentUnit ? 'unit_defined' : 'type_reserved',
      nextStep: 'Нужно разрешить конфликт',
      ctaLabel: 'Разрешить конфликт',
      ctaDisabled: false,
      reason: 'Есть конфликт',
    };
  }
  if (readyForDeparture) {
    return {
      displayStage: 'ready_for_departure',
      nextStep: 'Готово к выезду',
      ctaLabel: 'Перевести в выезд',
      ctaDisabled: false,
      reason: null,
    };
  }
  if (source === 'own' && equipmentUnit) {
    return {
      displayStage: 'unit_defined',
      nextStep: 'Нужно подтвердить бронь',
      ctaLabel: 'Подтвердить бронь',
      ctaDisabled: false,
      reason: null,
    };
  }
  return {
    displayStage: 'type_reserved',
    nextStep: 'Нужно подтвердить бронь',
    ctaLabel: 'Подтвердить бронь',
    ctaDisabled: false,
    reason: null,
  };
}

export function projectReservation(r: WithIncludes): ReservationView {
  const status: ReservationUiStatus = r.isActive ? 'active' : 'released';
  const source = toSource(r.sourcingType, r.internalStage);
  const hasConflict = r.hasConflictWarning;
  const readyForDeparture = r.internalStage === 'ready_for_departure';
  const equipmentTypeLabel = r.equipmentType?.name ?? r.applicationItem?.equipmentTypeLabel ?? null;
  const equipmentUnitLabel = r.equipmentUnit?.name ?? null;
  const subcontractorLabel = r.subcontractor?.name ?? null;

  const derived = deriveReservationState({
    status,
    source,
    equipmentUnit: !!equipmentUnitLabel,
    subcontractor: !!subcontractorLabel,
    hasConflict,
    readyForDeparture,
  });

  return {
    id: r.id,
    applicationItemId: r.applicationItemId,
    applicationId: r.applicationItem?.applicationId ?? '',
    applicationNumber: r.applicationItem?.application?.number ?? null,
    clientId: r.applicationItem?.application?.clientId ?? null,
    clientName: r.applicationItem?.application?.client?.name ?? null,
    clientCompany: r.applicationItem?.application?.client?.company ?? null,
    clientPhone: r.applicationItem?.application?.client?.phone ?? null,
    responsibleManagerId: r.applicationItem?.application?.responsibleManager?.id ?? null,
    responsibleManagerName:
      r.applicationItem?.application?.responsibleManager?.fullName ?? null,
    positionLabel: r.applicationItem?.equipmentTypeLabel ?? equipmentTypeLabel ?? '—',
    equipmentTypeId: r.equipmentTypeId,
    equipmentTypeLabel,
    equipmentUnitId: r.equipmentUnitId,
    equipmentUnitLabel,
    subcontractorId: r.subcontractorId,
    subcontractorLabel,
    sourcingType: r.sourcingType,
    source,
    internalStage: r.internalStage,
    status,
    plannedStart: r.plannedStart.toISOString(),
    plannedEnd: r.plannedEnd.toISOString(),
    hasConflict,
    readyForDeparture,
    subcontractorConfirmation: r.subcontractorConfirmation,
    promisedModelOrUnit: r.promisedModelOrUnit,
    subcontractorNote: r.subcontractorNote,
    comment: r.comment,
    releasedAt: r.releasedAt ? r.releasedAt.toISOString() : null,
    releaseReason: r.releaseReason,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    derived,
  };
}

export function projectReservations(arr: WithIncludes[]): ReservationView[] {
  return arr.map(projectReservation);
}
