/**
 * Lead projection — "бэк как продолжение фронта".
 *
 * Единый источник derived-полей, которые фронт раньше вычислял в adapter.
 * Здесь собираем:
 *   - sourceLabel (русский ярлык канала);
 *   - managerName (fallback на null, UI рендерит плейсхолдер);
 *   - missingFields (какие обязательные поля лида ещё не заполнены).
 *
 * Хранимые boolean-флаги (isDuplicate/isUrgent/isStale/hasNoContact/
 * incompleteData) не пересчитываем — они уже колонки и обновляются сервисами.
 */
import type { Lead, SourceChannel, Client, User } from '@prisma/client';

const SOURCE_LABELS: Record<SourceChannel, string> = {
  site: 'Сайт',
  mango: 'Mango',
  telegram: 'Telegram',
  max: 'MAX',
  manual: 'Ручной ввод',
  other: 'Другое',
};

export type LeadMissingField = 'address' | 'date' | 'contact' | 'equipment';

export interface LeadWithRelations extends Lead {
  client?: Client | null;
  manager?: Pick<User, 'id' | 'fullName' | 'email'> | { id: string; fullName: string } | null;
}

export interface LeadView {
  id: string;
  stage: Lead['stage'];

  // Контакт / клиент
  contactName: string;
  contactCompany: string | null;
  contactPhone: string;
  phoneNormalized: string;
  clientId: string | null;
  client: { id: string; name: string; company: string | null } | null;

  // Источник
  source: SourceChannel;
  sourceLabel: string;

  // Детали запроса
  equipmentTypeHint: string | null;
  requestedDate: string | null;
  timeWindow: string | null;
  address: string | null;
  comment: string | null;

  // Ответственный
  managerId: string | null;
  managerName: string | null;
  manager: { id: string; fullName: string } | null;

  // Флаги (хранимые + производные)
  isDuplicate: boolean;
  isUrgent: boolean;
  isStale: boolean;
  hasNoContact: boolean;
  incompleteData: boolean;
  missingFields: LeadMissingField[];

  // Исход
  unqualifiedReason: string | null;

  // Timestamps
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

export function projectLead(lead: LeadWithRelations): LeadView {
  const missingFields: LeadMissingField[] = [];
  if (!lead.address) missingFields.push('address');
  if (!lead.requestedDate) missingFields.push('date');
  if (!lead.contactPhone || lead.hasNoContact) missingFields.push('contact');
  if (!lead.equipmentTypeHint) missingFields.push('equipment');

  const managerName = lead.manager?.fullName ?? null;

  return {
    id: lead.id,
    stage: lead.stage,

    contactName: lead.contactName,
    contactCompany: lead.contactCompany,
    contactPhone: lead.contactPhone,
    phoneNormalized: lead.phoneNormalized,
    clientId: lead.clientId,
    client: lead.client
      ? { id: lead.client.id, name: lead.client.name, company: lead.client.company }
      : null,

    source: lead.source,
    sourceLabel: lead.sourceLabel ?? SOURCE_LABELS[lead.source] ?? SOURCE_LABELS.other,

    equipmentTypeHint: lead.equipmentTypeHint,
    requestedDate: lead.requestedDate ? lead.requestedDate.toISOString() : null,
    timeWindow: lead.timeWindow,
    address: lead.address,
    comment: lead.comment,

    managerId: lead.managerId,
    managerName,
    manager: lead.manager
      ? { id: lead.manager.id, fullName: lead.manager.fullName }
      : null,

    isDuplicate: lead.isDuplicate,
    isUrgent: lead.isUrgent,
    isStale: lead.isStale,
    hasNoContact: lead.hasNoContact,
    incompleteData: lead.incompleteData,
    missingFields,

    unqualifiedReason: lead.unqualifiedReason,

    lastActivityAt: lead.lastActivityAt.toISOString(),
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

export function projectLeads(leads: LeadWithRelations[]): LeadView[] {
  return leads.map(projectLead);
}
