import { describe, expect, it, vi } from 'vitest';
import { toReservationEntity, toReservationRow, toReservationRows } from '../reservationAdapter';
import { toCompletionLeadFromCompletion, toCompletionLeadFromDeparture, toDepartureLead } from '../departureAdapter';
import type { ReservationApi } from '../reservationsApi';
import type { DepartureApi } from '../departuresApi';
import type { CompletionApi } from '../completionsApi';

const LINKED_IDS = {
  leadId: 'lead-1',
  applicationId: 'app-1',
  reservationId: 'rsv-1',
  departureId: 'dep-1',
  completionId: null,
  clientId: 'client-1',
  applicationItemId: 'item-1',
};

function buildReservationApi(patch: Partial<ReservationApi> = {}): ReservationApi {
  return {
    id: 'rsv-1',
    applicationItemId: 'item-1',
    applicationId: 'app-1',
    leadId: 'lead-1',
    applicationNumber: 'APP-1',
    clientId: 'client-1',
    clientName: 'ООО Тест',
    clientCompany: 'ООО Тест',
    clientPhone: '+70000000000',
    reservedById: 'mgr-1',
    reservedByName: 'Менеджер',
    responsibleManagerId: 'mgr-1',
    responsibleManagerName: 'Менеджер',
    positionLabel: 'Кран 25т',
    equipmentTypeId: 'eq-1',
    equipmentTypeLabel: 'Кран',
    equipmentUnitId: 'unit-1',
    equipmentUnitLabel: 'CAT-01',
    subcontractorId: null,
    subcontractorLabel: null,
    sourcingType: 'own',
    source: 'own',
    internalStage: 'ready_for_departure',
    status: 'active',
    plannedStart: '2026-05-10T10:00:00.000Z',
    plannedEnd: '2026-05-10T18:00:00.000Z',
    hasConflict: false,
    conflict: null,
    linkedIds: LINKED_IDS,
    readyForDeparture: true,
    subcontractorConfirmation: 'not_requested',
    promisedModelOrUnit: null,
    subcontractorNote: null,
    comment: null,
    releasedAt: null,
    releaseReason: null,
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-01T10:10:00.000Z',
    derived: {
      displayStage: 'ready_for_departure',
      nextStep: 'transfer_to_departure',
      ctaLabel: 'Перевести в выезд',
      ctaDisabled: false,
      reason: null,
    },
    ...patch,
  };
}

function buildDepartureApi(patch: Partial<DepartureApi> = {}): DepartureApi {
  return {
    id: 'dep-1',
    reservationId: 'rsv-1',
    status: 'scheduled',
    scheduledAt: '2026-05-11T09:00:00.000Z',
    startedAt: null,
    arrivedAt: null,
    completedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    notes: 'note',
    deliveryNotes: null,
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-01T11:00:00.000Z',
    linked: {
      applicationId: 'app-1',
      applicationNumber: 'APP-1',
      leadId: 'lead-1',
      clientId: 'client-1',
      clientName: 'ООО Тест',
      clientCompany: 'ООО Тест',
      clientPhone: '+70000000000',
      responsibleManagerId: 'mgr-1',
      responsibleManagerName: 'Менеджер',
      applicationItemId: 'item-1',
      positionLabel: 'Кран 25т',
      quantity: 1,
      equipmentTypeId: 'eq-1',
      equipmentTypeLabel: 'Кран',
      equipmentUnitId: 'unit-1',
      equipmentUnitLabel: 'CAT-01',
      equipmentUnitPlate: null,
      subcontractorId: null,
      subcontractorLabel: null,
      address: 'Москва',
      plannedStart: '2026-05-10T10:00:00.000Z',
      plannedEnd: '2026-05-10T18:00:00.000Z',
      plannedDate: '2026-05-10',
      plannedTimeFrom: '10:00',
      plannedTimeTo: '18:00',
      reservationComment: null,
    },
    completion: null,
    linkedIds: LINKED_IDS,
    derived: {
      alert: 'none',
      canStart: true,
      canArrive: false,
      canComplete: false,
    },
    ...patch,
  };
}

