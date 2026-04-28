import type { ActivityLogEntryApi } from '../lib/activityApi';

const ACTION_LABELS: Record<string, string> = {
  created: 'создано',
  updated: 'обновлено',
  stage_changed: 'изменена стадия',
  cancelled: 'отменено',
  completed: 'завершено',
  unqualified: 'помечено как некачественное',
  imported: 'импортировано',
  note_added: 'добавлена заметка',
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
    actor: e.actor?.fullName ?? 'Система',
    text: ACTION_LABELS[e.action] ? `${ACTION_LABELS[e.action]} · ${e.summary}` : e.summary,
    time: formatRelativeTime(e.createdAt),
  }));
}
