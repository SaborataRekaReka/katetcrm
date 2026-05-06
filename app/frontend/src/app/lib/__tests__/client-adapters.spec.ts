import { describe, expect, it, vi } from 'vitest';
import { toClientsListItem, toClientsListItems } from '../clientAdapter';
import { toClientWorkspaceModel } from '../clientWorkspaceAdapter';
import type { ClientDetailApi } from '../clientsApi';
import type { ApplicationApi } from '../applicationsApi';
import type { LeadApi } from '../leadsApi';
import type { ActivityLogEntryApi } from '../activityApi';
import type { Client } from '../../types/client';

const LINKED_IDS = {
  leadId: null,
  applicationId: null,
  reservationId: null,
  departureId: null,
  completionId: null,
  clientId: null,
  applicationItemId: null,
};

function buildClientDetail(patch: Partial<ClientDetailApi> = {}): ClientDetailApi {
  return {
    id: 'client-1',
    name: 'Иван Иванов',
    type: 'person',
    company: null,
    phone: '+70000000000',
    email: null,
    totalOrders: 0,
    activeApplications: 0,
    activeReservations: 0,
    lastOrderDate: null,
    lastActivity: '2026-05-05T12:00:00.000Z',
    createdAt: '2026-05-01T12:00:00.000Z',
    updatedAt: '2026-05-05T12:00:00.000Z',
    tags: ['repeat'],
    notes: 'note',
    workingNotes: 'work',
    favoriteEquipment: ['Кран', 'Кран', 'Экскаватор'],
    contacts: [],
    requisites: null,
    assignedTags: [{ id: 'tag-1', label: 'VIP', tone: 'warning', isSystem: false }],
    ...patch,
  };
}

function buildApp(patch: Partial<ApplicationApi> = {}): ApplicationApi {
  return {
    id: 'app-1',
    number: 'APP-1',
    stage: 'completed',
    leadId: 'lead-1',
    clientId: 'client-1',
    clientName: 'Иван Иванов',
    clientCompany: null,
    clientPhone: '+70000000000',
    responsibleManagerId: 'mgr-1',
    responsibleManagerName: 'Менеджер',
    requestedDate: '2026-05-04',
    requestedTimeFrom: null,
    requestedTimeTo: null,
    address: 'Москва',
    comment: 'comment',
    isUrgent: false,
    deliveryMode: null,
    nightWork: false,
    isActive: false,
    cancelledAt: null,
    completedAt: '2026-05-05T12:00:00.000Z',
    lastActivityAt: '2026-05-05T12:00:00.000Z',
    createdAt: '2026-05-01T12:00:00.000Z',
    updatedAt: '2026-05-05T12:00:00.000Z',
    positions: [
      {
        id: 'item-1',
        applicationId: 'app-1',
        equipmentTypeId: 'eq-1',
        equipmentTypeLabel: 'Кран',
        quantity: 2,
        shiftCount: 2,
        overtimeHours: null,
        downtimeHours: null,
        plannedDate: '2026-05-04',
        plannedTimeFrom: null,
        plannedTimeTo: null,
        address: 'Москва',
        comment: null,
        sourcingType: 'own',
        pricePerShift: '10000',
        deliveryPrice: '2000',
        surcharge: '500',
        readyForReservation: true,
        status: 'reserved',
        unit: 'CAT-01',
        subcontractor: null,
        createdAt: '2026-05-01T12:00:00.000Z',
        updatedAt: '2026-05-05T12:00:00.000Z',
      },
    ],
    positionsTotal: 1,
    positionsReserved: 1,
    positionsReady: 1,
    hasAnyConflict: false,
    dominantSourcing: 'own',
    equipmentSummary: 'Кран x2',
    subcontractorSummary: null,
    applicationGroup: 'completed',
    readyForDeparture: false,
    linkedIds: {
      ...LINKED_IDS,
      reservationId: 'rsv-1',
      departureId: 'dep-1',
      completionId: 'cmp-1',
    },
    ...patch,
  };
}

function buildLead(patch: Partial<LeadApi> = {}): LeadApi {
  return {
    id: 'lead-1',
    stage: 'completed',
    source: 'manual',
    sourceLabel: 'Повтор',
    contactName: 'Иван Иванов',
    contactCompany: null,
    contactPhone: '+70000000000',
    phoneNormalized: '70000000000',
    equipmentTypeHint: 'Кран',
    requestedDate: '2026-05-01',
    timeWindow: null,
    address: 'Москва',
    comment: null,
    managerId: 'mgr-1',
    managerName: 'Менеджер',
    manager: { id: 'mgr-1', fullName: 'Менеджер' },
    clientId: 'client-1',
    client: { id: 'client-1', name: 'Иван Иванов', company: null },
    isDuplicate: false,
    isUrgent: false,
    isStale: false,
    hasNoContact: false,
    incompleteData: false,
    missingFields: [],
    unqualifiedReason: null,
    lastActivityAt: '2026-05-05T12:00:00.000Z',
    createdAt: '2026-05-01T12:00:00.000Z',
    updatedAt: '2026-05-05T12:00:00.000Z',
    linkedIds: LINKED_IDS,
    ...patch,
  };
}

