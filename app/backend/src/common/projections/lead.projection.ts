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
import type {
  Application,
  ApplicationItem,
  Client,
  Completion,
  Departure,
  DepartureStatus,
  Lead,
  Reservation,
  SourceChannel,
  User,
} from '@prisma/client';
import { buildStageLinkedIds, type StageLinkedIds } from './linked-ids';

const SOURCE_LABELS: Record<SourceChannel, string> = {
  site: 'Сайт',
  mango: 'Mango',
  telegram: 'Telegram',
  max: 'MAX',
  manual: 'Ручной ввод',
  other: 'Другое',
};

export type LeadMissingField = 'address' | 'date' | 'contact' | 'equipment';

const ACTIVE_DEPARTURE_STATUSES = new Set<DepartureStatus>([
  'scheduled',
  'in_transit',
  'arrived',
]);

type CompletionLink = Pick<Completion, 'id'>;
type DepartureLink = Pick<Departure, 'id' | 'status' | 'scheduledAt'> & {
  completion?: CompletionLink | null;
};
type ReservationLink = Pick<Reservation, 'id' | 'isActive' | 'createdAt' | 'applicationItemId'> & {
  departures?: DepartureLink[];
};
type ApplicationItemLink = Pick<ApplicationItem, 'id' | 'createdAt'> & {
  reservations?: ReservationLink[];
};
type ApplicationLink = Pick<Application, 'id' | 'clientId' | 'isActive' | 'createdAt'> & {
  items?: ApplicationItemLink[];
};

export interface LeadWithRelations extends Lead {
  client?: Client | null;
  manager?: Pick<User, 'id' | 'fullName' | 'email'> | { id: string; fullName: string } | null;
  applications?: ApplicationLink[];
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

  linkedIds: StageLinkedIds;
}

function pickLinkedApplication(applications: ApplicationLink[]): ApplicationLink | null {
  if (applications.length === 0) return null;
  const sorted = [...applications].sort((a, b) => {
    if (a.isActive !== b.isActive) {
      return Number(b.isActive) - Number(a.isActive);
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  return sorted[0] ?? null;
}

function pickLinkedReservation(application: ApplicationLink | null): ReservationLink | null {
  if (!application) return null;
  const reservations = (application.items ?? []).flatMap((item) => item.reservations ?? []);
  if (reservations.length === 0) return null;
  const sorted = [...reservations].sort((a, b) => {
    if (a.isActive !== b.isActive) {
      return Number(b.isActive) - Number(a.isActive);
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  return sorted[0] ?? null;
}

function pickLinkedDeparture(reservation: ReservationLink | null): DepartureLink | null {
  if (!reservation) return null;
  const departures = reservation.departures ?? [];
  if (departures.length === 0) return null;
  const sorted = [...departures].sort((a, b) => {
    const aActive = ACTIVE_DEPARTURE_STATUSES.has(a.status) ? 1 : 0;
    const bActive = ACTIVE_DEPARTURE_STATUSES.has(b.status) ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    return b.scheduledAt.getTime() - a.scheduledAt.getTime();
  });
  return sorted[0] ?? null;
}

export function projectLead(lead: LeadWithRelations): LeadView {
  const missingFields: LeadMissingField[] = [];
  if (!lead.address) missingFields.push('address');
  if (!lead.requestedDate) missingFields.push('date');
  if (!lead.contactPhone || lead.hasNoContact) missingFields.push('contact');
  if (!lead.equipmentTypeHint) missingFields.push('equipment');

  const managerName = lead.manager?.fullName ?? null;
  const linkedApplication = pickLinkedApplication(lead.applications ?? []);
  const linkedReservation = pickLinkedReservation(linkedApplication);
  const linkedDeparture = pickLinkedDeparture(linkedReservation);
  const linkedIds = buildStageLinkedIds({
    leadId: lead.id,
    applicationId: linkedApplication?.id ?? null,
    reservationId: linkedReservation?.id ?? null,
    departureId: linkedDeparture?.id ?? null,
    completionId: linkedDeparture?.completion?.id ?? null,
    clientId: lead.clientId ?? linkedApplication?.clientId ?? null,
    applicationItemId: linkedReservation?.applicationItemId ?? null,
  });

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

    linkedIds,
  };
}

export function projectLeads(leads: LeadWithRelations[]): LeadView[] {
  return leads.map(projectLead);
}
