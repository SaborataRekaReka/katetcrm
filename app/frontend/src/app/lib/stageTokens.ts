/**
 * Canonical stage color + label map for the CRM pipeline.
 *
 * Invariant (see AGENTS.md): lead → application → reservation → departure →
 * completed · unqualified. One object on a given stage must render with the
 * SAME color everywhere: kanban columns, list badges, dashboards, audit.
 *
 * Source of truth for palette is the Kanban board (historical). Values are
 * kept as explicit hex in `bg-[#...]` so Tailwind JIT picks them up.
 */

export type PipelineStage =
  | 'lead'
  | 'application'
  | 'reservation'
  | 'departure'
  | 'completed'
  | 'unqualified';

export const STAGE_ORDER: PipelineStage[] = [
  'lead',
  'application',
  'reservation',
  'departure',
  'completed',
  'unqualified',
];

export const STAGE_LABEL: Record<PipelineStage, string> = {
  lead: 'Лид',
  application: 'Заявка',
  reservation: 'Бронь',
  departure: 'Выезд',
  completed: 'Завершено',
  unqualified: 'Некачественный',
};

/** Short label suitable for narrow columns / charts. */
export const STAGE_LABEL_SHORT: Record<PipelineStage, string> = {
  lead: 'Лиды',
  application: 'Заявки',
  reservation: 'Брони',
  departure: 'Выезды',
  completed: 'Завершено',
  unqualified: 'Не квалиф.',
};

/** Solid background class for bar charts / column dots. */
export const STAGE_BAR: Record<PipelineStage, string> = {
  lead: 'bg-[#7B68EE]',
  application: 'bg-[#4A90E2]',
  reservation: 'bg-[#F5A623]',
  departure: 'bg-[#50C878]',
  completed: 'bg-[#9B9B9B]',
  unqualified: 'bg-[#E74C3C]',
};

/** Dot class for compact status indicators next to labels. */
export const STAGE_DOT: Record<PipelineStage, string> = STAGE_BAR;

/** Soft badge class (pill next to text). Matches badgeTokens tone system. */
export const STAGE_BADGE: Record<PipelineStage, string> = {
  lead: 'bg-violet-50 text-violet-700 border-violet-200',
  application: 'bg-sky-50 text-sky-700 border-sky-200',
  reservation: 'bg-amber-50 text-amber-800 border-amber-200',
  departure: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-slate-50 text-slate-600 border-slate-200',
  unqualified: 'bg-rose-50 text-rose-700 border-rose-200',
};

export function stageBadgeClass(stage: PipelineStage): string {
  return `inline-flex items-center gap-1 rounded border px-1.5 py-0 text-[10px] leading-4 ${STAGE_BADGE[stage]}`;
}