function buildActivity(patch: Partial<ActivityLogEntryApi> = {}): ActivityLogEntryApi {
  return {
    id: 'act-1',
    action: 'updated',
    entityType: 'client',
    entityId: 'client-1',
    summary: 'Client updated',
    actorId: 'mgr-1',
    actor: { id: 'mgr-1', fullName: 'Менеджер', email: 'm@test.local' },
    payload: {},
    createdAt: '2026-05-05T12:00:00.000Z',
    ...patch,
  };
}

function buildFallbackClient(): Client {
  return {
    id: 'fallback',
    type: 'person',
    displayName: 'Fallback',
    primaryPhone: '+70000000001',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    lastActivity: 'old',
    totalOrders: 0,
    tags: [],
    contacts: [],
    requisites: {},
    favoriteCategories: [],
    leadsHistory: [],
    ordersHistory: [],
    activeRecords: {
      leadsCount: 0,
      applicationsCount: 0,
      reservationsCount: 0,
      departuresCount: 0,
    },
    possibleDuplicates: [],
    activity: [],
  };
}

describe('Client adapters (QA-REQ-001, QA-REQ-024, QA-REQ-028)', () => {
  it('maps client list item and source lead defaults', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-05T12:30:00.000Z').getTime());

    const item = toClientsListItem({
      id: 'client-1',
      name: 'ООО Тест',
      type: 'company',
      company: 'ООО Тест',
      phone: '+70000000000',
      email: null,
      totalOrders: 2,
      activeApplications: 1,
      activeReservations: 0,
      lastOrderDate: '2026-05-01T00:00:00.000Z',
      lastActivity: '2026-05-05T12:00:00.000Z',
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-05T12:00:00.000Z',
      tags: ['repeat'],
    });

    expect(item.lastOrderDate).toBe('2026-05-01');
    expect(item.manager).toBe('—');
    expect(item.sourceLead.stage).toBe('completed');
    expect(item.lastActivity).toBe('30 мин назад');
  });

  it('builds workspace model with totals, tags, fallback contacts and activity', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-06T12:00:00.000Z').getTime());

    const model = toClientWorkspaceModel({
      detail: buildClientDetail(),
      applications: [
        buildApp(),
        buildApp({ id: 'app-2', number: 'APP-2', stage: 'cancelled', isActive: false, positions: [] }),
        buildApp({ id: 'app-3', number: 'APP-3', stage: 'departure', isActive: true }),
      ],
      leads: [
        buildLead(),
        buildLead({ id: 'lead-2', stage: 'lead', managerName: null, contactName: 'Петр' }),
      ],
      activity: [buildActivity()],
      fallback: buildFallbackClient(),
    });

    expect(model.totalOrders).toBe(1);
    expect(model.totalRevenue?.replace(/\s/g, ' ')).toBe('42 500 ₽');
    expect(model.tags.map((x) => x.label)).toEqual(expect.arrayContaining(['VIP', 'Повторный']));
    expect(model.contacts.length).toBe(1);
    expect(model.contacts[0].name).toBe('Иван Иванов');
    expect(model.activeRecords.applicationsCount).toBe(1);
    expect(model.activeRecords.departuresCount).toBe(1);
    expect(model.activity[0].message).toBe('Client updated');
  });

  it('prefers explicit contacts from API detail and keeps role optional fields normalized', () => {
    const model = toClientWorkspaceModel({
      detail: buildClientDetail({
        contacts: [
          {
            id: 'c-1',
            name: '  Мария  ',
            role: '  Диспетчер  ',
            phone: '  +7999  ',
            email: '  m@test.local  ',
            isPrimary: true,
          },
        ],
      }),
      applications: [buildApp()],
      leads: [buildLead()],
      activity: [],
      fallback: buildFallbackClient(),
    });

    expect(model.contacts).toEqual([
      {
        id: 'c-1',
        name: 'Мария',
        role: 'Диспетчер',
        phone: '+7999',
        email: 'm@test.local',
        isPrimary: true,
      },
    ]);
  });

  it('maps client list fallbacks and list helper variations', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-07T12:00:00.000Z').getTime());

    const person = toClientsListItem({
      id: 'client-2',
      name: 'Петр',
      type: 'person',
      company: null,
      phone: '+79990000001',
      email: null,
      totalOrders: 0,
      activeApplications: 0,
      activeReservations: 0,
      lastOrderDate: null,
      lastActivity: '2026-05-05T12:00:00.000Z',
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-05T12:00:00.000Z',
      tags: ['new'],
    });

    expect(person.lastOrderDate).toBeUndefined();
    expect(person.company).toBeUndefined();
    expect(person.sourceLead.company).toBeUndefined();
    expect(person.lastActivity).toBe('2 дн назад');

    const list = toClientsListItems([
      {
        id: 'client-list-1',
        name: 'Список 1',
        type: 'person',
        company: null,
        phone: '+79990000002',
        email: null,
        totalOrders: 0,
        activeApplications: 0,
        activeReservations: 0,
        lastOrderDate: null,
        lastActivity: '2026-05-07T11:59:40.000Z',
        createdAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-07T11:59:40.000Z',
        tags: ['new'],
      },
      {
        id: 'client-list-2',
        name: 'Список 2',
        type: 'company',
        company: 'ООО Список',
        phone: '+79990000003',
        email: null,
        totalOrders: 1,
        activeApplications: 1,
        activeReservations: 0,
        lastOrderDate: '2026-05-01T00:00:00.000Z',
        lastActivity: '2026-05-07T11:30:00.000Z',
        createdAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-07T11:30:00.000Z',
        tags: ['repeat'],
      },
      {
        id: 'client-list-3',
        name: 'Список 3',
        type: 'person',
        company: null,
        phone: '+79990000004',
        email: null,
        totalOrders: 0,
        activeApplications: 0,
        activeReservations: 0,
        lastOrderDate: null,
        lastActivity: '2026-05-07T09:00:00.000Z',
        createdAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-07T09:00:00.000Z',
        tags: ['new'],
      },
      {
        id: 'client-list-4',
        name: 'Список 4',
        type: 'person',
        company: null,
        phone: '+79990000005',
        email: null,
        totalOrders: 0,
        activeApplications: 0,
        activeReservations: 0,
        lastOrderDate: null,
        lastActivity: '2026-05-06T12:00:00.000Z',
        createdAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-06T12:00:00.000Z',
        tags: ['new'],
      },
    ]);

    expect(list).toHaveLength(4);
    expect(list[0].lastActivity).toBe('только что');
    expect(list[1].lastActivity).toBe('30 мин назад');
    expect(list[2].lastActivity).toBe('3 ч назад');
    expect(list[3].lastActivity).toBe('1 день назад');
  });

  it('builds sparse workspace model using fallback branches', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-08T12:00:00.000Z').getTime());

    const fallback = {
      ...buildFallbackClient(),
      manager: 'Fallback Manager',
      workingNotes: 'fallback-work',
      comment: 'fallback-comment',
      favoriteCategories: [{ category: 'Бетононасос', count: 3 }],
      activity: [
        {
          id: 'fallback-act',
          at: '1 дн назад',
          actor: 'Fallback Actor',
          message: 'fallback',
          kind: 'updated' as const,
        },
      ],
    };

    const sparseModel = toClientWorkspaceModel({
      detail: buildClientDetail({
        name: '  ',
        company: 'ООО Ромашка',
        email: null,
        tags: ['vip', 'new', 'debt', 'unknown'],
        assignedTags: [{ id: 'tag-vip', label: 'VIP', tone: 'warning', isSystem: false }],
        favoriteEquipment: [],
        contacts: [],
        requisites: null,
        notes: null,
        workingNotes: null,
      }),
      applications: [
        buildApp({
          id: 'app-sparse',
          number: 'APP-SPARSE',
          stage: 'application',
          isActive: false,
          responsibleManagerName: null,
          clientName: '  ',
          positions: [
            {
              ...buildApp().positions[0],
              status: 'unit_selected',
              pricePerShift: null,
              deliveryPrice: null,
              surcharge: null,
            },
          ],
          linkedIds: {
            ...LINKED_IDS,
            reservationId: 'rsv-sparse',
            departureId: null,
            completionId: null,
          },
        }),
      ],
      leads: [
        buildLead({
          id: 'lead-sparse',
          stage: 'cancelled',
          managerName: null,
          contactName: '   ',
        }),
      ],
      activity: [],
      fallback,
    });

    expect(sparseModel.type).toBe('company');
    expect(sparseModel.displayName).toBe('ООО Ромашка');
    expect(sparseModel.primaryEmail).toBeUndefined();
    expect(sparseModel.manager).toBe('Fallback Manager');
    expect(sparseModel.totalOrders).toBe(0);
    expect(sparseModel.totalRevenue).toBeUndefined();
    expect(sparseModel.daysSinceLastOrder).toBeUndefined();
    expect(sparseModel.requisites).toEqual({});
    expect(sparseModel.favoriteCategories).toEqual([{ category: 'Бетононасос', count: 3 }]);
    expect(sparseModel.workingNotes).toBe('fallback-work');
    expect(sparseModel.comment).toBe('fallback-comment');
    expect(sparseModel.tags.map((x) => x.label)).toEqual(
      expect.arrayContaining(['VIP', 'Новый', 'Долг']),
    );
    expect(sparseModel.contacts).toEqual([
      {
        id: 'fallback-contact-client-1',
        name: 'ООО Ромашка',
        role: 'Контактное лицо',
        phone: '+70000000000',
        email: undefined,
        isPrimary: true,
      },
    ]);
    expect(sparseModel.activeRecords.applicationsCount).toBe(1);
    expect(sparseModel.activeRecords.reservationsCount).toBe(1);
    expect(sparseModel.activeRecords.departuresCount).toBe(0);
    expect(sparseModel.activeRecords.topActiveReservation?.entityId).toBe('rsv-sparse');
    expect(sparseModel.activeRecords.topActiveDeparture).toBeUndefined();
    expect(sparseModel.activity).toEqual(fallback.activity);
  });

  it('uses lead fallback contact and system actor fallback', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-06T12:00:00.000Z').getTime());

    const model = toClientWorkspaceModel({
      detail: buildClientDetail({
        company: null,
        name: '  ',
        contacts: [
          {
            id: 'blank-contact',
            name: '   ',
            role: null,
            phone: null,
            email: null,
            isPrimary: false,
          },
        ],
      }),
      applications: [
        buildApp({
          id: 'app-contact',
          stage: 'cancelled',
          isActive: false,
          clientName: '  ',
          positions: [],
        }),
      ],
      leads: [
        buildLead({
          stage: 'lead',
          contactName: '  Петр Петров  ',
          managerName: 'Менеджер 2',
        }),
      ],
      activity: [buildActivity({ actor: null })],
      fallback: buildFallbackClient(),
    });

    expect(model.contacts).toEqual([
      {
        id: 'fallback-contact-client-1',
        name: 'Петр Петров',
        role: 'Основной контакт',
        phone: '+70000000000',
        email: undefined,
        isPrimary: true,
      },
    ]);
    expect(model.activeRecords.leadsCount).toBe(1);
    expect(model.activity[0].actor).toBe('Система');
  });

  it('maps requisites payload when backend provides full requisites object', () => {
    const model = toClientWorkspaceModel({
      detail: buildClientDetail({
        requisites: {
          inn: '1234567890',
          kpp: '123456789',
          ogrn: '1027700132195',
          legalAddress: 'Москва, ул. Пример, 1',
          bankName: 'Тест Банк',
          bankAccount: '40702810000000000001',
          correspondentAccount: '30101810000000000001',
          bik: '044525225',
        },
      }),
      applications: [buildApp()],
      leads: [buildLead()],
      activity: [buildActivity()],
      fallback: buildFallbackClient(),
    });

    expect(model.requisites).toEqual({
      inn: '1234567890',
      kpp: '123456789',
      ogrn: '1027700132195',
      legalAddress: 'Москва, ул. Пример, 1',
      bankName: 'Тест Банк',
      bankAccount: '40702810000000000001',
      correspondentAccount: '30101810000000000001',
      bik: '044525225',
    });
  });

  it('uses default Контакт label when all fallback names are empty', () => {
    const model = toClientWorkspaceModel({
      detail: buildClientDetail({
        name: '   ',
        company: '   ',
        phone: '   ',
        email: '   ',
        contacts: [],
      }),
      applications: [
        buildApp({
          id: 'app-empty-name',
          clientName: '   ',
          positions: [],
          stage: 'cancelled',
          isActive: false,
        }),
      ],
      leads: [
        buildLead({
          id: 'lead-empty-name',
          contactName: '   ',
          stage: 'cancelled',
        }),
      ],
      activity: [],
      fallback: buildFallbackClient(),
    });

    expect(model.contacts).toEqual([
      {
        id: 'fallback-contact-client-1',
        name: 'Контакт',
        role: 'Контактное лицо',
        phone: undefined,
        email: undefined,
        isPrimary: true,
      },
    ]);
  });
});
