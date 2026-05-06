import { describe, expect, it, vi } from 'vitest';
import { toKanbanLead } from '../leadAdapter';
import { toUiApplication } from '../applicationAdapter';
import type { LeadApi } from '../leadsApi';
import type { ApplicationApi, ApplicationItemApi } from '../applicationsApi';

const LINKED_IDS = {
  leadId: null,
  applicationId: null,
  reservationId: null,
  departureId: null,
  completionId: null,
  clientId: null,
  applicationItemId: null,
};

function buildLeadApi(patch: Partial<LeadApi> = {}): LeadApi {
  return {
    id: 'lead-1',
    stage: 'lead',
    source: 'manual',
    sourceLabel: 'Manual',
    contactName: 'Иван',
    contactCompany: null,
    contactPhone: '+70000000000',
    phoneNormalized: '70000000000',
    equipmentTypeHint: 'Экскаватор',
    requestedDate: '2026-05-10',
    timeWindow: '10:00-12:00',
    address: 'Москва',
    comment: 'Комментарий',
    managerId: 'mgr-1',
    managerName: 'Менеджер',
    manager: { id: 'mgr-1', fullName: 'Менеджер' },
    clientId: 'client-1',
    client: { id: 'client-1', name: 'Иван', company: null },
    isDuplicate: false,
    isUrgent: false,
    isStale: false,
    hasNoContact: false,
    incompleteData: false,
    missingFields: [],
    unqualifiedReason: null,
    lastActivityAt: '2026-05-06T12:00:00.000Z',
    createdAt: '2026-05-05T12:00:00.000Z',
    updatedAt: '2026-05-06T12:00:00.000Z',
    linkedIds: LINKED_IDS,
    ...patch,
  };
}

function buildItem(patch: Partial<ApplicationItemApi> = {}): ApplicationItemApi {
  return {
    id: 'item-1',
    applicationId: 'app-1',
    equipmentTypeId: 'eq-1',
    equipmentTypeLabel: 'Кран',
    quantity: 2,
    shiftCount: 3,
    overtimeHours: null,
    downtimeHours: null,
    plannedDate: '2026-05-10',
    plannedTimeFrom: '10:00',
    plannedTimeTo: '18:00',
    address: 'Москва',
    comment: 'Позиция',
    sourcingType: 'own',
    pricePerShift: '10000',
    deliveryPrice: '5000',
    surcharge: '1000',
    readyForReservation: true,
    status: 'reserved',
    unit: 'CAT-01',
    subcontractor: null,
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-02T10:00:00.000Z',
    ...patch,
  };
}

function buildApplicationApi(patch: Partial<ApplicationApi> = {}): ApplicationApi {
  return {
    id: 'app-1',
    number: 'APP-000001',
    stage: 'application',
    leadId: 'lead-1',
    clientId: 'client-1',
    clientName: 'ООО Тест',
    clientCompany: 'ООО Тест',
    clientPhone: '+70000000000',
    responsibleManagerId: 'mgr-1',
    responsibleManagerName: 'Менеджер',
    requestedDate: '2026-05-10',
    requestedTimeFrom: '09:00',
    requestedTimeTo: '12:00',
    address: 'Москва',
    comment: 'Комментарий',
    isUrgent: false,
    deliveryMode: 'delivery',
    nightWork: false,
    isActive: true,
    cancelledAt: null,
    completedAt: null,
    lastActivityAt: '2026-05-06T12:00:00.000Z',
    createdAt: '2026-05-01T12:00:00.000Z',
    updatedAt: '2026-05-06T12:00:00.000Z',
    positions: [buildItem()],
    positionsTotal: 1,
    positionsReserved: 1,
    positionsReady: 1,
    hasAnyConflict: false,
    dominantSourcing: 'own',
    equipmentSummary: 'Кран x2',
    subcontractorSummary: null,
    applicationGroup: 'in_reservation_work',
    readyForDeparture: false,
    linkedIds: LINKED_IDS,
    ...patch,
  };
}

