/**
 * Shared filter state shapes for Leads and Applications list/table views.
 * Kept tiny and serialisable so pages can own them via useState and pass down.
 */

export type LeadsFiltersState = {
  scope: 'all' | 'my';
  manager: string;
  source: string;
  equipment: string;
  stage: string; // 'all' | StageType — funnel filter used by table view
  urgent: boolean;
  duplicates: boolean;
  stale: boolean;
};

export const DEFAULT_LEADS_FILTERS: LeadsFiltersState = {
  scope: 'all',
  manager: 'all',
  source: 'all',
  equipment: 'all',
  stage: 'all',
  urgent: false,
  duplicates: false,
  stale: false,
};

export type ApplicationsFiltersState = {
  scope: 'all' | 'my';
  manager: string;
  status: string;
  sourcing: 'all' | 'own' | 'subcontractor' | 'undecided';
  equipment: string;
  readinessReservation: 'all' | 'ready' | 'waiting' | 'no_data';
  readyForDeparture: boolean;
  conflict: boolean;
};

export const DEFAULT_APPLICATIONS_FILTERS: ApplicationsFiltersState = {
  scope: 'all',
  manager: 'all',
  status: 'all',
  sourcing: 'all',
  equipment: 'all',
  readinessReservation: 'all',
  readyForDeparture: false,
  conflict: false,
};

export type ReservationsFiltersState = {
  scope: 'all' | 'my';
  manager: string;
  status: 'all' | 'active' | 'released';
  internalStage: string; // 'all' | ReservationInternalStage
  source: 'all' | 'own' | 'subcontractor' | 'undecided';
  equipment: string;
  subcontractor: string;
  unitSelection: 'all' | 'selected' | 'not_selected';
  conflict: boolean;
  readyForDeparture: boolean;
};

export const DEFAULT_RESERVATIONS_FILTERS: ReservationsFiltersState = {
  scope: 'all',
  manager: 'all',
  status: 'all',
  internalStage: 'all',
  source: 'all',
  equipment: 'all',
  subcontractor: 'all',
  unitSelection: 'all',
  conflict: false,
  readyForDeparture: false,
};
