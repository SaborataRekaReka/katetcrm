import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  TEST_ADMIN,
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

describe('Integration Invariants (INT-001..INT-010)', () => {
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

  it('INT-001: one active application per lead', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const seed = uniqueSeed('INT001');

    const created = await createLeadAndApplication(app, login.accessToken, seed);
    const leadId = created.leadId;

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    expect(lead).not.toBeNull();
    expect(lead?.clientId).toEqual(expect.any(String));

    const activeCount = await prisma.application.count({
      where: {
        leadId,
        isActive: true,
      },
    });
    expect(activeCount).toBe(1);

    await expect(
      prisma.application.create({
        data: {
          number: `APP-INT-${Date.now()}`,
          leadId,
          clientId: lead!.clientId!,
          responsibleManagerId: lead!.managerId,
          isActive: true,
          address: 'Invariant Duplicate Guard',
        },
      }),
    ).rejects.toThrow();

    const activeCountAfterDirectCreate = await prisma.application.count({
      where: {
        leadId,
        isActive: true,
      },
    });
    expect(activeCountAfterDirectCreate).toBe(1);
  });

  it('INT-001A: invalid Lead to Application transition creates no Application', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const seed = uniqueSeed('INT001A');

    const created = await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set('Authorization', authHeader(login.accessToken))
      .send({
        contactName: `QA ${seed} Lead`,
        contactPhone: uniquePhone('001'),
      })
      .expect(201);

    const leadId = created.body.lead.id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/leads/${leadId}/stage`)
      .set('Authorization', authHeader(login.accessToken))
      .send({ stage: 'application' })
      .expect(400);

    const dbLead = await prisma.lead.findUnique({ where: { id: leadId } });
    expect(dbLead?.stage).toBe('lead');

    const applicationCount = await prisma.application.count({ where: { leadId } });
    expect(applicationCount).toBe(0);
  });

  it('INT-002: multi-item application support in happy path fixtures', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const seed = uniqueSeed('INT002');
    const equipment = await ensureEquipmentFixture(prisma, seed);
    const fixture = await createLeadAndApplication(app, login.accessToken, seed);

    await addApplicationItem(app, login.accessToken, fixture.applicationId, {
      equipmentTypeId: equipment.equipmentTypeId,
      equipmentTypeLabel: 'QA INT-002 Position A',
      quantity: 1,
      readyForReservation: false,
    });

    await addApplicationItem(app, login.accessToken, fixture.applicationId, {
      equipmentTypeId: equipment.equipmentTypeId,
      equipmentTypeLabel: 'QA INT-002 Position B',
      quantity: 2,
      readyForReservation: false,
    });

    const dbApplication = await prisma.application.findUnique({
      where: { id: fixture.applicationId },
      include: {
        items: true,
      },
    });

    expect(dbApplication).not.toBeNull();
    expect(dbApplication?.items.length).toBeGreaterThanOrEqual(2);
  });

  it('INT-003: readiness derivation requires non-undecided source and mandatory fields', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const seed = uniqueSeed('INT003');
    const fixture = await createLeadAndApplication(app, login.accessToken, seed);

    const missingRequired = await request(app.getHttpServer())
      .post(`/api/v1/applications/${fixture.applicationId}/items`)
      .set('Authorization', authHeader(login.accessToken))
      .send({
        equipmentTypeLabel: 'QA INT-003 Missing Required',
        quantity: 1,
        readyForReservation: true,
        sourcingType: 'own',
      })
      .expect(400);

    expect(String(missingRequired.body.message)).toContain('readyForReservation=true requires fields');

    const undecidedSource = await request(app.getHttpServer())
      .post(`/api/v1/applications/${fixture.applicationId}/items`)
      .set('Authorization', authHeader(login.accessToken))
      .send({
        equipmentTypeLabel: 'QA INT-003 Undecided',
        quantity: 1,
        plannedDate: futureIso(120),
        plannedTimeFrom: '09:00',
        plannedTimeTo: '18:00',
        address: 'QA INT-003 Address',
        readyForReservation: true,
        sourcingType: 'undecided',
      })
      .expect(400);

    expect(String(undecidedSource.body.message)).toContain('sourcingType');

    const validItem = await addApplicationItem(app, login.accessToken, fixture.applicationId, {
      equipmentTypeLabel: 'QA INT-003 Valid',
      quantity: 1,
      plannedDate: futureIso(140),
      plannedTimeFrom: '10:00',
      plannedTimeTo: '17:00',
      address: 'QA INT-003 Valid Address',
      readyForReservation: true,
      sourcingType: 'own',
    });

    const dbItem = await prisma.applicationItem.findUnique({ where: { id: validItem.id } });
    expect(dbItem?.readyForReservation).toBe(true);
    expect(dbItem?.sourcingType).toBe('own');
  });

  it('INT-004: reservation conflict remains warning-only and persists', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const seed = uniqueSeed('INT004');
    const equipment = await ensureEquipmentFixture(prisma, seed);
    const fixture = await createLeadAndApplication(app, login.accessToken, seed);

    const itemA = await addApplicationItem(app, login.accessToken, fixture.applicationId, {
      equipmentTypeId: equipment.equipmentTypeId,
      equipmentTypeLabel: 'QA INT-004 Position A',
      quantity: 1,
      readyForReservation: false,
    });

    const itemB = await addApplicationItem(app, login.accessToken, fixture.applicationId, {
      equipmentTypeId: equipment.equipmentTypeId,
      equipmentTypeLabel: 'QA INT-004 Position B',
      quantity: 1,
      readyForReservation: false,
    });

    await createReservation(app, login.accessToken, {
      applicationItemId: itemA.id,
      sourcingType: 'own',
      equipmentUnitId: equipment.equipmentUnitId,
      plannedStart: futureIso(240),
      plannedEnd: futureIso(360),
    });

    const conflicting = await createReservation(app, login.accessToken, {
      applicationItemId: itemB.id,
      sourcingType: 'own',
      equipmentUnitId: equipment.equipmentUnitId,
      plannedStart: futureIso(260),
      plannedEnd: futureIso(380),
    });

    expect(conflicting.body.hasConflict).toBe(true);
    expect(conflicting.body.id).toEqual(expect.any(String));

    const dbReservation = await prisma.reservation.findUnique({
      where: { id: conflicting.body.id as string },
    });
    expect(dbReservation).not.toBeNull();
    expect(dbReservation?.hasConflictWarning).toBe(true);
    expect(dbReservation?.isActive).toBe(true);
  });

  it('INT-004A: Application to Reservation transition requires an active Reservation', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const seed = uniqueSeed('INT004A');
    const equipment = await ensureEquipmentFixture(prisma, seed);
    const fixture = await createLeadAndApplication(app, login.accessToken, seed);

    await request(app.getHttpServer())
      .post(`/api/v1/leads/${fixture.leadId}/stage`)
      .set('Authorization', authHeader(login.accessToken))
      .send({ stage: 'reservation' })
      .expect(400);

    const leadBeforeReservation = await prisma.lead.findUnique({ where: { id: fixture.leadId } });
    expect(leadBeforeReservation?.stage).toBe('application');

    const appBeforeReservation = await prisma.application.findUnique({
      where: { id: fixture.applicationId },
    });
    expect(appBeforeReservation?.stage).toBe('application');

    const item = await addApplicationItem(app, login.accessToken, fixture.applicationId, {
      equipmentTypeId: equipment.equipmentTypeId,
      equipmentTypeLabel: 'QA INT-004A Position',
      quantity: 1,
      plannedDate: futureIso(160),
      plannedTimeFrom: '09:00',
      plannedTimeTo: '18:00',
      address: 'QA INT-004A Address',
      readyForReservation: true,
      sourcingType: 'own',
    });

    await createReservation(app, login.accessToken, {
      applicationItemId: item.id,
      sourcingType: 'own',
      equipmentTypeId: equipment.equipmentTypeId,
      plannedStart: futureIso(220),
      plannedEnd: futureIso(340),
    });

    await request(app.getHttpServer())
      .post(`/api/v1/leads/${fixture.leadId}/stage`)
      .set('Authorization', authHeader(login.accessToken))
      .send({ stage: 'reservation' })
      .expect(201);

    const leadAfterReservation = await prisma.lead.findUnique({ where: { id: fixture.leadId } });
    expect(leadAfterReservation?.stage).toBe('reservation');

    const appAfterReservation = await prisma.application.findUnique({
      where: { id: fixture.applicationId },
    });
    expect(appAfterReservation?.stage).toBe('reservation');
  });

  it('INT-005: unit required before departure transition', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const seed = uniqueSeed('INT005');
    const fixture = await createLeadAndApplication(app, login.accessToken, seed);

    const item = await addApplicationItem(app, login.accessToken, fixture.applicationId, {
      equipmentTypeLabel: 'QA INT-005 Position',
      quantity: 1,
      readyForReservation: false,
    });

    const reservation = await createReservation(app, login.accessToken, {
      applicationItemId: item.id,
      sourcingType: 'own',
      plannedStart: futureIso(300),
      plannedEnd: futureIso(420),
    });

    const withoutUnit = await createDeparture(
      app,
      login.accessToken,
      {
        reservationId: reservation.body.id,
        scheduledAt: futureIso(320),
      },
      400,
    );
    expect(String(withoutUnit.body.message)).toContain('equipment unit');

    const equipment = await ensureEquipmentFixture(prisma, seed);
    await request(app.getHttpServer())
      .patch(`/api/v1/reservations/${reservation.body.id}`)
      .set('Authorization', authHeader(login.accessToken))
      .send({ equipmentUnitId: equipment.equipmentUnitId })
      .expect(200);

    const withUnit = await createDeparture(app, login.accessToken, {
      reservationId: reservation.body.id,
      scheduledAt: futureIso(330),
    });

    expect(withUnit.body.status).toBe('scheduled');
  });

  it('INT-006: departure lifecycle status integrity', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const seed = uniqueSeed('INT006');
    const equipment = await ensureEquipmentFixture(prisma, seed);
    const fixture = await createLeadAndApplication(app, login.accessToken, seed);

    const item = await addApplicationItem(app, login.accessToken, fixture.applicationId, {
      equipmentTypeId: equipment.equipmentTypeId,
      equipmentTypeLabel: 'QA INT-006 Position',
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
      .patch(`/api/v1/departures/${departure.body.id}`)
      .set('Authorization', authHeader(login.accessToken))
      .send({ status: 'arrived' })
      .expect(400);

    const started = await request(app.getHttpServer())
      .post(`/api/v1/departures/${departure.body.id}/start`)
      .set('Authorization', authHeader(login.accessToken))
      .expect(201);
    expect(started.body.status).toBe('in_transit');

    const arrived = await request(app.getHttpServer())
      .post(`/api/v1/departures/${departure.body.id}/arrive`)
      .set('Authorization', authHeader(login.accessToken))
      .expect(201);
    expect(arrived.body.status).toBe('arrived');

    const completed = await request(app.getHttpServer())
      .post(`/api/v1/departures/${departure.body.id}/complete`)
      .set('Authorization', authHeader(login.accessToken))
      .send({ outcome: 'completed' })
      .expect(201);
    expect(completed.body.status).toBe('completed');
  });

  it('INT-007: completion cascade updates linked entities', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const seed = uniqueSeed('INT007');
    const equipment = await ensureEquipmentFixture(prisma, seed);
    const fixture = await createLeadAndApplication(app, login.accessToken, seed);

    const itemA = await addApplicationItem(app, login.accessToken, fixture.applicationId, {
      equipmentTypeId: equipment.equipmentTypeId,
      equipmentTypeLabel: 'QA INT-007 Position A',
      quantity: 1,
      readyForReservation: false,
    });

    const itemB = await addApplicationItem(app, login.accessToken, fixture.applicationId, {
      equipmentTypeId: equipment.equipmentTypeId,
      equipmentTypeLabel: 'QA INT-007 Position B',
      quantity: 1,
      readyForReservation: false,
    });

    const reservationA = await createReservation(app, login.accessToken, {
      applicationItemId: itemA.id,
      sourcingType: 'own',
      equipmentUnitId: equipment.equipmentUnitId,
      plannedStart: futureIso(420),
      plannedEnd: futureIso(540),
    });

    await createReservation(app, login.accessToken, {
      applicationItemId: itemB.id,
      sourcingType: 'subcontractor',
      plannedStart: futureIso(620),
      plannedEnd: futureIso(740),
    });

    const departure = await createDeparture(app, login.accessToken, {
      reservationId: reservationA.body.id,
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
        outcome: 'completed',
      })
      .expect(201);

    const dbLead = await prisma.lead.findUnique({ where: { id: fixture.leadId } });
    const dbApplication = await prisma.application.findUnique({
      where: { id: fixture.applicationId },
    });
    const dbReservations = await prisma.reservation.findMany({
      where: { applicationItem: { applicationId: fixture.applicationId } },
    });
    const dbDeparture = await prisma.departure.findUnique({
      where: { id: departure.body.id },
    });
    const completion = await prisma.completion.findUnique({
      where: { departureId: departure.body.id },
    });

    expect(dbLead?.stage).toBe('completed');
    expect(dbApplication?.stage).toBe('completed');
    expect(dbApplication?.isActive).toBe(false);
    expect(dbDeparture?.status).toBe('completed');
    expect(completion).not.toBeNull();
    expect(dbReservations.length).toBeGreaterThanOrEqual(2);
    expect(
      dbReservations.every(
        (row) => !row.isActive && row.internalStage === 'released' && !!row.releasedAt,
      ),
    ).toBe(true);
  });

  it('INT-008: audit and activity completeness includes actor', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const seed = uniqueSeed('INT008');
    const equipment = await ensureEquipmentFixture(prisma, seed);
    const fixture = await createLeadAndApplication(app, login.accessToken, seed);

    const item = await addApplicationItem(app, login.accessToken, fixture.applicationId, {
      equipmentTypeId: equipment.equipmentTypeId,
      equipmentTypeLabel: 'QA INT-008 Position',
      quantity: 1,
      readyForReservation: false,
    });

    const reservation = await createReservation(app, login.accessToken, {
      applicationItemId: item.id,
      sourcingType: 'own',
      equipmentUnitId: equipment.equipmentUnitId,
      plannedStart: futureIso(500),
      plannedEnd: futureIso(620),
    });

    const departure = await createDeparture(app, login.accessToken, {
      reservationId: reservation.body.id,
      scheduledAt: futureIso(520),
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
      })
      .expect(201);

    const completionLog = await prisma.activityLogEntry.findFirst({
      where: {
        entityType: 'completion',
        entityId: completion.body.id as string,
        action: 'completed',
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(completionLog).not.toBeNull();
    expect(completionLog?.actorId).toBe(login.user.id);
    const payload = completionLog?.payload as { departureId?: string; applicationId?: string; leadId?: string } | null;
    expect(payload?.departureId).toBe(departure.body.id);
    expect(payload?.applicationId).toBe(fixture.applicationId);
    expect(payload?.leadId).toBe(fixture.leadId);
  });

  it('INT-009: unqualified and cancelled cascade behavior', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);

    const leadOnly = await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set('Authorization', authHeader(login.accessToken))
      .send({
        contactName: 'QA INT-009 Lead',
        contactPhone: `+7909${Date.now().toString().slice(-8)}`,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/leads/${leadOnly.body.lead.id}/stage`)
      .set('Authorization', authHeader(login.accessToken))
      .send({ stage: 'unqualified' })
      .expect(400);

    const seed = uniqueSeed('INT009');
    const equipment = await ensureEquipmentFixture(prisma, seed);
    const fixture = await createLeadAndApplication(app, login.accessToken, seed);

    const item = await addApplicationItem(app, login.accessToken, fixture.applicationId, {
      equipmentTypeId: equipment.equipmentTypeId,
      equipmentTypeLabel: 'QA INT-009 Position',
      quantity: 1,
      readyForReservation: false,
    });

    const reservation = await createReservation(app, login.accessToken, {
      applicationItemId: item.id,
      sourcingType: 'own',
      equipmentUnitId: equipment.equipmentUnitId,
      plannedStart: futureIso(560),
      plannedEnd: futureIso(700),
    });

    const departure = await createDeparture(app, login.accessToken, {
      reservationId: reservation.body.id,
      scheduledAt: futureIso(580),
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

    await request(app.getHttpServer())
      .post('/api/v1/completions')
      .set('Authorization', authHeader(login.accessToken))
      .send({
        departureId: departure.body.id,
        outcome: 'unqualified',
        unqualifiedReason: 'qa_int009_reason',
      })
      .expect(201);

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
    expect(dbLead?.unqualifiedReason).toBe('qa_int009_reason');
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

  it('INT-010: manager forbidden admin-only operations without side effects', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const usersCountBefore = await prisma.user.count();

    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', authHeader(login.accessToken))
      .expect(403);

    const usersCountAfter = await prisma.user.count();
    expect(usersCountAfter).toBe(usersCountBefore);
  });

  it('INT-010A (QA-REQ-033): admin capability toggle gates admin users API', async () => {
    const admin = await loginByPassword(app, TEST_ADMIN);
    const headers = { Authorization: authHeader(admin.accessToken) };

    const matrixResponse = await request(app.getHttpServer())
      .get('/api/v1/users/permissions-matrix')
      .set(headers)
      .expect(200);

    const usersCapability = (matrixResponse.body.capabilities as Array<{
      id: string;
      matrix?: { admin?: boolean };
    }>).find((item) => item.id === 'admin.users');

    expect(usersCapability).toBeDefined();
    const originalAdminEnabled = Boolean(usersCapability?.matrix?.admin);

    await request(app.getHttpServer())
      .patch('/api/v1/users/permissions-matrix/admin.users')
      .set(headers)
      .send({ admin: false })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set(headers)
      .expect(403);

    await request(app.getHttpServer())
      .patch('/api/v1/users/permissions-matrix/admin.users')
      .set(headers)
      .send({ admin: originalAdminEnabled })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set(headers)
      .expect(200);
  });
});
