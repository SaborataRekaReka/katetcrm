import type { ActivityLogEntryApi } from '../lib/activityApi';

const ACTION_LABELS: Record<string, string> = {
  LEAD_CREATED: 'создал(а) лид',
  LEAD_UPDATED: 'изменил(а) лид',
  LEAD_STAGE_CHANGED: 'сменил(а) стадию',
  LEAD_QUALIFIED: 'перевёл(ла) в заявку',
  LEAD_UNQUALIFIED: 'пометил(а) некачественным',
  APPLICATION_CREATED: 'создал(а) заявку',
  APPLICATION_UPDATED: 'изменил(а) заявку',
  APPLICATION_CANCELLED: 'отменил(а) заявку',
  APPLICATION_ITEM_ADDED: 'добавил(а) позицию',
  APPLICATION_ITEM_UPDATED: 'изменил(а) позицию',
  APPLICATION_ITEM_REMOVED: 'удалил(а) позицию',
  RESERVATION_CREATED: 'создал(а) бронь',
  RESERVATION_UPDATED: 'изменил(а) бронь',
  RESERVATION_RELEASED: 'снял(а) бронь',
  RESERVATION_CONFIRMED: 'подтвердил(а) бронь',
  CLIENT_CREATED: 'создал(а) клиента',
  CLIENT_UPDATED: 'изменил(а) клиента',
};

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'только что';
  if (diffMin < 60) return `${diffMin} мин назад`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH} ч назад`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return `${diffD} д назад`;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export interface MappedActivityEntry {
  id: string;
  actor: string;
  text: string;
  time: string;
}

export function mapActivityEntries(entries: ActivityLogEntryApi[]): MappedActivityEntry[] {
  return entries.map((e) => ({
    id: e.id,
    actor: ACTION_LABELS[e.action] ?? e.action,
    text: e.summary,
    time: formatRelativeTime(e.createdAt),
  }));
}
