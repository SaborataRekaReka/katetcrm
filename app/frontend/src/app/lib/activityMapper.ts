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

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as JsonRecord;
}

function pickString(scopes: Array<JsonRecord | undefined>, keys: string[]): string | undefined {
  for (const scope of scopes) {
    if (!scope) continue;
    for (const key of keys) {
      const value = scope[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
  }
  return undefined;
}

function pickNumber(scopes: Array<JsonRecord | undefined>, keys: string[]): number | undefined {
  for (const scope of scopes) {
    if (!scope) continue;
    for (const key of keys) {
      const value = scope[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string' && value.trim()) {
        const normalized = value.trim().replace(',', '.');
        const parsed = Number(normalized);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }
  }
  return undefined;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function formatCallDirection(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const value = raw.toLowerCase();
  if (['in', 'incoming', 'inbound', 'entry', 'входящий', 'вход'].includes(value)) {
    return 'входящий';
  }
  if (['out', 'outgoing', 'outbound', 'исходящий', 'исход'].includes(value)) {
    return 'исходящий';
  }
  return undefined;
}

function formatCallDuration(secondsRaw: number | undefined): string | undefined {
  if (!secondsRaw || !Number.isFinite(secondsRaw) || secondsRaw <= 0) {
    return undefined;
  }
  const seconds = secondsRaw > 86_400 ? Math.round(secondsRaw / 1000) : Math.round(secondsRaw);
  if (seconds <= 0) return undefined;

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function extractTelephonyMetadata(payload: unknown): {
  details?: string[];
  links?: Array<{ label: string; href: string }>;
} {
  const root = asRecord(payload);
  const telephony = asRecord(root?.telephony) ?? asRecord(root?.call);
  if (!telephony) return {};

  const scopes = [telephony, root];
  const direction = formatCallDirection(
    pickString(scopes, ['direction', 'callDirection', 'call_direction']),
  );
  const from = pickString(scopes, [
    'from',
    'fromNumber',
    'caller',
    'callerPhone',
    'callerNumber',
  ]);
  const to = pickString(scopes, [
    'to',
    'toNumber',
    'callee',
    'calleePhone',
    'calleeNumber',
  ]);
  const duration = formatCallDuration(
    pickNumber(scopes, [
      'durationSec',
      'duration',
      'durationSeconds',
      'talkDuration',
      'talkTime',
      'billsec',
    ]),
  );
  const status = pickString(scopes, [
    'status',
    'result',
    'disposition',
    'hangupReason',
    'hangup_reason',
  ]);
  const recordingUrl = pickString(scopes, [
    'recordingUrl',
    'recording_url',
    'recordUrl',
    'record_url',
    'recording',
    'record',
    'recordingLink',
    'recordLink',
    'talkRecordUrl',
  ]);

  const details: string[] = [];
  if (direction) {
    details.push(`Направление: ${direction}`);
  }
  if (from || to) {
    details.push(`Линия: ${from ?? '—'} -> ${to ?? '—'}`);
  }
  if (duration) {
    details.push(`Длительность: ${duration}`);
  }
  if (status) {
    details.push(`Статус: ${status}`);
  }

  const links =
    recordingUrl && isHttpUrl(recordingUrl)
      ? [{ label: 'Запись разговора', href: recordingUrl }]
      : undefined;

  if (details.length === 0 && !links) {
    return {};
  }

  return {
    details: details.length > 0 ? details : undefined,
    links,
  };
}

export interface MappedActivityEntry {
  id: string;
  actor: string;
  text: string;
  time: string;
  details?: string[];
  links?: Array<{ label: string; href: string }>;
}

export function mapActivityEntries(entries: ActivityLogEntryApi[]): MappedActivityEntry[] {
  return entries.map((e) => {
    const summary = e.summary?.trim() || 'Событие';
    const text = ACTION_LABELS[e.action]
      ? `${ACTION_LABELS[e.action]} · ${summary}`
      : summary;

    return {
      id: e.id,
      actor: e.actor?.fullName ?? 'Система',
      text,
      time: formatRelativeTime(e.createdAt),
      ...extractTelephonyMetadata(e.payload),
    };
  });
}
