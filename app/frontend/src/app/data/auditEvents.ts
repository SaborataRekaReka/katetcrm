/**
 * Human-readable labels for raw audit event kinds.
 * Raw `kind` keys stay intact in the data layer (useful for exports / dev
 * tools), but every user-facing surface must resolve them through this map.
 */

export type AuditEventKind =
  | 'lead_created'
  | 'lead_updated'
  | 'lead_converted'
  | 'application_created'
  | 'application_updated'
  | 'reservation_created'
  | 'reservation_confirmed'
  | 'reservation_released'
  | 'departure_started'
  | 'departure_completed'
  | 'completion_signed'
  | 'user_created'
  | 'user_updated'
  | 'permissions_changed';

export type AuditModule = 'sales' | 'ops' | 'admin';

export interface AuditEventMeta {
  label: string;
  module: AuditModule;
  /** Tone used in the "event type" pill. */
  tone: 'progress' | 'success' | 'warning' | 'danger' | 'muted';
}

export const AUDIT_EVENTS: Record<AuditEventKind, AuditEventMeta> = {
  lead_created: { label: 'Создан лид', module: 'sales', tone: 'progress' },
  lead_updated: { label: 'Изменён лид', module: 'sales', tone: 'muted' },
  lead_converted: { label: 'Лид переведён в заявку', module: 'sales', tone: 'progress' },
  application_created: { label: 'Создана заявка', module: 'sales', tone: 'progress' },
  application_updated: { label: 'Изменена заявка', module: 'sales', tone: 'muted' },
  reservation_created: { label: 'Создана бронь', module: 'ops', tone: 'progress' },
  reservation_confirmed: { label: 'Бронь подтверждена', module: 'ops', tone: 'success' },
  reservation_released: { label: 'Бронь снята', module: 'ops', tone: 'warning' },
  departure_started: { label: 'Начат выезд', module: 'ops', tone: 'progress' },
  departure_completed: { label: 'Выезд завершён', module: 'ops', tone: 'success' },
  completion_signed: { label: 'Подписан акт', module: 'ops', tone: 'success' },
  user_created: { label: 'Создан пользователь', module: 'admin', tone: 'muted' },
  user_updated: { label: 'Изменён пользователь', module: 'admin', tone: 'muted' },
  permissions_changed: { label: 'Изменены права', module: 'admin', tone: 'warning' },
};

export const AUDIT_TONE_CLASS: Record<AuditEventMeta['tone'], string> = {
  progress: 'bg-sky-50 text-sky-700 border-sky-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  muted: 'bg-slate-50 text-slate-600 border-slate-200',
};

export const AUDIT_MODULE_LABEL: Record<AuditModule, string> = {
  sales: 'Продажи',
  ops: 'Операции',
  admin: 'Админ',
};

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  kind: AuditEventKind;
  /** Target entity reference, e.g. LEAD-00014. */
  target: string;
  /** Optional short commentary / details. */
  detail?: string;
}

export const mockAuditLog: AuditEntry[] = [
  { id: 'E-001', at: '2026-04-22 13:42', actor: 'Петров А.', kind: 'lead_created', target: 'LEAD-00014' },
  { id: 'E-002', at: '2026-04-22 13:30', actor: 'Сидоров Б.', kind: 'application_updated', target: 'APP-2024-002', detail: 'Изменена позиция #1' },
  { id: 'E-003', at: '2026-04-22 12:05', actor: 'Иванова С.', kind: 'reservation_confirmed', target: 'RSV-00012' },
  { id: 'E-004', at: '2026-04-22 11:48', actor: 'Петров А.', kind: 'departure_started', target: 'DEP-00009' },
  { id: 'E-005', at: '2026-04-22 10:16', actor: 'Сидоров Б.', kind: 'completion_signed', target: 'CMP-00011' },
  { id: 'E-006', at: '2026-04-22 09:02', actor: 'Admin', kind: 'permissions_changed', target: 'user:petrov' },
  { id: 'E-007', at: '2026-04-21 17:30', actor: 'Иванова С.', kind: 'reservation_released', target: 'RSV-00010', detail: 'Клиент перенёс сроки' },
  { id: 'E-008', at: '2026-04-21 16:10', actor: 'Петров А.', kind: 'application_created', target: 'APP-2024-003' },
];
