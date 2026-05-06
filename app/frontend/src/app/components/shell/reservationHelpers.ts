import { Lead, Reservation, ReservationInternalStage } from '../../types/kanban';
import { buildMockReservation } from '../../data/mockReservation';
import { ReservationsFiltersState } from './filterTypes';

export const RESERVATION_STAGE_ORDER: ReservationInternalStage[] = [
  'needs_source_selection',
  'searching_own_equipment',
  'searching_subcontractor',
  'subcontractor_selected',
  'type_reserved',
  'unit_defined',
  'ready_for_departure',
  'released',
];

export const RESERVATION_STAGE_LABEL: Record<ReservationInternalStage, string> = {
  needs_source_selection: 'Нужен выбор источника',
  searching_own_equipment: 'Подбор своей техники',
  searching_subcontractor: 'Подбор подрядчика',
  subcontractor_selected: 'Подрядчик подтверждён',
  type_reserved: 'Тип забронирован',
  unit_defined: 'Unit уточнён',
  ready_for_departure: 'Готово к выезду',
  released: 'Снятые',
};

export const RESERVATION_STAGE_COLOR: Record<ReservationInternalStage, string> = {
  needs_source_selection: 'bg-[#E74C3C]',
  searching_own_equipment: 'bg-[#4A90E2]',
  searching_subcontractor: 'bg-[#7B68EE]',
  subcontractor_selected: 'bg-[#6A5ACD]',
  type_reserved: 'bg-[#F5A623]',
  unit_defined: 'bg-[#2DB5B0]',
  ready_for_departure: 'bg-[#50C878]',
  released: 'bg-[#9B9B9B]',
};

export interface ReservationRow {
  lead: Lead;
  reservation: Reservation;
}

/**
 * Inputs used for deriving reservation process state. Accepts either a full
 * Reservation object or lighter overrides from mutable UI state so the same
 * logic can be reused both inside the detail modal (where source may change
 * in-session) and in list/table rendering.
 */
export interface ReservationStateInput {
  status: Reservation['status'];
  source: Reservation['source'];
  equipmentUnit?: string;
  subcontractor?: string;
  hasConflict?: boolean;
  readyForDeparture?: boolean;
}

export interface DerivedReservationState {
  /** Single source of truth for internal process stage. */
  stage: ReservationInternalStage;
  /** Short operational next-step hint (used in rows and in detail header). */
  nextStep: string;
  /** Verb for the primary CTA button — mirrors the next step. */
  ctaLabel: string;
  /** Whether the CTA is disabled (terminal states). */
  ctaDisabled: boolean;
  /** Sub-reason shown next to the disabled CTA / hint line. */
  reason: string | null;
}

/**
 * Single source of truth for stage / next step / CTA across the reservation
 * family. Guarantees that `stage`, `nextStep` and `ctaLabel` describe the
 * same current process step so we never drift (addresses system-level rule
 * "stage ≠ CTA ≠ readiness").
 */
export function deriveReservationState(input: ReservationStateInput): DerivedReservationState {
  const { status, source, equipmentUnit, subcontractor, hasConflict, readyForDeparture } = input;
  const unitSelected = !!equipmentUnit;
  const subSelected = !!subcontractor;

  if (status === 'released') {
    return {
      stage: 'released',
      nextStep: 'Снято',
      ctaLabel: 'Бронь снята',
      ctaDisabled: true,
      reason: null,
    };
  }

  if (source === 'undecided') {
    return {
      stage: 'needs_source_selection',
      nextStep: 'Нужно выбрать источник',
      ctaLabel: 'Выбрать источник',
      ctaDisabled: false,
      reason: 'Источник не выбран',
    };
  }

  if (source === 'own' && !unitSelected) {
    return {
      stage: 'searching_own_equipment',
      nextStep: 'Нужно назначить unit',
      ctaLabel: 'Назначить unit',
      ctaDisabled: false,
      reason: 'Unit не выбран',
    };
  }

  if (source === 'subcontractor' && !subSelected) {
    return {
      stage: 'searching_subcontractor',
      nextStep: 'Нужно выбрать подрядчика',
      ctaLabel: 'Выбрать подрядчика',
      ctaDisabled: false,
      reason: 'Подрядчик не выбран',
    };
  }

  if (hasConflict) {
    return {
      stage: source === 'own' && unitSelected ? 'unit_defined' : 'type_reserved',
      nextStep: 'Нужно разрешить конфликт',
      ctaLabel: 'Разрешить конфликт',
      ctaDisabled: false,
      reason: 'Есть конфликт',
    };
  }

  if (readyForDeparture) {
    return {
      stage: 'ready_for_departure',
      nextStep: 'Готово к выезду',
      ctaLabel: 'Перевести в выезд',
      ctaDisabled: false,
      reason: null,
    };
  }

  if (source === 'own' && unitSelected) {
    return {
      stage: 'unit_defined',
      nextStep: 'Нужно подтвердить бронь',
      ctaLabel: 'Подтвердить бронь',
      ctaDisabled: false,
      reason: null,
    };
  }

  if (source === 'subcontractor' && subSelected) {
    return {
      stage: 'subcontractor_selected',
      nextStep: 'Нужно подтвердить бронь',
      ctaLabel: 'Подтвердить бронь',
      ctaDisabled: false,
      reason: null,
    };
  }

  return {
    stage: 'type_reserved',
    nextStep: 'Нужно подтвердить бронь',
    ctaLabel: 'Подтвердить бронь',
    ctaDisabled: false,
    reason: null,
  };
}

export function buildReservationRows(leads: Lead[]): ReservationRow[] {
  return leads.map((lead) => ({ lead, reservation: buildMockReservation(lead) }));
}

export function applyReservationsFilters(
  rows: ReservationRow[],
  filters: ReservationsFiltersState,
  query: string,
): ReservationRow[] {
  const q = query.trim().toLowerCase();
  return rows.filter(({ lead, reservation }) => {
    if (filters.scope === 'my' && lead.manager !== 'Иванова С.') return false;
    if (filters.manager !== 'all' && lead.manager !== filters.manager) return false;
    if (filters.status !== 'all' && reservation.status !== filters.status) return false;
    if (filters.internalStage !== 'all') {
      const derived = deriveReservationState(reservation).stage;
      if (derived !== filters.internalStage) return false;
    }
    if (filters.source !== 'all' && reservation.source !== filters.source) return false;
    if (
      filters.equipment !== 'all' &&
      !(reservation.equipmentType || '').toLowerCase().includes(filters.equipment.toLowerCase())
    )
      return false;
    if (filters.subcontractor !== 'all' && (reservation.subcontractor ?? '') !== filters.subcontractor)
      return false;
    if (filters.unitSelection === 'selected' && !reservation.equipmentUnit) return false;
    if (filters.unitSelection === 'not_selected' && reservation.equipmentUnit) return false;
    if (filters.conflict && !reservation.hasConflict) return false;
    if (filters.readyForDeparture && !reservation.readyForDeparture) return false;
    if (q) {
      const hay = [
        reservation.id,
        reservation.equipmentType,
        reservation.equipmentUnit,
        reservation.subcontractor,
        reservation.linked.clientName,
        reservation.linked.clientCompany,
        reservation.linked.applicationTitle,
        reservation.linked.address,
        lead.manager,
        lead.phone,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
