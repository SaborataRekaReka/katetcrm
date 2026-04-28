import type { Lead } from '../types/kanban';
import type { DepartureApi } from './departuresApi';
import type { CompletionApi } from './completionsApi';

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

function mapDepartureStatus(api: DepartureApi): Lead['departureStatus'] {
  if (api.derived.alert !== 'none') return 'overdue';

  if (api.status === 'in_transit' || api.status === 'arrived') {
    return 'today';
  }

  if (api.status === 'scheduled') {
    const now = Date.now();
    const scheduled = new Date(api.scheduledAt).getTime();
    if (!Number.isNaN(scheduled)) {
      if (scheduled < now) return 'overdue';
      if (scheduled - now <= 24 * MS_HOUR) return 'soon';
    }
    return 'awaiting';
  }

  return 'awaiting';
}

function pickPlannedDate(api: DepartureApi): string | undefined {
  if (api.linked.plannedDate) return api.linked.plannedDate.slice(0, 10);
  if (api.linked.plannedStart) return api.linked.plannedStart.slice(0, 10);
  if (api.scheduledAt) return api.scheduledAt.slice(0, 10);
  return undefined;
}

function pickTimeWindow(api: DepartureApi): string | undefined {
  if (api.linked.plannedTimeFrom || api.linked.plannedTimeTo) {
    if (api.linked.plannedTimeFrom && api.linked.plannedTimeTo) {
      return `${api.linked.plannedTimeFrom}-${api.linked.plannedTimeTo}`;
    }
    return api.linked.plannedTimeFrom ?? api.linked.plannedTimeTo ?? undefined;
  }
  if (api.linked.plannedStart && api.linked.plannedEnd) {
    return `${api.linked.plannedStart.slice(11, 16)}-${api.linked.plannedEnd.slice(11, 16)}`;
  }
  return undefined;
}

export function toDepartureLead(api: DepartureApi): Lead {
  return {
    id: api.id,
    apiClientId: api.linked.clientId ?? undefined,
    stage: 'departure',
    client: api.linked.clientName ?? '—',
    company: api.linked.clientCompany ?? undefined,
    phone: api.linked.clientPhone ?? '',
    source: 'Выезд',
    equipmentType: api.linked.equipmentTypeLabel ?? api.linked.positionLabel,
    equipmentUnit: api.linked.equipmentUnitLabel ?? undefined,
    subcontractor: api.linked.subcontractorLabel ?? undefined,
    manager: api.linked.responsibleManagerName ?? '—',
    date: pickPlannedDate(api),
    timeWindow: pickTimeWindow(api),
    address: api.linked.address ?? undefined,
    comment: api.notes ?? undefined,
    lastActivity: humanizeSince(api.updatedAt),
    departureStatus: mapDepartureStatus(api),
  };
}

export function toCompletionLeadFromDeparture(api: DepartureApi): Lead {
  const base = toDepartureLead(api);
  const outcome = api.completion?.outcome;

  return {
    ...base,
    stage:
      outcome === 'completed'
        ? 'completed'
        : outcome === 'unqualified'
          ? 'unqualified'
          : 'departure',
    completionDate: api.completion?.completedAt?.slice(0, 10),
    completionReason:
      outcome === 'unqualified'
        ? api.cancellationReason ?? 'Некачественный заказ'
        : undefined,
  };
}

export function toCompletionLeadFromCompletion(api: CompletionApi): Lead {
  const timeWindow =
    api.context.plannedTimeFrom && api.context.plannedTimeTo
      ? `${api.context.plannedTimeFrom}-${api.context.plannedTimeTo}`
      : api.context.plannedStart && api.context.plannedEnd
        ? `${api.context.plannedStart.slice(11, 16)}-${api.context.plannedEnd.slice(11, 16)}`
        : undefined;

  return {
    id: api.departureId,
    apiClientId: api.linked.clientId ?? undefined,
    stage: api.outcome === 'completed' ? 'completed' : 'unqualified',
    client: api.linked.clientName ?? '—',
    company: api.linked.clientCompany ?? undefined,
    phone: api.linked.clientPhone ?? '',
    source: 'Завершение',
    equipmentType: api.linked.equipmentTypeLabel ?? api.linked.positionLabel,
    equipmentUnit: api.linked.equipmentUnitLabel ?? undefined,
    subcontractor: api.linked.subcontractorLabel ?? undefined,
    manager: api.linked.responsibleManagerName ?? '—',
    date: api.context.plannedDate ? api.context.plannedDate.slice(0, 10) : api.context.plannedStart.slice(0, 10),
    timeWindow,
    address: api.context.address ?? undefined,
    comment: api.completionNote ?? undefined,
    lastActivity: humanizeSince(api.completedAt),
    completionDate: api.completedAt.slice(0, 10),
    completionReason: api.outcome === 'unqualified' ? api.unqualifiedReason ?? 'Некачественный заказ' : undefined,
  };
}