describe('Lead/Application adapters (QA-REQ-028, QA-REQ-030, QA-REQ-031)', () => {
  it('maps LeadApi to Kanban Lead including fallback fields', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-06T12:00:30.000Z').getTime());

    const lead = toKanbanLead(
      buildLeadApi({
        equipmentTypeHint: null,
        managerName: null,
        clientId: null,
      }),
    );

    expect(lead.equipmentType).toBe('—');
    expect(lead.manager).toBe('—');
    expect(lead.apiClientId).toBeUndefined();
    expect(lead.lastActivity).toBe('только что');
  });

  it('maps LeadApi humanized time for hours and days', () => {
    const now = new Date('2026-05-06T15:00:00.000Z').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const thirtyMinutesLead = toKanbanLead(buildLeadApi({ lastActivityAt: '2026-05-06T14:30:00.000Z' }));
    const oneHourLead = toKanbanLead(buildLeadApi({ lastActivityAt: '2026-05-06T14:00:00.000Z' }));
    const oneDayLead = toKanbanLead(buildLeadApi({ lastActivityAt: '2026-05-05T15:00:00.000Z' }));

    expect(thirtyMinutesLead.lastActivity).toBe('30 мин назад');
    expect(oneHourLead.lastActivity).toBe('1 ч назад');
    expect(oneDayLead.lastActivity).toBe('1 день назад');
  });

  it('maps application stage conversion and position money parsing', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-08T12:00:00.000Z').getTime());

    const unqualified = toUiApplication(buildApplicationApi({ stage: 'unqualified' }));
    const leadStage = toUiApplication(
      buildApplicationApi({
        stage: 'lead',
        positions: [buildItem({ pricePerShift: '12,5', deliveryPrice: null, surcharge: 'bad' })],
      }),
    );

    expect(unqualified.stage).toBe('cancelled');
    expect(leadStage.stage).toBe('application');
    expect(leadStage.positions[0].pricePerShift).toBe(12.5);
    expect(leadStage.positions[0].deliveryPrice).toBeUndefined();
    expect(leadStage.positions[0].surcharge).toBeUndefined();
  });

  it('maps lead optional fields to undefined and supports long humanized labels', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-10T12:00:00.000Z').getTime());

    const lead = toKanbanLead(
      buildLeadApi({
        lastActivityAt: '2026-05-07T12:00:00.000Z',
        requestedDate: null,
        timeWindow: null,
        address: null,
        comment: null,
        contactCompany: 'ООО Тест',
      }),
    );

    expect(lead.lastActivity).toBe('3 дн назад');
    expect(lead.date).toBeUndefined();
    expect(lead.timeWindow).toBeUndefined();
    expect(lead.address).toBeUndefined();
    expect(lead.comment).toBeUndefined();
    expect(lead.company).toBe('ООО Тест');
  });

  it('maps all explicit application stages and conflict reservation state', () => {
    const explicitStages: ApplicationApi['stage'][] = [
      'application',
      'reservation',
      'departure',
      'completed',
      'cancelled',
    ];

    for (const stage of explicitStages) {
      const projected = toUiApplication(buildApplicationApi({ stage }));
      expect(projected.stage).toBe(stage);
    }

    const withConflict = toUiApplication(
      buildApplicationApi({
        stage: 'reservation',
        positions: [
          buildItem({
            status: 'conflict',
            overtimeHours: null,
            downtimeHours: null,
            plannedDate: null,
            plannedTimeFrom: null,
            plannedTimeTo: null,
            address: null,
            comment: null,
            subcontractor: null,
            unit: null,
            pricePerShift: null,
            deliveryPrice: null,
            surcharge: null,
          }),
        ],
      }),
    );

    expect(withConflict.positions[0].reservationState).toBe('conflict');
    expect(withConflict.positions[0].overtimeHours).toBeUndefined();
    expect(withConflict.positions[0].downtimeHours).toBeUndefined();
    expect(withConflict.positions[0].plannedDate).toBeUndefined();
    expect(withConflict.positions[0].plannedTimeFrom).toBeUndefined();
    expect(withConflict.positions[0].plannedTimeTo).toBeUndefined();
    expect(withConflict.positions[0].address).toBeUndefined();
    expect(withConflict.positions[0].comment).toBeUndefined();
    expect(withConflict.positions[0].subcontractor).toBeUndefined();
    expect(withConflict.positions[0].unit).toBeUndefined();
    expect(withConflict.positions[0].pricePerShift).toBeUndefined();
    expect(withConflict.positions[0].deliveryPrice).toBeUndefined();
    expect(withConflict.positions[0].surcharge).toBeUndefined();
  });

  it('maps application optional header fields with fallback defaults', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-09T12:00:00.000Z').getTime());

    const projected = toUiApplication(
      buildApplicationApi({
        lastActivityAt: '2026-05-06T12:00:00.000Z',
        clientCompany: null,
        responsibleManagerId: null,
        responsibleManagerName: null,
        requestedDate: null,
        requestedTimeFrom: null,
        requestedTimeTo: null,
        address: null,
        comment: null,
        deliveryMode: null,
      }),
    );

    expect(projected.clientCompany).toBeUndefined();
    expect(projected.responsibleManagerId).toBeUndefined();
    expect(projected.responsibleManager).toBe('—');
    expect(projected.requestedDate).toBeUndefined();
    expect(projected.requestedTimeFrom).toBeUndefined();
    expect(projected.requestedTimeTo).toBeUndefined();
    expect(projected.address).toBeUndefined();
    expect(projected.comment).toBeUndefined();
    expect(projected.deliveryMode).toBeUndefined();
    expect(projected.lastActivity).toBe('3 дн назад');
  });

  it('maps application humanized time for minute, hour and day thresholds', () => {
    const now = new Date('2026-05-09T12:00:00.000Z').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const justNow = toUiApplication(
      buildApplicationApi({ lastActivityAt: '2026-05-09T11:59:40.000Z' }),
    );
    const minutes = toUiApplication(
      buildApplicationApi({ lastActivityAt: '2026-05-09T11:30:00.000Z' }),
    );
    const hours = toUiApplication(
      buildApplicationApi({ lastActivityAt: '2026-05-09T09:00:00.000Z' }),
    );
    const oneDay = toUiApplication(
      buildApplicationApi({ lastActivityAt: '2026-05-08T12:00:00.000Z' }),
    );

    expect(justNow.lastActivity).toBe('только что');
    expect(minutes.lastActivity).toBe('30 мин назад');
    expect(hours.lastActivity).toBe('3 ч назад');
    expect(oneDay.lastActivity).toBe('1 день назад');
  });
});
