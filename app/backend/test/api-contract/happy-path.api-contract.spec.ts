import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  TEST_MANAGER,
  ensureBaseUsers,
  loginByPassword,
} from '../helpers/auth-fixtures';
import {
  addApplicationItem,
  authHeader,
  createDeparture,
  createLeadAndApplication,
  createReservation,
  ensureEquipmentFixture,
  futureIso,
  uniquePhone,
  uniqueSeed,
} from '../helpers/domain-fixtures';
import { closeTestApp, createTestApp } from '../helpers/test-app';

describe('API Contract - Happy Path Matrix (QA-REQ: 001..024, 028..038)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await ensureBaseUsers(prisma);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('APIC-002: Lead create minimal required payload and open context contract', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const contactPhone = uniquePhone('002');

    const response = await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set('Authorization', authHeader(login.accessToken))
      .send({
        contactName: 'QA APIC-002 Lead',
        contactPhone,
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        lead: expect.any(Object),
        duplicates: expect.any(Array),
      }),
    );
    expect(response.body.lead).toMatchObject({
      contactName: 'QA APIC-002 Lead',
      contactPhone,
      stage: 'lead',
      isDuplicate: false,
    });
  });

  it('APIC-003: Duplicate warning is non-blocking contract', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const duplicatePhone = uniquePhone('003');

    await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set('Authorization', authHeader(login.accessToken))
      .send({
        contactName: 'QA APIC-003 Lead A',
        contactPhone: duplicatePhone,
      })
      .expect(201);

    const second = await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set('Authorization', authHeader(login.accessToken))
      .send({
        contactName: 'QA APIC-003 Lead B',
        contactPhone: duplicatePhone,
      })
      .expect(201);

    expect(second.body.lead.isDuplicate).toBe(true);
    expect(Array.isArray(second.body.duplicates)).toBe(true);
    expect(second.body.duplicates.length).toBeGreaterThanOrEqual(1);
  });

  it('APIC-037: Lead to Application rejects missing conversion prerequisites', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const seed = uniqueSeed('APIC037');

    const created = await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set('Authorization', authHeader(login.accessToken))
      .send({
        contactName: `QA ${seed} Lead`,
        contactPhone: uniquePhone('037'),
      })
      .expect(201);

    const leadId = created.body.lead.id as string;

    const blocked = await request(app.getHttpServer())
      .post(`/api/v1/leads/${leadId}/stage`)
      .set('Authorization', authHeader(login.accessToken))
      .send({ stage: 'application' })
      .expect(400);

    expect(String(blocked.body.message)).toContain('Для перевода в заявку заполните');

    const leadAfterBlockedTransition = await request(app.getHttpServer())
      .get(`/api/v1/leads/${leadId}`)
      .set('Authorization', authHeader(login.accessToken))
      .expect(200);

    expect(leadAfterBlockedTransition.body.stage).toBe('lead');

    const applications = await request(app.getHttpServer())
      .get('/api/v1/applications')
      .query({ leadId })
      .set('Authorization', authHeader(login.accessToken))
      .expect(200);

    expect(applications.body.total).toBe(0);
    expect(applications.body.items).toHaveLength(0);
  });

  it('APIC-004: Lead to Application relation model and single active invariant contract', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const fixture = await createLeadAndApplication(app, login.accessToken, uniqueSeed('APIC004'));
    const { leadId } = fixture;
    expect(leadId).toEqual(expect.any(String));

    const leadAfterTransition = await request(app.getHttpServer())
      .get(`/api/v1/leads/${leadId}`)
      .set('Authorization', authHeader(login.accessToken))
      .expect(200);

    expect(leadAfterTransition.body.clientId).toEqual(expect.any(String));
    expect(leadAfterTransition.body.client).toEqual(
      expect.objectContaining({
        id: leadAfterTransition.body.clientId,
      }),
    );

    const applicationsBeforeInvalidTransition = await request(app.getHttpServer())
      .get('/api/v1/applications')
      .query({ leadId })
      .set('Authorization', authHeader(login.accessToken))
      .expect(200);

    expect(applicationsBeforeInvalidTransition.body.total).toBe(1);
    expect(applicationsBeforeInvalidTransition.body.items).toHaveLength(1);
    expect(applicationsBeforeInvalidTransition.body.items[0]).toMatchObject({
      leadId,
      isActive: true,
      stage: 'application',
    });

    await request(app.getHttpServer())
      .post(`/api/v1/leads/${leadId}/stage`)
      .set('Authorization', authHeader(login.accessToken))
      .send({ stage: 'application' })
      .expect(400);

    const applicationsAfterInvalidTransition = await request(app.getHttpServer())
      .get('/api/v1/applications')
      .query({ leadId })
      .set('Authorization', authHeader(login.accessToken))
      .expect(200);

    expect(applicationsAfterInvalidTransition.body.total).toBe(1);
    expect(applicationsAfterInvalidTransition.body.items).toHaveLength(1);
    const activeCount = applicationsAfterInvalidTransition.body.items.filter(
      (item: { isActive: boolean }) => item.isActive,
    ).length;
    expect(activeCount).toBe(1);
  });

  it('APIC-038: Application to Reservation stage requires an active Reservation entity', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const seed = uniqueSeed('APIC038');
    const equipment = await ensureEquipmentFixture(prisma, seed);
    const fixture = await createLeadAndApplication(app, login.accessToken, seed);

    const blocked = await request(app.getHttpServer())
      .post(`/api/v1/leads/${fixture.leadId}/stage`)
      .set('Authorization', authHeader(login.accessToken))
      .send({ stage: 'reservation' })
      .expect(400);

    expect(String(blocked.body.message)).toContain('Сначала создайте бронь');

    const leadAfterBlockedTransition = await request(app.getHttpServer())
      .get(`/api/v1/leads/${fixture.leadId}`)
      .set('Authorization', authHeader(login.accessToken))
      .expect(200);
    expect(leadAfterBlockedTransition.body.stage).toBe('application');

    const applicationAfterBlockedTransition = await request(app.getHttpServer())
      .get(`/api/v1/applications/${fixture.applicationId}`)
      .set('Authorization', authHeader(login.accessToken))
      .expect(200);
    expect(applicationAfterBlockedTransition.body.stage).toBe('application');

    const item = await addApplicationItem(app, login.accessToken, fixture.applicationId, {
      equipmentTypeId: equipment.equipmentTypeId,
      equipmentTypeLabel: 'QA APIC-038 Position',
      quantity: 1,
      plannedDate: futureIso(120),
      plannedTimeFrom: '09:00',
      plannedTimeTo: '18:00',
      address: 'QA APIC-038 Address',
      sourcingType: 'own',
      readyForReservation: true,
    });

    await createReservation(app, login.accessToken, {
      applicationItemId: item.id,
      sourcingType: 'own',
      equipmentTypeId: equipment.equipmentTypeId,
      plannedStart: futureIso(180),
      plannedEnd: futureIso(300),
    });

    const moved = await request(app.getHttpServer())
      .post(`/api/v1/leads/${fixture.leadId}/stage`)
      .set('Authorization', authHeader(login.accessToken))
      .send({ stage: 'reservation' })
      .expect(201);

    expect(moved.body.stage).toBe('reservation');

    const applicationAfterMove = await request(app.getHttpServer())
      .get(`/api/v1/applications/${fixture.applicationId}`)
      .set('Authorization', authHeader(login.accessToken))
      .expect(200);
    expect(applicationAfterMove.body.stage).toBe('reservation');
  });

  it('APIC-005: Application item readiness and source policy contract', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const fixture = await createLeadAndApplication(app, login.accessToken, uniqueSeed('APIC005'));

    const itemA = await addApplicationItem(app, login.accessToken, fixture.applicationId, {
      equipmentTypeLabel: 'QA APIC-005 Type A',
      quantity: 2,
      plannedDate: futureIso(60),
      plannedTimeFrom: '09:00',
      plannedTimeTo: '18:00',
      address: 'QA APIC-005 Address A',
      sourcingType: 'own',
      readyForReservation: true,
    });

    const itemB = await addApplicationItem(app, login.accessToken, fixture.applicationId, {
      equipmentTypeLabel: 'QA APIC-005 Type B',
      quantity: 1,
      plannedDate: futureIso(90),
      plannedTimeFrom: '10:00',
      plannedTimeTo: '17:00',
      address: 'QA APIC-005 Address B',
      sourcingType: 'subcontractor',
      readyForReservation: true,
    });

    const application = await request(app.getHttpServer())
      .get(`/api/v1/applications/${fixture.applicationId}`)
      .set('Authorization', authHeader(login.accessToken))
      .expect(200);

    expect(application.body.positions).toEqual(expect.any(Array));
    expect(application.body.positions.length).toBeGreaterThanOrEqual(2);
    expect(application.body.positions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: itemA.id, readyForReservation: true, sourcingType: 'own' }),
        expect.objectContaining({
          id: itemB.id,
          readyForReservation: true,
          sourcingType: 'subcontractor',
        }),
      ]),
    );

    const invalid = await request(app.getHttpServer())
      .post(`/api/v1/applications/${fixture.applicationId}/items`)
      .set('Authorization', authHeader(login.accessToken))
      .send({
        equipmentTypeLabel: 'QA APIC-005 Invalid',
        quantity: 1,
        plannedDate: futureIso(120),
        plannedTimeFrom: '09:00',
        plannedTimeTo: '18:00',
        address: 'QA APIC-005 Invalid Address',
        sourcingType: 'undecided',
        readyForReservation: true,
      })
      .expect(400);

    expect(String(invalid.body.message)).toContain('sourcingType');
  });

  it('APIC-006: Reservation source and conflict warning contract', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const seed = uniqueSeed('APIC006');
    const equipment = await ensureEquipmentFixture(prisma, seed);
    const fixture = await createLeadAndApplication(app, login.accessToken, seed);

    const itemA = await addApplicationItem(app, login.accessToken, fixture.applicationId, {
      equipmentTypeId: equipment.equipmentTypeId,
      equipmentTypeLabel: 'QA APIC-006 Position A',
      quantity: 1,
      readyForReservation: false,
    });

    const itemB = await addApplicationItem(app, login.accessToken, fixture.applicationId, {
      equipmentTypeId: equipment.equipmentTypeId,
      equipmentTypeLabel: 'QA APIC-006 Position B',
      quantity: 1,
      readyForReservation: false,
    });

    const firstReservation = await createReservation(app, login.accessToken, {
      applicationItemId: itemA.id,
      sourcingType: 'own',
      equipmentUnitId: equipment.equipmentUnitId,
      plannedStart: futureIso(180),
      plannedEnd: futureIso(300),
    });

    expect(firstReservation.body).toMatchObject({
      hasConflict: false,
      source: 'own',
    });

    const conflictingReservation = await createReservation(app, login.accessToken, {
      applicationItemId: itemB.id,
      sourcingType: 'own',
      equipmentUnitId: equipment.equipmentUnitId,
      plannedStart: futureIso(210),
      plannedEnd: futureIso(330),
    });

    expect(conflictingReservation.body.hasConflict).toBe(true);
    expect(conflictingReservation.body.conflict).toEqual(expect.any(Object));
  });

  it('APIC-007: Unit required before reservation to departure transition contract', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const seed = uniqueSeed('APIC007');
    const fixture = await createLeadAndApplication(app, login.accessToken, seed);

    const item = await addApplicationItem(app, login.accessToken, fixture.applicationId, {
      equipmentTypeLabel: 'QA APIC-007 Position',
      quantity: 1,
      readyForReservation: false,
    });

    const reservation = await createReservation(app, login.accessToken, {
      applicationItemId: item.id,
      sourcingType: 'own',
      plannedStart: futureIso(240),
      plannedEnd: futureIso(360),
    });

    const noUnitDeparture = await createDeparture(
      app,
      login.accessToken,
      {
        reservationId: reservation.body.id,
        scheduledAt: futureIso(270),
      },
      400,
    );

    expect(String(noUnitDeparture.body.message)).toContain('equipment unit');

    const equipment = await ensureEquipmentFixture(prisma, seed);
    await request(app.getHttpServer())
      .patch(`/api/v1/reservations/${reservation.body.id}`)
      .set('Authorization', authHeader(login.accessToken))
      .send({
        equipmentUnitId: equipment.equipmentUnitId,
      })
      .expect(200);

    const withUnitDeparture = await createDeparture(app, login.accessToken, {
      reservationId: reservation.body.id,
      scheduledAt: futureIso(280),
    });

    expect(withUnitDeparture.body.status).toBe('scheduled');
  });

  it('APIC-008: Departure lifecycle status contract', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const seed = uniqueSeed('APIC008');
    const equipment = await ensureEquipmentFixture(prisma, seed);
    const fixture = await createLeadAndApplication(app, login.accessToken, seed);

    const itemA = await addApplicationItem(app, login.accessToken, fixture.applicationId, {
      equipmentTypeId: equipment.equipmentTypeId,
      equipmentTypeLabel: 'QA APIC-008 Position A',
      quantity: 1,
      readyForReservation: false,
    });

    const reservationA = await createReservation(app, login.accessToken, {
      applicationItemId: itemA.id,
      sourcingType: 'own',
      equipmentUnitId: equipment.equipmentUnitId,
      plannedStart: futureIso(300),
      plannedEnd: futureIso(420),
    });

    const departureA = await createDeparture(app, login.accessToken, {
      reservationId: reservationA.body.id,
      scheduledAt: futureIso(320),
    });

    expect(departureA.body.status).toBe('scheduled');

    const started = await request(app.getHttpServer())
      .post(`/api/v1/departures/${departureA.body.id}/start`)
      .set('Authorization', authHeader(login.accessToken))
      .expect(201);
    expect(started.body.status).toBe('in_transit');

    const arrived = await request(app.getHttpServer())
      .post(`/api/v1/departures/${departureA.body.id}/arrive`)
      .set('Authorization', authHeader(login.accessToken))
      .expect(201);
    expect(arrived.body.status).toBe('arrived');

    const completed = await request(app.getHttpServer())
      .post(`/api/v1/departures/${departureA.body.id}/complete`)
      .set('Authorization', authHeader(login.accessToken))
      .send({ outcome: 'completed' })
      .expect(201);
    expect(completed.body.status).toBe('completed');

    const cancelSeed = uniqueSeed('APIC008CANCEL');
    const cancelEquipment = await ensureEquipmentFixture(prisma, cancelSeed);
    const cancelFixture = await createLeadAndApplication(app, login.accessToken, cancelSeed);

    const itemB = await addApplicationItem(app, login.accessToken, cancelFixture.applicationId, {
      equipmentTypeId: cancelEquipment.equipmentTypeId,
      equipmentTypeLabel: 'QA APIC-008 Position B',
      quantity: 1,
      readyForReservation: false,
    });

    const reservationB = await createReservation(app, login.accessToken, {
      applicationItemId: itemB.id,
      sourcingType: 'own',
      equipmentUnitId: cancelEquipment.equipmentUnitId,
      plannedStart: futureIso(500),
      plannedEnd: futureIso(620),
    });

    const departureB = await createDeparture(app, login.accessToken, {
      reservationId: reservationB.body.id,
      scheduledAt: futureIso(510),
    });

    const cancelled = await request(app.getHttpServer())
      .post(`/api/v1/departures/${departureB.body.id}/cancel`)
      .set('Authorization', authHeader(login.accessToken))
      .send({ reason: 'qa_cancel' })
      .expect(201);

    expect(cancelled.body.status).toBe('cancelled');
  });

  it('APIC-009: Completion cascade and audit contract', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const seed = uniqueSeed('APIC009');
    const equipment = await ensureEquipmentFixture(prisma, seed);
    const fixture = await createLeadAndApplication(app, login.accessToken, seed);

    const item = await addApplicationItem(app, login.accessToken, fixture.applicationId, {
      equipmentTypeId: equipment.equipmentTypeId,
      equipmentTypeLabel: 'QA APIC-009 Position',
      quantity: 1,
      readyForReservation: false,
    });

    const reservation = await createReservation(app, login.accessToken, {
      applicationItemId: item.id,
      sourcingType: 'own',
      equipmentUnitId: equipment.equipmentUnitId,
      plannedStart: futureIso(360),
      plannedEnd: futureIso(480),
    });

    const departure = await createDeparture(app, login.accessToken, {
      reservationId: reservation.body.id,
      scheduledAt: futureIso(380),
    });

    await request(app.getHttpServer())
      .post(`/api/v1/departures/${departure.body.id}/start`)
      .set('Authorization', authHeader(login.accessToken))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/departures/${departure.body.id}/arrive`)
      .set('Authorization', authHeader(login.accessToken))
      .expect(201);

    const completion = await request(app.getHttpServer())
      .post('/api/v1/completions')
      .set('Authorization', authHeader(login.accessToken))
      .send({
        departureId: departure.body.id,
        outcome: 'completed',
        completionNote: 'qa completion note',
      })
      .expect(201);

    const completionId = completion.body.id as string;
    expect(completion.body).toMatchObject({
      id: completionId,
      outcome: 'completed',
      departureId: departure.body.id,
    });

    const dbLead = await prisma.lead.findUnique({ where: { id: fixture.leadId } });
    const dbApplication = await prisma.application.findUnique({
      where: { id: fixture.applicationId },
    });
    const dbDeparture = await prisma.departure.findUnique({
      where: { id: departure.body.id },
    });
    const dbReservations = await prisma.reservation.findMany({
      where: { applicationItem: { applicationId: fixture.applicationId } },
    });
    const completionLog = await prisma.activityLogEntry.findFirst({
      where: {
        entityType: 'completion',
        entityId: completionId,
        action: 'completed',
        actorId: login.user.id,
      },
    });

    expect(dbLead?.stage).toBe('completed');
    expect(dbApplication?.stage).toBe('completed');
    expect(dbApplication?.isActive).toBe(false);
    expect(dbDeparture?.status).toBe('completed');
    expect(dbReservations.length).toBeGreaterThan(0);
    expect(
      dbReservations.every(
        (row) => !row.isActive && row.internalStage === 'released' && !!row.releasedAt,
      ),
    ).toBe(true);
    expect(completionLog).not.toBeNull();
  });

  it('APIC-010: Unqualified and cancelled contract', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);

    const leadOnlyFlow = await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set('Authorization', authHeader(login.accessToken))
      .send({
        contactName: 'QA APIC-010 Lead',
        contactPhone: uniquePhone('010'),
      })
      .expect(201);

    const leadId = leadOnlyFlow.body.lead.id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/leads/${leadId}/stage`)
      .set('Authorization', authHeader(login.accessToken))
      .send({ stage: 'unqualified' })
      .expect(400);

    const unqualifiedLead = await request(app.getHttpServer())
      .post(`/api/v1/leads/${leadId}/stage`)
      .set('Authorization', authHeader(login.accessToken))
      .send({ stage: 'unqualified', reason: 'qa_unqualified_lead' })
      .expect(201);

    expect(unqualifiedLead.body.stage).toBe('unqualified');
    expect(unqualifiedLead.body.unqualifiedReason).toBe('qa_unqualified_lead');

    const seed = uniqueSeed('APIC010');
    const equipment = await ensureEquipmentFixture(prisma, seed);
    const fixture = await createLeadAndApplication(app, login.accessToken, seed);

    const item = await addApplicationItem(app, login.accessToken, fixture.applicationId, {
      equipmentTypeId: equipment.equipmentTypeId,
      equipmentTypeLabel: 'QA APIC-010 Position',
      quantity: 1,
      readyForReservation: false,
    });

    const reservation = await createReservation(app, login.accessToken, {
      applicationItemId: item.id,
      sourcingType: 'own',
      equipmentUnitId: equipment.equipmentUnitId,
      plannedStart: futureIso(420),
      plannedEnd: futureIso(560),
    });

    const departure = await createDeparture(app, login.accessToken, {
      reservationId: reservation.body.id,
      scheduledAt: futureIso(440),
    });

    await request(app.getHttpServer())
      .post(`/api/v1/departures/${departure.body.id}/start`)
      .set('Authorization', authHeader(login.accessToken))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/departures/${departure.body.id}/arrive`)
      .set('Authorization', authHeader(login.accessToken))
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/completions')
      .set('Authorization', authHeader(login.accessToken))
      .send({
        departureId: departure.body.id,
        outcome: 'unqualified',
      })
      .expect(400);

    const unqualifiedCompletion = await request(app.getHttpServer())
      .post('/api/v1/completions')
      .set('Authorization', authHeader(login.accessToken))
      .send({
        departureId: departure.body.id,
        outcome: 'unqualified',
        unqualifiedReason: 'qa_unqualified_completion',
      })
      .expect(201);

    expect(unqualifiedCompletion.body.outcome).toBe('unqualified');
    expect(unqualifiedCompletion.body.unqualifiedReason).toBe('qa_unqualified_completion');

    const dbLead = await prisma.lead.findUnique({ where: { id: fixture.leadId } });
    const dbApplication = await prisma.application.findUnique({
      where: { id: fixture.applicationId },
    });
    const dbDeparture = await prisma.departure.findUnique({
      where: { id: departure.body.id },
    });
    const dbReservations = await prisma.reservation.findMany({
      where: { applicationItem: { applicationId: fixture.applicationId } },
    });

    expect(dbLead?.stage).toBe('unqualified');
    expect(dbLead?.unqualifiedReason).toBe('qa_unqualified_completion');
    expect(dbApplication?.stage).toBe('cancelled');
    expect(dbApplication?.isActive).toBe(false);
    expect(dbDeparture?.status).toBe('cancelled');
    expect(dbReservations.length).toBeGreaterThan(0);
    expect(
      dbReservations.every(
        (row) => !row.isActive && row.releaseReason === 'completion:unqualified',
      ),
    ).toBe(true);
  });

  it('APIC-011: Manager forbidden contract for admin-only APIs returns 403', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);

    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', authHeader(login.accessToken))
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/v1/settings/workspace')
      .set('Authorization', authHeader(login.accessToken))
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/v1/imports/preview')
      .set('Authorization', authHeader(login.accessToken))
      .send({ fileUrl: 'https://qa.local/import.csv' })
      .expect(403);
  });

  it('APIC-012: Navigation deep-link deterministic route context contract', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const seed = uniqueSeed('APIC012');
    const fixture = await createLeadAndApplication(app, login.accessToken, seed);

    const item = await addApplicationItem(app, login.accessToken, fixture.applicationId, {
      equipmentTypeLabel: 'QA APIC-012 Position',
      quantity: 1,
      readyForReservation: false,
    });

    const reservation = await createReservation(app, login.accessToken, {
      applicationItemId: item.id,
      sourcingType: 'subcontractor',
      plannedStart: futureIso(420),
      plannedEnd: futureIso(520),
    });

    const leadDeepLink = await request(app.getHttpServer())
      .get('/api/v1/navigation/deep-link')
      .query({ entityType: 'lead', entityId: fixture.leadId })
      .set('Authorization', authHeader(login.accessToken))
      .expect(200);

    expect(leadDeepLink.body.canonical).toMatchObject({
      secondaryId: 'leads',
      entityType: 'lead',
      entityId: fixture.leadId,
    });
    expect(leadDeepLink.body.linkedIds.leadId).toBe(fixture.leadId);

    const appDeepLink = await request(app.getHttpServer())
      .get('/api/v1/navigation/deep-link')
      .query({ entityType: 'application', entityId: fixture.applicationId })
      .set('Authorization', authHeader(login.accessToken))
      .expect(200);

    expect(appDeepLink.body.canonical).toMatchObject({
      secondaryId: 'applications',
      entityType: 'application',
      entityId: fixture.applicationId,
    });
    expect(appDeepLink.body.linkedIds.applicationId).toBe(fixture.applicationId);
    expect(appDeepLink.body.linkedIds.leadId).toBe(fixture.leadId);

    const reservationDeepLink = await request(app.getHttpServer())
      .get('/api/v1/navigation/deep-link')
      .query({ entityType: 'reservation', entityId: reservation.body.id })
      .set('Authorization', authHeader(login.accessToken))
      .expect(200);

    expect(reservationDeepLink.body.canonical).toMatchObject({
      secondaryId: 'reservations',
      entityType: 'reservation',
      entityId: reservation.body.id,
    });
    expect(reservationDeepLink.body.linkedIds.reservationId).toBe(reservation.body.id);
    expect(reservationDeepLink.body.linkedIds.applicationId).toBe(fixture.applicationId);
    expect(reservationDeepLink.body.linkedIds.leadId).toBe(fixture.leadId);
  });
});
