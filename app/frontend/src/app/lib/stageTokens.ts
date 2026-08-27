import { IS_SALES_LITE } from './featureFlags';

/**
 * Canonical stage color + label map for the CRM pipeline.
 *
 * In full profile the legacy flow is lead -> application -> reservation ->
 * departure -> completed/unqualified. In sales-lite the same persisted enum is
 * displayed as Не обработан -> В работе -> Маркетинговый квал ->
 * Квалифицированный/Не квалифицированный.
 */

export type PipelineStage =
  | 'lead'
  | 'application'
  | 'marketing_qualified'
  | 'reservation'
  | 'departure'
  | 'completed'
  | 'unqualified';

const FULL_STAGE_ORDER: PipelineStage[] = [
  'lead',
  'application',
  'reservation',
  'departure',
  'completed',
  'unqualified',
];

const SALES_LITE_STAGE_ORDER: PipelineStage[] = [
  'lead',
  'application',
  'marketing_qualified',
  'completed',
  'unqualified',
];

export const STAGE_ORDER: PipelineStage[] = IS_SALES_LITE
  ? SALES_LITE_STAGE_ORDER
  : FULL_STAGE_ORDER;

const FULL_STAGE_LABEL: Record<PipelineStage, string> = {
  lead: 'Лид',
  application: 'Заявка',
  marketing_qualified: 'Маркетинговый квал',
  reservation: 'Бронь',
  departure: 'Выезд',
  completed: 'Завершено',
  unqualified: 'Некачественный',
};

const SALES_LITE_STAGE_LABEL: Record<PipelineStage, string> = {
  lead: 'Не обработан',
  application: 'В работе',
  marketing_qualified: 'Маркетинговый квал',
  reservation: 'Бронь',
  departure: 'Выезд',
  completed: 'Квалифицированный',
  unqualified: 'Не квалифицированный',
};

export const STAGE_LABEL: Record<PipelineStage, string> = IS_SALES_LITE
  ? SALES_LITE_STAGE_LABEL
  : FULL_STAGE_LABEL;

/** Short label suitable for narrow columns / charts. */
const FULL_STAGE_LABEL_SHORT: Record<PipelineStage, string> = {
  lead: 'Лиды',
  application: 'Заявки',
  marketing_qualified: 'Марк. квал',
  reservation: 'Брони',
  departure: 'Выезды',
  completed: 'Завершено',
  unqualified: 'Не квалиф.',
};

const SALES_LITE_STAGE_LABEL_SHORT: Record<PipelineStage, string> = {
  lead: 'Не обработан',
  application: 'В работе',
  marketing_qualified: 'Марк. квал',
  reservation: 'Брони',
  departure: 'Выезды',
  completed: 'Квалиф.',
  unqualified: 'Не квалиф.',
};

export const STAGE_LABEL_SHORT: Record<PipelineStage, string> = IS_SALES_LITE
  ? SALES_LITE_STAGE_LABEL_SHORT
  : FULL_STAGE_LABEL_SHORT;

/** Solid background class for bar charts / column dots. */
export const STAGE_BAR: Record<PipelineStage, string> = {
  lead: 'bg-[#7B68EE]',
  application: 'bg-[#4A90E2]',
  marketing_qualified: 'bg-[#14B8A6]',
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
  marketing_qualified: 'bg-teal-50 text-teal-700 border-teal-200',
  reservation: 'bg-amber-50 text-amber-800 border-amber-200',
  departure: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-slate-50 text-slate-600 border-slate-200',
  unqualified: 'bg-rose-50 text-rose-700 border-rose-200',
};

export function stageBadgeClass(stage: PipelineStage): string {
  return `inline-flex items-center gap-1 rounded border px-1.5 py-0 text-[10px] leading-4 ${STAGE_BADGE[stage]}`;
}
