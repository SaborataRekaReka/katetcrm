/**
 * Projection Client → ClientListView (UI-ready).
 *
 * Session 5: бэк считает агрегаты, которые UI раньше читал из моков:
 *   - totalOrders: число completed applications
 *   - activeApplications: число активных applications (isActive=true)
 *   - activeReservations: число активных reservations по applicationItem этого клиента
 *   - lastOrderDate: max completedAt или updatedAt заявок
 *   - tags: derived — new / repeat / vip
 *   - type: 'company' если company заполнена, иначе 'person'
 *
 * Derivation tags (MVP):
 *   - vip: totalOrders >= 10
 *   - repeat: totalOrders >= 2
 *   - new: totalOrders <= 1
 *   - debt: не реализовано (нет суммы/оплат в MVP)
 */
import type { Prisma } from '@prisma/client';

export type ClientTypeUi = 'company' | 'person';
export type ClientListTag = 'vip' | 'repeat' | 'new' | 'debt';

export interface ClientListView {
  id: string;
  name: string;
  type: ClientTypeUi;
  company: string | null;
  phone: string;
  email: string | null;
  totalOrders: number;
  activeApplications: number;
  activeReservations: number;
  lastOrderDate: string | null;
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
  tags: ClientListTag[];
}

type WithAggregates = Prisma.ClientGetPayload<{
  include: {
    _count: {
      select: {
        applications: true;
        leads: true;
      };
    };
    applications: {
      select: {
        id: true;
        isActive: true;
        completedAt: true;
        updatedAt: true;
        items: {
          select: {
            reservations: {
              where: { isActive: true };
              select: { id: true };
            };
          };
        };
      };
    };
  };
}>;

export function deriveClientListTags(totalOrders: number): ClientListTag[] {
  const tags: ClientListTag[] = [];
  if (totalOrders >= 10) tags.push('vip');
  if (totalOrders >= 2) tags.push('repeat');
  if (totalOrders <= 1) tags.push('new');
  return tags;
}

export function projectClientListItem(c: WithAggregates): ClientListView {
  const completed = c.applications.filter((a) => a.completedAt);
  const active = c.applications.filter((a) => a.isActive);
  const activeReservations = c.applications.reduce((sum, a) => {
    return sum + a.items.reduce((inner, it) => inner + it.reservations.length, 0);
  }, 0);

  const lastCompleted = completed
    .map((a) => a.completedAt)
    .filter((d): d is Date => !!d)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const type: ClientTypeUi = c.company ? 'company' : 'person';

  return {
    id: c.id,
    name: c.company || c.name,
    type,
    company: c.company,
    phone: c.phone,
    email: c.email,
    totalOrders: completed.length,
    activeApplications: active.length,
    activeReservations,
    lastOrderDate: lastCompleted ? lastCompleted.toISOString() : null,
    lastActivity: c.updatedAt.toISOString(),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    tags: deriveClientListTags(completed.length),
  };
}

export function projectClientListItems(arr: WithAggregates[]): ClientListView[] {
  return arr.map(projectClientListItem);
}

// ---------------------------------------------------------------------------
// Detail projection (Session 12)
// ---------------------------------------------------------------------------

export interface ClientDetailView extends ClientListView {
  notes: string | null;
  favoriteEquipment: string[];
}

/**
 * Detail projection для GET /clients/:id. Переиспользует те же агрегаты,
 * что и list, плюс добавляет editable поля (notes, favoriteEquipment).
 */
export function projectClientDetail(c: WithAggregates & {
  notes: string | null;
  favoriteEquipment: string[];
}): ClientDetailView {
  const base = projectClientListItem(c);
  return {
    ...base,
    notes: c.notes ?? null,
    favoriteEquipment: c.favoriteEquipment ?? [],
  };
}
