/**
 * Adapter ClientListItemApi → ClientsListItem (UI-тип для списка клиентов).
 *
 * Session 5: все агрегаты (totalOrders, activeApplications, activeReservations,
 * lastOrderDate, tags, type) приходят с бэка проекцией. Адаптер заполняет
 * только презентационные поля:
 *   - lastActivity: humanize(updatedAt)
 *   - lastOrderDate: форматирование YYYY-MM-DD (или undefined)
 *   - manager: '—' (пока Client не привязан к менеджеру в schema; будет в later session)
 *   - sourceLead: синтетический Lead для открытия ClientWorkspace модалки
 *     (ClientWorkspace в API-режиме догружает real detail по id).
 */
import type { Lead } from '../types/kanban';
import type { ClientsListItem } from '../data/mockClientsList';
import type { ClientListItemApi } from './clientsApi';

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

export function toClientsListItem(api: ClientListItemApi): ClientsListItem {
  const sourceLead: Lead = {
    id: api.id,
    stage: 'completed',
    client: api.name,
    company: api.company ?? undefined,
    phone: api.phone,
    source: 'CRM',
    equipmentType: '—',
    manager: '—',
    lastActivity: humanizeSince(api.lastActivity),
  };

  return {
    id: api.id,
    name: api.name,
    type: api.type,
    company: api.company ?? undefined,
    phone: api.phone,
    manager: '—',
    totalOrders: api.totalOrders,
    activeApplications: api.activeApplications,
    activeReservations: api.activeReservations,
    lastOrderDate: api.lastOrderDate ? api.lastOrderDate.slice(0, 10) : undefined,
    lastActivity: humanizeSince(api.lastActivity),
    createdAt: api.createdAt.slice(0, 10),
    tags: api.tags,
    sourceLead,
  };
}

export function toClientsListItems(arr: ClientListItemApi[]): ClientsListItem[] {
  return arr.map(toClientsListItem);
}
