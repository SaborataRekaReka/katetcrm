/**
 * Мэппинг LeadApi (уже спроецированного бэкендом) → Lead (UI-тип).
 *
 * Session 2: вся бизнес-логика (missingFields, sourceLabel, managerName)
 * теперь приходит с бэка из `projectLead()`. Здесь остаётся только
 * презентационное — humanizeSince и плейсхолдеры "—" для nullable полей.
 */
import type { Lead } from '../types/kanban';
import type { LeadApi } from './leadsApi';

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

export function toKanbanLead(a: LeadApi): Lead {
  return {
    id: a.id,
    apiClientId: a.clientId ?? undefined,
    stage: a.stage,
    client: a.contactName,
    company: a.contactCompany ?? undefined,
    phone: a.contactPhone,
    source: a.sourceLabel,
    sourceChannel: a.source,
    equipmentType: a.equipmentTypeHint ?? '—',
    date: a.requestedDate ?? undefined,
    timeWindow: a.timeWindow ?? undefined,
    address: a.address ?? undefined,
    comment: a.comment ?? undefined,
    manager: a.managerName ?? '—',
    lastActivity: humanizeSince(a.lastActivityAt),
    isDuplicate: a.isDuplicate,
    isUrgent: a.isUrgent,
    isStale: a.isStale,
    hasNoContact: a.hasNoContact,
    incompleteData: a.incompleteData,
    unqualifiedReason: a.unqualifiedReason ?? undefined,
    missingFields: a.missingFields,
  };
}