function buildCompletionApi(patch: Partial<CompletionApi> = {}): CompletionApi {
  return {
    id: 'cmp-1',
    departureId: 'dep-1',
    outcome: 'completed',
    completionNote: 'done',
    unqualifiedReason: null,
    completedById: 'mgr-1',
    completedByName: 'Менеджер',
    completedAt: '2026-05-11T19:00:00.000Z',
    linked: {
      reservationId: 'rsv-1',
      applicationId: 'app-1',
      applicationNumber: 'APP-1',
      leadId: 'lead-1',
      clientId: 'client-1',
      clientName: 'ООО Тест',
      clientCompany: 'ООО Тест',
      clientPhone: '+70000000000',
      responsibleManagerId: 'mgr-1',
      responsibleManagerName: 'Менеджер',
      applicationItemId: 'item-1',
      positionLabel: 'Кран 25т',
      quantity: 1,
      equipmentTypeId: 'eq-1',
      equipmentTypeLabel: 'Кран',
      equipmentUnitId: 'unit-1',
      equipmentUnitLabel: 'CAT-01',
      subcontractorId: null,
      subcontractorLabel: null,
    },
    context: {
      plannedStart: '2026-05-10T10:00:00.000Z',
      plannedEnd: '2026-05-10T18:00:00.000Z',
      scheduledAt: '2026-05-11T09:00:00.000Z',
      startedAt: '2026-05-11T09:10:00.000Z',
      arrivedAt: '2026-05-11T10:00:00.000Z',
      address: 'Москва',
      plannedDate: '2026-05-10',
      plannedTimeFrom: '10:00',
      plannedTimeTo: '18:00',
      deliveryNotes: null,
      cancellationReason: null,
    },
    linkedIds: {
      ...LINKED_IDS,
      completionId: 'cmp-1',
    },
    derived: {
      status: 'completed',
      alert: 'none',
    },
    ...patch,
  };
}

