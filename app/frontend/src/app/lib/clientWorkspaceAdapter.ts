import type {
  Client,
  ClientLeadHistoryItem,
  ClientLeadStatus,
  ClientOrderHistoryItem,
  ClientOrderStatus,
  ClientTag,
} from '../types/client';
import type { ActivityLogEntryApi } from './activityApi';
import type { ApplicationApi } from './applicationsApi';
import type { ClientDetailApi } from './clientsApi';
import type { LeadApi } from './leadsApi';

const TERMINAL_LEAD_STAGES = new Set(['completed', 'unqualified', 'cancelled']);

const DERIVED_TAG_META: Record<
  'vip' | 'repeat' | 'new' | 'debt',
  { label: string; tone: ClientTag['tone'] }
> = {
  vip: { label: 'VIP', tone: 'warning' },
  repeat: { label: 'Повторный', tone: 'progress' },
  new: { label: 'Новый', tone: 'source' },
  debt: { label: 'Долг', tone: 'caution' },
};

function humanizeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (diff < min) return 'только что';
  if (diff < hour) return `${Math.floor(diff / min)} мин назад`;
  if (diff < day) return `${Math.floor(diff / hour)} ч назад`;
  const days = Math.floor(diff / day);
  return days === 1 ? '1 день назад' : `${days} дн назад`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return iso.slice(0, 10);
}

function parseDecimal(value: string | null | undefined): number {
  if (!value) return 0;
  const num = Number(String(value).replace(',', '.'));
  return Number.isFinite(num) ? num : 0;
}

