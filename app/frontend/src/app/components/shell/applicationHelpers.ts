import { Application } from '../../types/application';
import { ApplicationsFiltersState } from './filterTypes';

/** "Group" / health computation for an application used by list + table views. */
export type ApplicationGroupId =
  | 'no_reservation'
  | 'in_reservation_work'
  | 'ready_for_departure'
  | 'on_departure'
  | 'completed'
  | 'cancelled';

export function computeGroup(app: Application): ApplicationGroupId {
  if (app.stage === 'completed') return 'completed';
  if (app.stage === 'cancelled') return 'cancelled';
  if (app.stage === 'departure') return 'on_departure';
  const total = app.positions.length;
  const reserved = app.positions.filter(
    (p) => p.status === 'reserved' || p.status === 'unit_selected' || p.readyForReservation,
  ).length;
  const hasConflict = app.positions.some((p) => p.status === 'conflict' || p.reservationState === 'conflict');
  const allReady = total > 0 && reserved === total && !hasConflict;
  if (allReady) return 'ready_for_departure';
  if (reserved === 0) return 'no_reservation';
  return 'in_reservation_work';
}

export function countReservedPositions(app: Application): number {
  return app.positions.filter(
    (p) => p.status === 'reserved' || p.status === 'unit_selected' || p.readyForReservation,
  ).length;
}

export function hasAnyConflict(app: Application): boolean {
  return app.positions.some((p) => p.status === 'conflict' || p.reservationState === 'conflict');
}

export function readyForDeparture(app: Application): boolean {
  return computeGroup(app) === 'ready_for_departure' || app.stage === 'departure';
}

export function equipmentSummary(app: Application): string {
  const seen = new Set<string>();
  for (const p of app.positions) {
    const head = p.equipmentType.split(' ')[0];
    seen.add(head);
  }
  return Array.from(seen).join(', ');
}

export function dominantSourcing(app: Application): 'own' | 'subcontractor' | 'mixed' | 'undecided' {
  const set = new Set(app.positions.map((p) => p.sourcingType));
  if (set.size === 0) return 'undecided';
  if (set.size === 1) {
    const only = app.positions[0].sourcingType;
    return only;
  }
  if (set.has('undecided')) return 'undecided';
  return 'mixed';
}

export function subcontractorSummary(app: Application): string {
  const subs = Array.from(
    new Set(app.positions.map((p) => p.subcontractor).filter((v): v is string => !!v)),
  );
  return subs.length === 0 ? '—' : subs.join(', ');
}

export function applyApplicationsFilters(
  apps: Application[],
  filters: ApplicationsFiltersState,
  query: string,
): Application[] {
  const q = query.trim().toLowerCase();
  return apps.filter((a) => {
    if (filters.manager !== 'all' && a.responsibleManager !== filters.manager) return false;
    if (filters.status !== 'all' && a.stage !== filters.status) return false;
    if (filters.equipment !== 'all') {
      const has = a.positions.some((p) =>
        p.equipmentType.toLowerCase().includes(filters.equipment.toLowerCase()),
      );
      if (!has) return false;
    }
    if (filters.sourcing !== 'all') {
      const dom = dominantSourcing(a);
      if (filters.sourcing === 'own' && dom !== 'own') return false;
      if (filters.sourcing === 'subcontractor' && dom !== 'subcontractor') return false;
      if (filters.sourcing === 'undecided' && dom !== 'undecided') return false;
    }
    if (filters.readinessReservation !== 'all') {
      const g = computeGroup(a);
      if (filters.readinessReservation === 'ready' && g !== 'ready_for_departure') return false;
      if (
        filters.readinessReservation === 'waiting' &&
        !(g === 'in_reservation_work' || g === 'no_reservation')
      )
        return false;
      if (filters.readinessReservation === 'no_data' && g !== 'no_reservation') return false;
    }
    if (filters.readyForDeparture && !readyForDeparture(a)) return false;
    if (filters.conflict && !hasAnyConflict(a)) return false;
    if (q) {
      const hay = [
        a.number,
        a.clientName,
        a.clientCompany,
        a.clientPhone,
        a.address,
        a.responsibleManager,
        ...a.positions.map((p) => p.equipmentType),
        ...a.positions.map((p) => p.subcontractor ?? ''),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