describe('Reservation/Departure adapters (QA-REQ-014, QA-REQ-028, QA-REQ-031)', () => {
  it('maps reservation row and entity with conflict payload', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-01T11:10:00.000Z').getTime());

    const row = toReservationRow(
      buildReservationApi({
        internalStage: 'subcontractor_selected',
        source: 'subcontractor',
      }),
    );

    expect(row.lead.reservationStage).toBe('subcontractor');
    expect(row.reservation.linked.plannedTime).toBe('10:00–18:00');

    const entity = toReservationEntity(
      buildReservationApi({
        hasConflict: true,
        conflict: {
          id: 'conf-1',
          summary: 'Пересечение',
          conflictingReservationId: 'rsv-2',
          conflictingAt: '2026-05-10T09:00:00.000Z',
        },
      }),
    );

    expect(entity.conflict?.summary).toBe('Пересечение');
    expect(entity.lastActivity).toBe('1 ч назад');
  });

  it('maps departure status and completion stages', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-11T08:00:00.000Z').getTime());

    const overdue = toDepartureLead(buildDepartureApi({ derived: { alert: 'stale', canStart: true, canArrive: false, canComplete: false } }));
    const soon = toDepartureLead(buildDepartureApi({ scheduledAt: '2026-05-11T12:00:00.000Z' }));
    const awaiting = toDepartureLead(buildDepartureApi({ scheduledAt: '2026-05-13T12:00:00.000Z' }));

    expect(overdue.departureStatus).toBe('overdue');
    expect(soon.departureStatus).toBe('soon');
    expect(awaiting.departureStatus).toBe('awaiting');

    const completedLead = toCompletionLeadFromDeparture(
      buildDepartureApi({ completion: { id: 'cmp-1', outcome: 'completed', completedAt: '2026-05-11T20:00:00.000Z' } }),
    );
    const unqualifiedLead = toCompletionLeadFromDeparture(
      buildDepartureApi({
        cancellationReason: null,
        completion: { id: 'cmp-2', outcome: 'unqualified', completedAt: '2026-05-11T20:00:00.000Z' },
      }),
    );

    expect(completedLead.stage).toBe('completed');
    expect(unqualifiedLead.stage).toBe('unqualified');
    expect(unqualifiedLead.completionReason).toBe('Некачественный заказ');
  });

  it('maps completion payload fallback for time-window and unqualified reason', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-11T20:10:00.000Z').getTime());

    const withDirectWindow = toCompletionLeadFromCompletion(buildCompletionApi());
    const withDerivedWindow = toCompletionLeadFromCompletion(
      buildCompletionApi({
        outcome: 'unqualified',
        unqualifiedReason: null,
        context: {
          ...buildCompletionApi().context,
          plannedDate: null,
          plannedTimeFrom: null,
          plannedTimeTo: null,
        },
      }),
    );

    expect(withDirectWindow.timeWindow).toBe('10:00-18:00');
    expect(withDerivedWindow.timeWindow).toBe('10:00-18:00');
    expect(withDerivedWindow.completionReason).toBe('Некачественный заказ');
  });

  it('maps reservation stage variants and list conversion helper', () => {
    const stageCases: Array<{
      input: Partial<ReservationApi>;
      expected: string;
    }> = [
      { input: { internalStage: 'ready_for_departure' }, expected: 'ready' },
      { input: { internalStage: 'unit_defined' }, expected: 'unit_confirmed' },
      { input: { internalStage: 'type_reserved' }, expected: 'type_reserved' },
      { input: { internalStage: 'subcontractor_selected' }, expected: 'subcontractor' },
      {
        input: { internalStage: 'searching_subcontractor', source: 'subcontractor' },
        expected: 'subcontractor',
      },
      {
        input: { internalStage: 'searching_own_equipment', source: 'own' },
        expected: 'own_equipment',
      },
    ];

    for (const c of stageCases) {
      const row = toReservationRow(buildReservationApi(c.input));
      expect(row.lead.reservationStage).toBe(c.expected);
    }

    const rows = toReservationRows([
      buildReservationApi({ id: 'rsv-1' }),
      buildReservationApi({ id: 'rsv-2', internalStage: 'type_reserved' }),
    ]);

    expect(rows).toHaveLength(2);
    expect(rows.map((x) => x.reservation.id)).toEqual(['rsv-1', 'rsv-2']);
  });

  it('maps reservation row/entity fallbacks for optional values', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-05T12:00:00.000Z').getTime());

    const fallbackRow = toReservationRow(
      buildReservationApi({
        responsibleManagerName: null,
        reservedByName: null,
        clientName: null,
        clientCompany: null,
        clientPhone: null,
        equipmentTypeLabel: null,
        leadId: null,
        clientId: null,
        applicationNumber: null,
        equipmentUnitId: null,
        equipmentUnitLabel: null,
        subcontractorLabel: null,
        releasedAt: '2026-05-04T10:00:00.000Z',
        releaseReason: 'test',
        comment: 'note',
        updatedAt: '2026-05-02T12:00:00.000Z',
      }),
    );

    expect(fallbackRow.lead.manager).toBe('—');
    expect(fallbackRow.reservation.reservedBy).toBe('—');
    expect(fallbackRow.lead.client).toBe('—');
    expect(fallbackRow.lead.phone).toBe('');
    expect(fallbackRow.lead.equipmentType).toBe('Кран 25т');
    expect(fallbackRow.lead.id).toBe('item-1');
    expect(fallbackRow.reservation.reservationType).toBe('equipment_type');
    expect(fallbackRow.reservation.linked.applicationTitle).toBe('Заявка');
    expect(fallbackRow.reservation.linked.clientId).toBe('');
    expect(fallbackRow.reservation.linked.leadId).toBeUndefined();
    expect(fallbackRow.reservation.releasedAt).toBe('2026-05-04T10:00:00.000Z');
    expect(fallbackRow.reservation.releaseReason).toBe('test');
    expect(fallbackRow.reservation.comment).toBe('note');
    expect(fallbackRow.lead.lastActivity).toBe('3 дн назад');

    const fallbackEntity = toReservationEntity(
      buildReservationApi({
        id: 'rsv-entity-fallback',
        applicationNumber: null,
        equipmentUnitId: null,
        equipmentUnitLabel: null,
        createdAt: 'not-a-date',
        releasedAt: 'also-not-a-date',
        conflict: null,
        hasConflict: false,
      }),
    );

    expect(fallbackEntity.reservedAt).toBe('not-a-date');
    expect(fallbackEntity.releasedAt).toBe('also-not-a-date');
    expect(fallbackEntity.conflict).toBeUndefined();
    expect(fallbackEntity.reservationType).toBe('equipment_type');
    expect(fallbackEntity.linked.applicationTitle).toBe('Заявка');
  });

  it('maps reservation humanized labels for minute/hour/day branches', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-05T12:00:00.000Z').getTime());

    const justNow = toReservationRow(
      buildReservationApi({
        id: 'rsv-human-0',
        updatedAt: '2026-05-05T11:59:40.000Z',
      }),
    );
    const minutes = toReservationRow(
      buildReservationApi({
        id: 'rsv-human-1',
        updatedAt: '2026-05-05T11:30:00.000Z',
      }),
    );
    const oneDayEntity = toReservationEntity(
      buildReservationApi({
        id: 'rsv-human-2',
        updatedAt: '2026-05-04T12:00:00.000Z',
      }),
    );

    expect(justNow.lead.lastActivity).toBe('только что');
    expect(minutes.lead.lastActivity).toBe('30 мин назад');
    expect(oneDayEntity.lastActivity).toBe('1 день назад');
  });

  it('maps reservation entity nullish fallbacks for linked client/manager fields', () => {
    const fallbackEntity = toReservationEntity(
      buildReservationApi({
        id: 'rsv-entity-nullish',
        responsibleManagerName: null,
        reservedByName: null,
        clientName: null,
        clientCompany: null,
        clientId: null,
        leadId: null,
        equipmentTypeLabel: null,
      }),
    );

    expect(fallbackEntity.reservedBy).toBe('—');
    expect(fallbackEntity.linked.clientName).toBe('—');
    expect(fallbackEntity.linked.clientCompany).toBeUndefined();
    expect(fallbackEntity.linked.clientId).toBe('');
    expect(fallbackEntity.linked.leadId).toBeUndefined();
    expect(fallbackEntity.linked.equipmentType).toBe('Кран 25т');
  });

  it('maps departure status edge cases and planned date/time fallbacks', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-11T10:00:00.000Z').getTime());

    const inTransit = toDepartureLead(
      buildDepartureApi({ status: 'in_transit', derived: { alert: 'none', canStart: false, canArrive: true, canComplete: false } }),
    );
    const arrived = toDepartureLead(
      buildDepartureApi({ status: 'arrived', derived: { alert: 'none', canStart: false, canArrive: false, canComplete: true } }),
    );
    const pastScheduled = toDepartureLead(
      buildDepartureApi({ status: 'scheduled', scheduledAt: '2026-05-11T09:00:00.000Z', derived: { alert: 'none', canStart: true, canArrive: false, canComplete: false } }),
    );
    const invalidScheduled = toDepartureLead(
      buildDepartureApi({ status: 'scheduled', scheduledAt: 'invalid-date', derived: { alert: 'none', canStart: true, canArrive: false, canComplete: false } }),
    );
    const fallbackStatus = toDepartureLead(
      buildDepartureApi({ status: 'completed', derived: { alert: 'none', canStart: false, canArrive: false, canComplete: false } }),
    );

    expect(inTransit.departureStatus).toBe('today');
    expect(arrived.departureStatus).toBe('today');
    expect(pastScheduled.departureStatus).toBe('overdue');
    expect(invalidScheduled.departureStatus).toBe('awaiting');
    expect(fallbackStatus.departureStatus).toBe('awaiting');

    const withPlannedStartOnly = toDepartureLead(
      buildDepartureApi({
        linked: {
          ...buildDepartureApi().linked,
          plannedDate: null,
          plannedTimeFrom: null,
          plannedTimeTo: null,
          plannedStart: '2026-05-14T09:00:00.000Z',
          plannedEnd: '2026-05-14T12:00:00.000Z',
        },
      }),
    );
    expect(withPlannedStartOnly.date).toBe('2026-05-14');
    expect(withPlannedStartOnly.timeWindow).toBe('09:00-12:00');

    const withScheduleFallback = toDepartureLead(
      buildDepartureApi({
        scheduledAt: '2026-05-20T08:30:00.000Z',
        linked: {
          ...buildDepartureApi().linked,
          plannedDate: null,
          plannedStart: null,
          plannedEnd: null,
          plannedTimeFrom: null,
          plannedTimeTo: null,
        },
      }),
    );
    expect(withScheduleFallback.date).toBe('2026-05-20');
    expect(withScheduleFallback.timeWindow).toBeUndefined();

    const withSingleTimeField = toDepartureLead(
      buildDepartureApi({
        updatedAt: '2026-05-11T09:59:40.000Z',
        linked: {
          ...buildDepartureApi().linked,
          plannedTimeFrom: '09:00',
          plannedTimeTo: null,
        },
      }),
    );

    expect(withSingleTimeField.timeWindow).toBe('09:00');
    expect(withSingleTimeField.lastActivity).toBe('только что');

    const fullyEmptyDate = toDepartureLead(
      buildDepartureApi({
        scheduledAt: null,
        notes: null,
        linked: {
          ...buildDepartureApi().linked,
          clientId: null,
          clientName: null,
          clientCompany: null,
          clientPhone: null,
          responsibleManagerName: null,
          equipmentTypeLabel: null,
          equipmentUnitLabel: null,
          subcontractorLabel: null,
          address: null,
          plannedDate: null,
          plannedStart: null,
          plannedEnd: null,
          plannedTimeFrom: null,
          plannedTimeTo: null,
        },
        updatedAt: '2026-05-11T09:50:00.000Z',
      }),
    );

    expect(fullyEmptyDate.apiClientId).toBeUndefined();
    expect(fullyEmptyDate.client).toBe('—');
    expect(fullyEmptyDate.company).toBeUndefined();
    expect(fullyEmptyDate.phone).toBe('');
    expect(fullyEmptyDate.equipmentType).toBe('Кран 25т');
    expect(fullyEmptyDate.equipmentUnit).toBeUndefined();
    expect(fullyEmptyDate.subcontractor).toBeUndefined();
    expect(fullyEmptyDate.manager).toBe('—');
    expect(fullyEmptyDate.date).toBeUndefined();
    expect(fullyEmptyDate.address).toBeUndefined();
    expect(fullyEmptyDate.comment).toBeUndefined();
    expect(fullyEmptyDate.lastActivity).toBe('10 мин назад');
  });

  it('maps completion branches for missing completion and explicit cancellation reason', () => {
    const noCompletion = toCompletionLeadFromDeparture(
      buildDepartureApi({ completion: null }),
    );
    expect(noCompletion.stage).toBe('departure');
    expect(noCompletion.completionDate).toBeUndefined();
    expect(noCompletion.completionReason).toBeUndefined();

    const unqualifiedWithReason = toCompletionLeadFromDeparture(
      buildDepartureApi({
        cancellationReason: 'Причина оператора',
        completion: { id: 'cmp-x', outcome: 'unqualified', completedAt: '2026-05-11T20:00:00.000Z' },
      }),
    );
    expect(unqualifiedWithReason.completionReason).toBe('Причина оператора');
  });

  it('maps completion payload when no time window is available', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-20T20:00:00.000Z').getTime());

    const noWindow = toCompletionLeadFromCompletion(
      buildCompletionApi({
        context: {
          ...buildCompletionApi().context,
          plannedDate: '2026-05-10',
          plannedTimeFrom: null,
          plannedTimeTo: null,
          plannedStart: null,
          plannedEnd: null,
        },
      }),
    );

    expect(noWindow.timeWindow).toBeUndefined();
    expect(noWindow.date).toBe('2026-05-10');
    expect(noWindow.lastActivity).toBe('9 дн назад');
  });

  it('maps completion payload with nullable linked fields and minimal context', () => {
    const minimal = toCompletionLeadFromCompletion(
      buildCompletionApi({
        outcome: 'completed',
        linked: {
          ...buildCompletionApi().linked,
          clientId: null,
          clientName: null,
          clientCompany: null,
          clientPhone: null,
          responsibleManagerName: null,
          equipmentTypeLabel: null,
          equipmentUnitLabel: null,
          subcontractorLabel: null,
        },
        context: {
          ...buildCompletionApi().context,
          plannedDate: null,
          plannedStart: '2026-05-12T08:00:00.000Z',
          plannedEnd: null,
          plannedTimeFrom: null,
          plannedTimeTo: null,
          address: null,
        },
        completionNote: null,
      }),
    );

    expect(minimal.apiClientId).toBeUndefined();
    expect(minimal.client).toBe('—');
    expect(minimal.company).toBeUndefined();
    expect(minimal.phone).toBe('');
    expect(minimal.manager).toBe('—');
    expect(minimal.equipmentType).toBe('Кран 25т');
    expect(minimal.equipmentUnit).toBeUndefined();
    expect(minimal.subcontractor).toBeUndefined();
    expect(minimal.date).toBe('2026-05-12');
    expect(minimal.timeWindow).toBeUndefined();
    expect(minimal.address).toBeUndefined();
    expect(minimal.comment).toBeUndefined();
    expect(minimal.completionReason).toBeUndefined();
  });
});