function formatMoney(value: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(value))} ₽`;
}

function mapLeadStatus(stage: LeadApi['stage']): ClientLeadStatus {
  if (stage === 'completed') return 'converted';
  if (stage === 'cancelled') return 'lost';
  if (stage === 'unqualified') return 'unqualified';
  return 'in_progress';
}

function mapOrderStatus(stage: ApplicationApi['stage']): ClientOrderStatus {
  if (stage === 'completed') return 'completed';
  if (stage === 'cancelled' || stage === 'unqualified') return 'cancelled';
  return 'in_progress';
}

function calcOrderAmount(app: ApplicationApi): number {
  return app.positions.reduce((sum, p) => {
    const shift = parseDecimal(p.pricePerShift);
    const delivery = parseDecimal(p.deliveryPrice);
    const surcharge = parseDecimal(p.surcharge);
    return sum + shift * p.shiftCount * p.quantity + delivery + surcharge;
  }, 0);
}

function toOrderHistory(app: ApplicationApi): { item: ClientOrderHistoryItem; amountValue: number } {
  const amountValue = calcOrderAmount(app);
  const hasReservation = app.positions.some((p) =>
    p.status === 'reserved' || p.status === 'unit_selected' || p.status === 'conflict',
  );

  return {
    item: {
      id: app.id,
      number: app.number,
      date: formatDate(app.requestedDate ?? app.createdAt),
      status: mapOrderStatus(app.stage),
      positions: app.positions.map((p) => ({
        equipmentType: p.equipmentTypeLabel,
        quantity: p.quantity,
        unit: p.unit ?? undefined,
        subcontractor: p.subcontractor ?? undefined,
      })),
      equipmentSummary: app.equipmentSummary,
      address: app.address ?? undefined,
      amount: amountValue > 0 ? formatMoney(amountValue) : undefined,
      hasActiveReservation: hasReservation,
      hasActiveDeparture: app.stage === 'departure',
      comment: app.comment ?? undefined,
    },
    amountValue,
  };
}

function toLeadHistory(lead: LeadApi): ClientLeadHistoryItem {
  return {
    id: lead.id,
    date: formatDate(lead.createdAt),
    source: lead.sourceLabel || lead.source,
    status: mapLeadStatus(lead.stage),
    equipmentType: lead.equipmentTypeHint ?? '—',
    address: lead.address ?? undefined,
    manager: lead.managerName ?? '—',
  };
}

function toFavoriteCategories(raw: string[]): Client['favoriteCategories'] {
  const map = new Map<string, number>();
  for (const value of raw) {
    const key = value.trim();
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([category, count]) => ({ category, count }));
}

function mergeTags(detail: ClientDetailApi): ClientTag[] {
  const out: ClientTag[] = [];
  for (const t of detail.assignedTags) {
    out.push({ label: t.label, tone: t.tone });
  }
  for (const tag of detail.tags) {
    const mapped = DERIVED_TAG_META[tag];
    if (!mapped) continue;
    out.push({ label: mapped.label, tone: mapped.tone });
  }
  const uniq = new Map<string, ClientTag>();
  for (const t of out) {
    if (!uniq.has(t.label)) uniq.set(t.label, t);
  }
  return Array.from(uniq.values());
}

export function toClientWorkspaceModel(args: {
  detail: ClientDetailApi;
  applications: ApplicationApi[];
  leads: LeadApi[];
  activity: ActivityLogEntryApi[];
  fallback: Client;
}): Client {
  const { detail, fallback } = args;
  const applications = [...args.applications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const leads = [...args.leads].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const ordersWithAmount = applications.map(toOrderHistory);
  const ordersHistory = ordersWithAmount.map((x) => x.item);
  const completedOrders = ordersWithAmount.filter((x) => x.item.status === 'completed');
  const totalRevenueValue = completedOrders.reduce((sum, x) => sum + x.amountValue, 0);

  const lastCompleted = completedOrders[0]?.item ?? null;
  const daysSinceLastOrder = lastCompleted
    ? Math.floor((Date.now() - new Date(lastCompleted.date).getTime()) / (24 * 60 * 60 * 1000))
    : undefined;

  const activeApps = applications.filter((a) =>
    a.isActive || (a.stage !== 'completed' && a.stage !== 'cancelled' && a.stage !== 'unqualified'),
  );

  const activeReservationsCount = activeApps.reduce(
    (sum, app) =>
      sum +
      app.positions.filter(
        (p) => p.status === 'reserved' || p.status === 'unit_selected' || p.status === 'conflict',
      ).length,
    0,
  );

  const activeDeparturesCount = activeApps.filter((a) => a.stage === 'departure').length;
  const activeLeadsCount = leads.filter((l) => !TERMINAL_LEAD_STAGES.has(l.stage)).length;

  const firstApp = activeApps[0];
  const firstReservationApp = activeApps.find((a) =>
    a.positions.some(
      (p) => p.status === 'reserved' || p.status === 'unit_selected' || p.status === 'conflict',
    ),
  );
  const firstDepartureApp = activeApps.find((a) => a.stage === 'departure');

  const manager =
    firstApp?.responsibleManagerName ?? leads[0]?.managerName ?? fallback.manager;

  return {
    ...fallback,
    id: detail.id,
    type: detail.company ? 'company' : 'person',
    displayName: detail.company ?? detail.name,
    shortName: detail.company ? detail.name : undefined,
    primaryPhone: detail.phone,
    primaryEmail: detail.email ?? undefined,
    manager: manager ?? undefined,
    createdAt: formatDate(detail.createdAt),
    updatedAt: formatDate(detail.updatedAt),
    lastActivity: humanizeSince(detail.lastActivity),
    totalOrders: completedOrders.length,
    totalRevenue: totalRevenueValue > 0 ? formatMoney(totalRevenueValue) : undefined,
    daysSinceLastOrder,
    tags: mergeTags(detail),
    contacts: detail.contacts.map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role ?? undefined,
      phone: c.phone ?? undefined,
      email: c.email ?? undefined,
      isPrimary: c.isPrimary,
    })),
    requisites: detail.requisites
      ? {
          inn: detail.requisites.inn ?? undefined,
          kpp: detail.requisites.kpp ?? undefined,
          ogrn: detail.requisites.ogrn ?? undefined,
          legalAddress: detail.requisites.legalAddress ?? undefined,
          bankName: detail.requisites.bankName ?? undefined,
          bankAccount: detail.requisites.bankAccount ?? undefined,
          correspondentAccount: detail.requisites.correspondentAccount ?? undefined,
          bik: detail.requisites.bik ?? undefined,
        }
      : {},
    favoriteCategories:
      detail.favoriteEquipment.length > 0
        ? toFavoriteCategories(detail.favoriteEquipment)
        : fallback.favoriteCategories,
    workingNotes: detail.workingNotes ?? detail.notes ?? fallback.workingNotes,
    comment: detail.notes ?? fallback.comment,
    leadsHistory: leads.map(toLeadHistory),
    ordersHistory,
    activeRecords: {
      leadsCount: activeLeadsCount,
      applicationsCount: activeApps.length,
      reservationsCount: activeReservationsCount,
      departuresCount: activeDeparturesCount,
      topActiveApplication: firstApp
        ? {
            id: firstApp.id,
            title: `${firstApp.number} · ${firstApp.equipmentSummary}`,
          }
        : undefined,
      topActiveReservation: firstReservationApp
        ? {
            id: `RSV-${firstReservationApp.id.slice(-6).toUpperCase()}`,
            title: `${firstReservationApp.number} · ${firstReservationApp.equipmentSummary}`,
          }
        : undefined,
      topActiveDeparture: firstDepartureApp
        ? {
            id: `DEP-${firstDepartureApp.id.slice(-6).toUpperCase()}`,
            title: `${firstDepartureApp.number} · ${firstDepartureApp.equipmentSummary}`,
          }
        : undefined,
    },
    possibleDuplicates: fallback.possibleDuplicates,
    activity:
      args.activity.length > 0
        ? args.activity.map((a) => ({
            id: a.id,
            at: humanizeSince(a.createdAt),
            actor: a.actor?.fullName ?? 'Система',
            message: a.summary,
            kind: 'updated',
          }))
        : fallback.activity,
  };
}
