import {
  deriveClientListTags,
  projectClientDetail,
  projectClientListItem,
  projectClientListItems,
} from '../../src/common/projections/client.projection';
import {
  projectApplication,
  projectApplicationItem,
  projectApplications,
} from '../../src/common/projections/application.projection';
import { projectCompletion, projectCompletions } from '../../src/common/projections/completion.projection';
import { projectDeparture, projectDepartures } from '../../src/common/projections/departure.projection';
import { projectLead, projectLeads } from '../../src/common/projections/lead.projection';
import {
  deriveReservationState,
  projectReservation,
  projectReservations,
} from '../../src/common/projections/reservation.projection';

describe('Projection Coverage Pack (QA-REQ-028, QA-REQ-029, QA-REQ-031, QA-REQ-032)', () => {
  test('client projection maps aggregates and detail fields', () => {
    expect(deriveClientListTags(0)).toEqual(['new']);
    expect(deriveClientListTags(2)).toEqual(['repeat']);
    expect(deriveClientListTags(11)).toEqual(['vip', 'repeat']);

    const client = {
      id: 'client-1',
      name: 'Иван Иванов',
      company: 'ООО Тест',
      phone: '+70000000000',
      email: 'c@test.local',
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-06T00:00:00.000Z'),
      applications: [
        {
          id: 'app-1',
          isActive: true,
          completedAt: new Date('2026-05-05T00:00:00.000Z'),
          updatedAt: new Date('2026-05-05T00:00:00.000Z'),
          items: [{ reservations: [{ id: 'r1' }, { id: 'r2' }] }],
        },
        {
          id: 'app-2',
          isActive: false,
          completedAt: null,
          updatedAt: new Date('2026-05-04T00:00:00.000Z'),
          items: [{ reservations: [] }],
        },
      ],
      _count: { applications: 2, leads: 1 },
    } as any;

    const listItem = projectClientListItem(client);
    expect(listItem.name).toBe('ООО Тест');
    expect(listItem.type).toBe('company');
    expect(listItem.totalOrders).toBe(1);
    expect(listItem.activeApplications).toBe(1);
    expect(listItem.activeReservations).toBe(2);
    expect(listItem.lastOrderDate).toBe('2026-05-05T00:00:00.000Z');
    expect(listItem.tags).toEqual(['new']);

    const detail = projectClientDetail({
      ...client,
      notes: 'note',
      workingNotes: 'work',
      favoriteEquipment: ['Кран'],
      contacts: [
        {
          id: 'contact-1',
          name: 'Мария',
          role: 'ЛПР',
          phone: '+7999',
          email: 'm@test.local',
          isPrimary: true,
        },
      ],
      requisites: {
        inn: '123',
        kpp: null,
        ogrn: null,
        legalAddress: null,
        bankName: null,
        bankAccount: null,
        correspondentAccount: null,
        bik: null,
      },
      tags: [
        {
          tag: {
            id: 'tag-1',
            label: 'VIP',
            tone: 'warning',
            isSystem: false,
          },
        },
      ],
    } as any);

    expect(detail.notes).toBe('note');
    expect(detail.workingNotes).toBe('work');
    expect(detail.favoriteEquipment).toEqual(['Кран']);
    expect(detail.contacts).toHaveLength(1);
    expect(detail.assignedTags).toEqual([
      { id: 'tag-1', label: 'VIP', tone: 'warning', isSystem: false },
    ]);

    expect(projectClientListItems([client] as any)).toHaveLength(1);
  });

  test('lead projection maps missing fields and linked chain', () => {
    const lead = {
      id: 'lead-1',
      stage: 'lead',
      contactName: 'Иван',
      contactCompany: null,
      contactPhone: '',
      phoneNormalized: '',
      clientId: null,
      client: null,
      source: 'manual',
      sourceLabel: null,
      equipmentTypeHint: null,
      requestedDate: null,
      timeWindow: null,
      address: null,
      comment: null,
      managerId: null,
      manager: null,
      isDuplicate: false,
      isUrgent: false,
      isStale: false,
      hasNoContact: true,
      incompleteData: true,
      unqualifiedReason: null,
      lastActivityAt: new Date('2026-05-06T10:00:00.000Z'),
      createdAt: new Date('2026-05-01T10:00:00.000Z'),
      updatedAt: new Date('2026-05-06T10:00:00.000Z'),
      applications: [
        {
          id: 'app-old',
          clientId: 'client-1',
          isActive: false,
          createdAt: new Date('2026-05-01T00:00:00.000Z'),
          items: [
            {
              id: 'item-old',
              createdAt: new Date('2026-05-01T00:00:00.000Z'),
              reservations: [
                {
                  id: 'r-old',
                  applicationItemId: 'item-old',
                  isActive: false,
                  createdAt: new Date('2026-05-01T00:00:00.000Z'),
                  departures: [],
                },
              ],
            },
          ],
        },
        {
          id: 'app-new',
          clientId: 'client-2',
          isActive: true,
          createdAt: new Date('2026-05-05T00:00:00.000Z'),
          items: [
            {
              id: 'item-new',
              createdAt: new Date('2026-05-05T00:00:00.000Z'),
              reservations: [
                {
                  id: 'r-new',
                  applicationItemId: 'item-new',
                  isActive: true,
                  createdAt: new Date('2026-05-05T00:00:00.000Z'),
                  departures: [
                    {
                      id: 'dep-active',
                      status: 'scheduled',
                      scheduledAt: new Date('2026-05-07T00:00:00.000Z'),
                      completion: { id: 'cmp-1' },
                    },
                    {
                      id: 'dep-completed',
                      status: 'completed',
                      scheduledAt: new Date('2026-05-06T00:00:00.000Z'),
                      completion: null,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    } as any;

    const projected = projectLead(lead);
    expect(projected.sourceLabel).toBe('Ручной ввод');
    expect(projected.missingFields).toEqual(['address', 'date', 'contact', 'equipment']);
    expect(projected.linkedIds.applicationId).toBe('app-new');
    expect(projected.linkedIds.reservationId).toBe('r-new');
    expect(projected.linkedIds.departureId).toBe('dep-active');
    expect(projected.linkedIds.completionId).toBe('cmp-1');

    expect(projectLeads([lead] as any)).toHaveLength(1);
  });

  test.each([
    {
      name: 'released reservation',
      input: {
        status: 'released',
        source: 'own',
        equipmentUnit: false,
        subcontractor: false,
        hasConflict: false,
        readyForDeparture: false,
      },
      stage: 'released',
    },
    {
      name: 'needs source selection',
      input: {
        status: 'active',
        source: 'undecided',
        equipmentUnit: false,
        subcontractor: false,
        hasConflict: false,
        readyForDeparture: false,
      },
      stage: 'needs_source_selection',
    },
    {
      name: 'search own equipment',
      input: {
        status: 'active',
        source: 'own',
        equipmentUnit: false,
        subcontractor: false,
        hasConflict: false,
        readyForDeparture: false,
      },
      stage: 'searching_own_equipment',
    },
    {
      name: 'search subcontractor',
      input: {
        status: 'active',
        source: 'subcontractor',
        equipmentUnit: false,
        subcontractor: false,
        hasConflict: false,
        readyForDeparture: false,
      },
      stage: 'searching_subcontractor',
    },
    {
      name: 'conflict state',
      input: {
        status: 'active',
        source: 'own',
        equipmentUnit: true,
        subcontractor: false,
        hasConflict: true,
        readyForDeparture: false,
      },
      stage: 'unit_defined',
    },
    {
      name: 'ready for departure',
      input: {
        status: 'active',
        source: 'own',
        equipmentUnit: true,
        subcontractor: false,
        hasConflict: false,
        readyForDeparture: true,
      },
      stage: 'ready_for_departure',
    },
    {
      name: 'own equipment reserved',
      input: {
        status: 'active',
        source: 'own',
        equipmentUnit: true,
        subcontractor: false,
        hasConflict: false,
        readyForDeparture: false,
      },
      stage: 'unit_defined',
    },
    {
      name: 'subcontractor reserved',
      input: {
        status: 'active',
        source: 'subcontractor',
        equipmentUnit: false,
        subcontractor: true,
        hasConflict: false,
        readyForDeparture: false,
      },
      stage: 'type_reserved',
    },
  ])('deriveReservationState -> $name', ({ input, stage }) => {
    expect(deriveReservationState(input as any).displayStage).toBe(stage);
  });

  test('reservation projection maps source aliases and linked ids', () => {
    const reservation = {
      id: 'r1',
      applicationItemId: 'item-1',
      applicationItem: {
        id: 'item-1',
        equipmentTypeLabel: 'Кран',
        applicationId: 'app-1',
        application: {
          id: 'app-1',
          number: 'APP-1',
          leadId: 'lead-1',
          clientId: 'client-1',
          client: { id: 'client-1', name: 'Клиент', company: null, phone: '+700' },
          responsibleManager: { id: 'mgr-1', fullName: 'Менеджер' },
        },
      },
      createdBy: null,
      equipmentTypeId: 'eq-1',
      equipmentType: null,
      equipmentUnitId: null,
      equipmentUnit: null,
      subcontractorId: null,
      subcontractor: null,
      sourcingType: 'undecided',
      internalStage: 'needs_source_selection',
      isActive: true,
      plannedStart: new Date('2026-05-10T10:00:00.000Z'),
      plannedEnd: new Date('2026-05-10T18:00:00.000Z'),
      hasConflictWarning: true,
      conflictContext: {
        id: 'conf-1',
        summary: 'conflict',
        conflictingReservationId: 'r2',
        conflictingAt: '2026-05-10T09:00:00.000Z',
      },
      departures: [
        {
          id: 'dep-1',
          status: 'arrived',
          scheduledAt: new Date('2026-05-10T09:00:00.000Z'),
          completion: { id: 'cmp-1' },
        },
      ],
      subcontractorConfirmation: 'not_requested',
      promisedModelOrUnit: null,
      subcontractorNote: null,
      comment: null,
      releasedAt: null,
      releaseReason: null,
      createdAt: new Date('2026-05-01T10:00:00.000Z'),
      updatedAt: new Date('2026-05-01T10:10:00.000Z'),
    } as any;

    const projected = projectReservation(reservation);
    expect(projected.source).toBe('undecided');
    expect(projected.conflict?.id).toBe('conf-1');
    expect(projected.linkedIds.departureId).toBe('dep-1');
    expect(projected.linkedIds.completionId).toBe('cmp-1');

    expect(projectReservations([reservation] as any)).toHaveLength(1);
  });

  test('departure projection derives alerts and actions', () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-10T15:00:00.000Z').getTime());

    const base = {
      id: 'dep-1',
      reservationId: 'r1',
      scheduledAt: new Date('2026-05-10T10:00:00.000Z'),
      startedAt: null,
      arrivedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      notes: null,
      deliveryNotes: null,
      createdAt: new Date('2026-05-01T10:00:00.000Z'),
      updatedAt: new Date('2026-05-01T10:00:00.000Z'),
      completion: null,
      reservation: {
        id: 'r1',
        plannedStart: new Date('2026-05-10T10:00:00.000Z'),
        plannedEnd: new Date('2026-05-10T18:00:00.000Z'),
        comment: null,
        equipmentTypeId: 'eq-1',
        equipmentType: { id: 'eq-1', name: 'Кран' },
        equipmentUnitId: 'u1',
        equipmentUnit: { id: 'u1', name: 'CAT', plateNumber: 'A111AA' },
        subcontractorId: null,
        subcontractor: null,
        applicationItem: {
          id: 'item-1',
          applicationId: 'app-1',
          equipmentTypeLabel: 'Кран',
          quantity: 1,
          address: 'Москва',
          plannedDate: new Date('2026-05-10T00:00:00.000Z'),
          plannedTimeFrom: '10:00',
          plannedTimeTo: '18:00',
          application: {
            id: 'app-1',
            number: 'APP-1',
            leadId: 'lead-1',
            clientId: 'client-1',
            client: { id: 'client-1', name: 'Клиент', company: null, phone: '+700' },
            responsibleManagerId: 'mgr-1',
            responsibleManager: { id: 'mgr-1', fullName: 'Менеджер' },
          },
        },
      },
    } as any;

    const scheduled = projectDeparture({ ...base, status: 'scheduled' } as any);
    expect(scheduled.derived.alert).toBe('overdue_start');
    expect(scheduled.derived.canStart).toBe(true);

    const inTransit = projectDeparture({
      ...base,
      status: 'in_transit',
      startedAt: new Date('2026-05-10T09:00:00.000Z'),
    } as any);
    expect(inTransit.derived.alert).toBe('overdue_arrival');
    expect(inTransit.derived.canArrive).toBe(true);

    const arrived = projectDeparture({
      ...base,
      status: 'arrived',
      arrivedAt: new Date('2026-05-09T10:00:00.000Z'),
    } as any);
    expect(arrived.derived.alert).toBe('stale');
    expect(arrived.derived.canComplete).toBe(true);

    const completed = projectDeparture({
      ...base,
      status: 'completed',
      completion: {
        id: 'cmp-1',
        outcome: 'completed',
        completedAt: new Date('2026-05-10T20:00:00.000Z'),
      },
    } as any);
    expect(completed.completion?.id).toBe('cmp-1');

    expect(projectDepartures([base] as any)).toHaveLength(1);
  });

  test('completion projection derives status and alerts', () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-15T20:00:00.000Z').getTime());

    const base = {
      id: 'cmp-1',
      departureId: 'dep-1',
      outcome: 'completed',
      completionNote: 'ok',
      unqualifiedReason: null,
      completedById: 'mgr-1',
      completedBy: { id: 'mgr-1', fullName: 'Менеджер' },
      completedAt: new Date('2026-05-10T20:00:00.000Z'),
      departure: {
        id: 'dep-1',
        status: 'completed',
        scheduledAt: new Date('2026-05-10T10:00:00.000Z'),
        startedAt: new Date('2026-05-10T11:00:00.000Z'),
        arrivedAt: new Date('2026-05-10T12:00:00.000Z'),
        deliveryNotes: null,
        cancellationReason: null,
        reservationId: 'r1',
        reservation: {
          id: 'r1',
          plannedStart: new Date('2026-05-10T10:00:00.000Z'),
          plannedEnd: new Date('2026-05-10T18:00:00.000Z'),
          equipmentTypeId: 'eq-1',
          equipmentType: { id: 'eq-1', name: 'Кран' },
          equipmentUnitId: 'u1',
          equipmentUnit: { id: 'u1', name: 'CAT' },
          subcontractorId: null,
          subcontractor: null,
          applicationItem: {
            id: 'item-1',
            applicationId: 'app-1',
            equipmentTypeLabel: 'Кран',
            quantity: 1,
            address: 'Москва',
            plannedDate: new Date('2026-05-10T00:00:00.000Z'),
            plannedTimeFrom: '10:00',
            plannedTimeTo: '18:00',
            application: {
              id: 'app-1',
              number: 'APP-1',
              leadId: 'lead-1',
              clientId: 'client-1',
              client: { id: 'client-1', name: 'Клиент', company: null, phone: '+700' },
              responsibleManagerId: 'mgr-1',
              responsibleManager: { id: 'mgr-1', fullName: 'Менеджер' },
            },
          },
        },
      },
    } as any;

    const projected = projectCompletion(base);
    expect(projected.derived.status).toBe('completed');
    expect(projected.derived.alert).toBe('stale');

    const missingArrival = projectCompletion({
      ...base,
      departure: {
        ...base.departure,
        arrivedAt: null,
      },
    } as any);
    expect(missingArrival.derived.alert).toBe('missing_arrival');

    const unqualified = projectCompletion({
      ...base,
      outcome: 'unqualified',
      unqualifiedReason: 'bad',
    } as any);
    expect(unqualified.derived.status).toBe('unqualified');

    expect(projectCompletions([base] as any)).toHaveLength(1);
  });

  test('application projection derives group, sourcing and linked ids', () => {
    const itemOwn = {
      id: 'item-own',
      applicationId: 'app-1',
      equipmentTypeId: 'eq-1',
      equipmentTypeLabel: 'Кран 25т',
      quantity: 1,
      shiftCount: 1,
      overtimeHours: null,
      downtimeHours: null,
      plannedDate: new Date('2026-05-10T00:00:00.000Z'),
      plannedTimeFrom: '10:00',
      plannedTimeTo: '18:00',
      address: 'Москва',
      comment: null,
      sourcingType: 'own',
      pricePerShift: { toString: () => '100' },
      deliveryPrice: { toString: () => '10' },
      surcharge: { toString: () => '5' },
      readyForReservation: true,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      reservations: [
        {
          id: 'r-own',
          isActive: true,
          hasConflictWarning: false,
          internalStage: 'ready_for_departure',
          createdAt: new Date('2026-05-05T00:00:00.000Z'),
          equipmentUnit: { name: 'CAT' },
          subcontractor: null,
          departures: [
            {
              id: 'dep-1',
              status: 'scheduled',
              scheduledAt: new Date('2026-05-11T00:00:00.000Z'),
              completion: { id: 'cmp-1' },
            },
          ],
        },
      ],
    };

    const itemSub = {
      ...itemOwn,
      id: 'item-sub',
      equipmentTypeLabel: 'Экскаватор',
      sourcingType: 'subcontractor',
      reservations: [
        {
          id: 'r-sub',
          isActive: true,
          hasConflictWarning: true,
          internalStage: 'type_reserved',
          createdAt: new Date('2026-05-04T00:00:00.000Z'),
          equipmentUnit: null,
          subcontractor: { name: 'Подрядчик' },
          departures: [],
        },
      ],
    };

    const app = {
      id: 'app-1',
      number: 'APP-1',
      stage: 'application',
      leadId: 'lead-1',
      clientId: 'client-1',
      client: { id: 'client-1', name: 'Клиент', company: null, phone: '+700' },
      responsibleManagerId: 'mgr-1',
      responsibleManager: { id: 'mgr-1', fullName: 'Менеджер' },
      requestedDate: new Date('2026-05-10T00:00:00.000Z'),
      requestedTimeFrom: '10:00',
      requestedTimeTo: '18:00',
      address: 'Москва',
      comment: null,
      isUrgent: false,
      deliveryMode: null,
      nightWork: false,
      isActive: true,
      cancelledAt: null,
      completedAt: null,
      lastActivityAt: new Date('2026-05-06T00:00:00.000Z'),
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-06T00:00:00.000Z'),
      items: [itemOwn, itemSub],
    } as any;

    const projected = projectApplication(app);
    expect(projected.positionsTotal).toBe(2);
    expect(projected.positionsReserved).toBe(2);
    expect(projected.hasAnyConflict).toBe(true);
    expect(projected.dominantSourcing).toBe('mixed');
    expect(projected.equipmentSummary).toBe('Кран, Экскаватор');
    expect(projected.subcontractorSummary).toBe('Подрядчик');
    expect(projected.applicationGroup).toBe('in_reservation_work');
    expect(projected.linkedIds.reservationId).toBe('r-own');
    expect(projected.linkedIds.departureId).toBe('dep-1');
    expect(projected.linkedIds.completionId).toBe('cmp-1');

    const ready = projectApplication({ ...app, items: [itemOwn], stage: 'application' } as any);
    expect(ready.applicationGroup).toBe('ready_for_departure');
    expect(ready.readyForDeparture).toBe(true);

    const departureStage = projectApplication({ ...app, stage: 'departure' } as any);
    expect(departureStage.applicationGroup).toBe('on_departure');

    const cancelled = projectApplication({ ...app, stage: 'cancelled' } as any);
    expect(cancelled.applicationGroup).toBe('cancelled');

    const completed = projectApplication({ ...app, stage: 'completed' } as any);
    expect(completed.applicationGroup).toBe('completed');

    const leadStageFallback = projectApplication({ ...app, stage: 'lead', items: [] } as any);
    expect(leadStageFallback.applicationGroup).toBe('no_reservation');

    expect(projectApplicationItem(itemOwn as any).status).toBe('reserved');
    expect(projectApplications([app] as any)).toHaveLength(1);
  });

  test('client projection handles person type and detail fallbacks', () => {
    const client = {
      id: 'client-person',
      name: 'Петр Петров',
      company: null,
      phone: '+71111111111',
      email: null,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-03T00:00:00.000Z'),
      applications: [
        {
          id: 'app-1',
          isActive: true,
          completedAt: null,
          updatedAt: new Date('2026-05-03T00:00:00.000Z'),
          items: [{ reservations: [] }],
        },
      ],
      _count: { applications: 1, leads: 0 },
    } as any;

    const listItem = projectClientListItem(client);
    expect(listItem.name).toBe('Петр Петров');
    expect(listItem.type).toBe('person');
    expect(listItem.totalOrders).toBe(0);
    expect(listItem.lastOrderDate).toBeNull();
    expect(listItem.tags).toEqual(['new']);

    const detail = projectClientDetail({
      ...client,
      notes: undefined,
      workingNotes: undefined,
      favoriteEquipment: undefined,
      contacts: undefined,
      requisites: undefined,
      tags: undefined,
    } as any);

    expect(detail.notes).toBeNull();
    expect(detail.workingNotes).toBeNull();
    expect(detail.favoriteEquipment).toEqual([]);
    expect(detail.contacts).toEqual([]);
    expect(detail.requisites).toBeNull();
    expect(detail.assignedTags).toEqual([]);
  });

  test('lead projection handles explicit source label and empty chain', () => {
    const lead = {
      id: 'lead-explicit',
      stage: 'lead',
      contactName: 'Мария',
      contactCompany: 'ООО Клиент',
      contactPhone: '+79990000000',
      phoneNormalized: '+79990000000',
      clientId: 'client-explicit',
      client: { id: 'client-explicit', name: 'Мария', company: 'ООО Клиент' },
      source: 'site',
      sourceLabel: 'Партнер',
      equipmentTypeHint: 'Кран',
      requestedDate: new Date('2026-05-12T00:00:00.000Z'),
      timeWindow: '10:00-12:00',
      address: 'Москва',
      comment: 'Комментарий',
      managerId: 'mgr-42',
      manager: { id: 'mgr-42', fullName: 'Ольга' },
      isDuplicate: false,
      isUrgent: true,
      isStale: false,
      hasNoContact: false,
      incompleteData: false,
      unqualifiedReason: null,
      lastActivityAt: new Date('2026-05-06T10:00:00.000Z'),
      createdAt: new Date('2026-05-01T10:00:00.000Z'),
      updatedAt: new Date('2026-05-06T10:00:00.000Z'),
      applications: [],
    } as any;

    const projected = projectLead(lead);
    expect(projected.sourceLabel).toBe('Партнер');
    expect(projected.missingFields).toEqual([]);
    expect(projected.managerName).toBe('Ольга');
    expect(projected.requestedDate).toBe('2026-05-12T00:00:00.000Z');
    expect(projected.linkedIds.applicationId).toBeNull();
    expect(projected.linkedIds.reservationId).toBeNull();
    expect(projected.linkedIds.clientId).toBe('client-explicit');
  });

  test('lead projection falls back to default source label for unknown source', () => {
    const projected = projectLead({
      id: 'lead-other',
      stage: 'lead',
      contactName: 'Тест',
      contactCompany: null,
      contactPhone: '+700',
      phoneNormalized: '+700',
      clientId: null,
      client: null,
      source: 'mystery',
      sourceLabel: null,
      equipmentTypeHint: null,
      requestedDate: null,
      timeWindow: null,
      address: null,
      comment: null,
      managerId: null,
      manager: null,
      isDuplicate: false,
      isUrgent: false,
      isStale: false,
      hasNoContact: false,
      incompleteData: false,
      unqualifiedReason: null,
      lastActivityAt: new Date('2026-05-06T10:00:00.000Z'),
      createdAt: new Date('2026-05-01T10:00:00.000Z'),
      updatedAt: new Date('2026-05-06T10:00:00.000Z'),
      applications: [],
    } as any);

    expect(projected.sourceLabel).toBe('Другое');
  });

  test('reservation projection prioritizes creator and handles relation fallbacks', () => {
    const reservation = {
      id: 'r-fallback',
      applicationItemId: 'item-fallback',
      applicationItem: {
        id: 'item-fallback',
        equipmentTypeLabel: 'Бульдозер',
        applicationId: 'app-fallback',
        application: {
          id: 'app-fallback',
          number: 'APP-FALLBACK',
          leadId: 'lead-fallback',
          clientId: 'client-fallback',
          client: null,
          responsibleManager: { id: 'mgr-1', fullName: 'Менеджер fallback' },
        },
      },
      createdBy: { id: 'creator-1', fullName: 'Создатель' },
      equipmentTypeId: 'eq-1',
      equipmentType: { id: 'eq-1', name: 'Бульдозер' },
      equipmentUnitId: null,
      equipmentUnit: null,
      subcontractorId: null,
      subcontractor: null,
      sourcingType: 'own',
      internalStage: 'needs_source_selection',
      isActive: true,
      plannedStart: new Date('2026-05-10T10:00:00.000Z'),
      plannedEnd: new Date('2026-05-10T18:00:00.000Z'),
      hasConflictWarning: false,
      conflictContext: null,
      departures: [],
      subcontractorConfirmation: 'not_requested',
      promisedModelOrUnit: null,
      subcontractorNote: null,
      comment: null,
      releasedAt: null,
      releaseReason: null,
      createdAt: new Date('2026-05-01T10:00:00.000Z'),
      updatedAt: new Date('2026-05-01T10:10:00.000Z'),
    } as any;

    const projected = projectReservation(reservation);
    expect(projected.source).toBe('undecided');
    expect(projected.reservedById).toBe('creator-1');
    expect(projected.reservedByName).toBe('Создатель');
    expect(projected.conflict).toBeNull();
    expect(projected.departureId).toBeNull();
    expect(projected.completionId).toBeNull();

    const releasedWithMissingRelations = projectReservation({
      ...reservation,
      id: 'r-missing',
      isActive: false,
      sourcingType: 'subcontractor',
      internalStage: 'searching_subcontractor',
      applicationItem: null,
      equipmentType: null,
      equipmentTypeId: null,
    } as any);

    expect(releasedWithMissingRelations.applicationId).toBe('');
    expect(releasedWithMissingRelations.positionLabel).toBe('—');
    expect(releasedWithMissingRelations.status).toBe('released');
  });

  test('departure projection returns none alert and fallback labels', () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-10T12:00:00.000Z').getTime());

    const projected = projectDeparture({
      id: 'dep-none',
      reservationId: 'r-none',
      status: 'in_transit',
      scheduledAt: new Date('2026-05-10T11:00:00.000Z'),
      startedAt: null,
      arrivedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      notes: null,
      deliveryNotes: null,
      createdAt: new Date('2026-05-01T10:00:00.000Z'),
      updatedAt: new Date('2026-05-01T10:00:00.000Z'),
      completion: null,
      reservation: {
        id: 'r-none',
        plannedStart: new Date('2026-05-10T10:00:00.000Z'),
        plannedEnd: new Date('2026-05-10T18:00:00.000Z'),
        comment: null,
        equipmentTypeId: null,
        equipmentType: null,
        equipmentUnitId: null,
        equipmentUnit: null,
        subcontractorId: null,
        subcontractor: null,
        applicationItem: {
          id: 'item-none',
          applicationId: 'app-none',
          equipmentTypeLabel: 'Погрузчик',
          quantity: 2,
          address: null,
          plannedDate: null,
          plannedTimeFrom: null,
          plannedTimeTo: null,
          application: {
            id: 'app-none',
            number: null,
            leadId: null,
            clientId: null,
            client: null,
            responsibleManagerId: null,
            responsibleManager: null,
          },
        },
      },
    } as any);

    expect(projected.derived.alert).toBe('none');
    expect(projected.linked.equipmentTypeLabel).toBe('Погрузчик');
    expect(projected.linked.clientName).toBeNull();
    expect(projected.linked.responsibleManagerName).toBeNull();
    expect(projected.linked.plannedDate).toBeNull();
  });

  test('completion projection returns none alert and fallback relation fields', () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-10T13:00:00.000Z').getTime());

    const projected = projectCompletion({
      id: 'cmp-none',
      departureId: 'dep-none',
      outcome: 'completed',
      completionNote: null,
      unqualifiedReason: null,
      completedById: null,
      completedBy: null,
      completedAt: new Date('2026-05-10T12:30:00.000Z'),
      departure: {
        id: 'dep-none',
        status: 'completed',
        scheduledAt: new Date('2026-05-10T11:00:00.000Z'),
        startedAt: null,
        arrivedAt: new Date('2026-05-10T12:00:00.000Z'),
        deliveryNotes: null,
        cancellationReason: null,
        reservationId: 'r-none',
        reservation: {
          id: 'r-none',
          plannedStart: new Date('2026-05-10T10:00:00.000Z'),
          plannedEnd: new Date('2026-05-10T18:00:00.000Z'),
          equipmentTypeId: null,
          equipmentType: null,
          equipmentUnitId: null,
          equipmentUnit: null,
          subcontractorId: null,
          subcontractor: null,
          applicationItem: {
            id: 'item-none',
            applicationId: 'app-none',
            equipmentTypeLabel: 'Манипулятор',
            quantity: 2,
            address: null,
            plannedDate: null,
            plannedTimeFrom: null,
            plannedTimeTo: null,
            application: {
              id: 'app-none',
              number: null,
              leadId: null,
              clientId: null,
              client: null,
              responsibleManagerId: null,
              responsibleManager: null,
            },
          },
        },
      },
    } as any);

    expect(projected.derived.alert).toBe('none');
    expect(projected.completedByName).toBeNull();
    expect(projected.linked.equipmentTypeLabel).toBe('Манипулятор');
    expect(projected.linked.clientName).toBeNull();
    expect(projected.linked.responsibleManagerName).toBeNull();
    expect(projected.context.plannedDate).toBeNull();
  });

  test('application projection covers unit_selected/no_reservation and undecided sourcing', () => {
    const itemUnitSelected = {
      id: 'item-unit-selected',
      applicationId: 'app-2',
      equipmentTypeId: null,
      equipmentTypeLabel: 'Автокран',
      quantity: 1,
      shiftCount: 1,
      overtimeHours: null,
      downtimeHours: null,
      plannedDate: null,
      plannedTimeFrom: null,
      plannedTimeTo: null,
      address: null,
      comment: null,
      sourcingType: 'own',
      pricePerShift: null,
      deliveryPrice: null,
      surcharge: null,
      readyForReservation: false,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      reservations: [
        {
          id: 'r-inactive',
          isActive: false,
          hasConflictWarning: false,
          internalStage: 'type_reserved',
          createdAt: new Date('2026-05-08T00:00:00.000Z'),
          equipmentUnit: null,
          subcontractor: null,
          departures: [],
        },
        {
          id: 'r-active',
          isActive: true,
          hasConflictWarning: false,
          internalStage: 'searching_own_equipment',
          createdAt: new Date('2026-05-05T00:00:00.000Z'),
          equipmentUnit: null,
          subcontractor: null,
          departures: [
            {
              id: 'dep-completed',
              status: 'completed',
              scheduledAt: new Date('2026-05-12T00:00:00.000Z'),
              completion: null,
            },
            {
              id: 'dep-scheduled',
              status: 'scheduled',
              scheduledAt: new Date('2026-05-11T00:00:00.000Z'),
              completion: { id: 'cmp-active' },
            },
          ],
        },
      ],
    };

    const itemNoReservation = {
      ...itemUnitSelected,
      id: 'item-no-reservation',
      sourcingType: 'undecided',
      reservations: [],
    };

    const projected = projectApplication({
      id: 'app-2',
      number: 'APP-2',
      stage: 'application',
      leadId: 'lead-2',
      clientId: 'client-2',
      client: null,
      responsibleManagerId: null,
      responsibleManager: null,
      requestedDate: null,
      requestedTimeFrom: null,
      requestedTimeTo: null,
      address: null,
      comment: null,
      isUrgent: false,
      deliveryMode: null,
      nightWork: false,
      isActive: true,
      cancelledAt: null,
      completedAt: null,
      lastActivityAt: new Date('2026-05-06T00:00:00.000Z'),
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-06T00:00:00.000Z'),
      items: [itemUnitSelected, itemNoReservation],
    } as any);

    expect(projected.positions.map((p) => p.status)).toEqual(['unit_selected', 'no_reservation']);
    expect(projected.dominantSourcing).toBe('undecided');
    expect(projected.clientName).toBe('');
    expect(projected.clientPhone).toBe('');
    expect(projected.responsibleManagerName).toBeNull();
    expect(projected.linkedIds.reservationId).toBe('r-active');
    expect(projected.linkedIds.departureId).toBe('dep-scheduled');
    expect(projected.linkedIds.completionId).toBe('cmp-active');
    expect(projectApplicationItem(itemNoReservation as any).status).toBe('no_reservation');
    expect(projectApplicationItem(itemUnitSelected as any).status).toBe('unit_selected');
  });
});
