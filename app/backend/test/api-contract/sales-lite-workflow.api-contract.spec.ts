import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { MetrikaService } from '../../src/modules/metrika/metrika.service';
import { ActivityService } from '../../src/modules/activity/activity.service';
import {
  TEST_MANAGER,
  ensureBaseUsers,
  loginByPassword,
} from '../helpers/auth-fixtures';
import {
  authHeader,
  uniquePhone,
  uniqueSeed,
} from '../helpers/domain-fixtures';

async function createLeadInWork(app: INestApplication, accessToken: string, seed: string) {
  const response = await request(app.getHttpServer())
    .post('/api/v1/leads')
    .set('Authorization', authHeader(accessToken))
    .send({ contactName: `QA ${seed}`, contactPhone: uniquePhone('067'), source: 'mango' })
    .expect(201);
  const leadId = response.body.lead.id as string;
  const promoted = await request(app.getHttpServer())
    .post(`/api/v1/leads/${leadId}/stage`)
    .set('Authorization', authHeader(accessToken))
    .send({ stage: 'application' })
    .expect(201);
  expect(promoted.body.linkedIds.applicationId).toBeNull();
  return { leadId };
}

async function createProfileTestApp(): Promise<INestApplication> {
  const { AppModule } = await import('../../src/app.module');
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();
  return app;
}

describe('API Contract - Sales-lite workflow profile (QA-REQ-054..056, 060, 063, 065)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let previousWorkflowProfile: string | undefined;

  beforeAll(async () => {
    previousWorkflowProfile = process.env.CRM_WORKFLOW_PROFILE;
    process.env.CRM_WORKFLOW_PROFILE = 'sales-lite';

    app = await createProfileTestApp();
    prisma = app.get(PrismaService);
    await ensureBaseUsers(prisma);
  });

  afterAll(async () => {
    await app.close();

    if (previousWorkflowProfile === undefined) {
      delete process.env.CRM_WORKFLOW_PROFILE;
    } else {
      process.env.CRM_WORKFLOW_PROFILE = previousWorkflowProfile;
    }
  });

  it('APIC-060: sales-lite changes Lead status without Application prerequisites (QA-REQ-067)', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const fixture = await createLeadInWork(
      app,
      login.accessToken,
      uniqueSeed('APIC060'),
    );

    const blockedReservation = await request(app.getHttpServer())
      .post(`/api/v1/leads/${fixture.leadId}/stage`)
      .set('Authorization', authHeader(login.accessToken))
      .send({ stage: 'reservation' })
      .expect(400);

    expect(String(blockedReservation.body.message)).toContain(
      'Недопустимый переход application',
    );

    const qualified = await request(app.getHttpServer())
      .post(`/api/v1/leads/${fixture.leadId}/stage`)
      .set('Authorization', authHeader(login.accessToken))
      .send({ stage: 'completed' })
      .expect(201);

    expect(qualified.body.stage).toBe('completed');

    expect(qualified.body.id).toBe(fixture.leadId);
    expect(qualified.body.clientId).toBeNull();
    expect(await prisma.application.count({ where: { leadId: fixture.leadId } })).toBe(0);

    const stageLog = await prisma.activityLogEntry.findFirst({
      where: {
        entityType: 'lead',
        entityId: fixture.leadId,
        action: 'stage_changed',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(stageLog?.summary).toContain('application → completed');
  });

  it('APIC-061: sales-lite keeps operations endpoints full-profile only', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);

    await request(app.getHttpServer())
      .get('/api/v1/reservations')
      .set('Authorization', authHeader(login.accessToken))
      .expect(403);
  });

  it('APIC-063: persists marketing qualification across API, filters, counters, audit and idempotent conversion outbox', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const fixture = await createLeadInWork(
      app,
      login.accessToken,
      uniqueSeed('APIC063'),
    );

    const marketingQualified = await request(app.getHttpServer())
      .post(`/api/v1/leads/${fixture.leadId}/stage`)
      .set('Authorization', authHeader(login.accessToken))
      .send({ stage: 'marketing_qualified' })
      .expect(201);

    expect(marketingQualified.body.stage).toBe('marketing_qualified');

    const filtered = await request(app.getHttpServer())
      .get('/api/v1/leads')
      .query({ stage: 'marketing_qualified' })
      .set('Authorization', authHeader(login.accessToken))
      .expect(200);
    expect(filtered.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: fixture.leadId,
          stage: 'marketing_qualified',
        }),
      ]),
    );

    const stats = await request(app.getHttpServer())
      .get('/api/v1/stats')
      .set('Authorization', authHeader(login.accessToken))
      .expect(200);
    expect(stats.body.pipeline.marketingQualified).toBeGreaterThanOrEqual(1);

    await request(app.getHttpServer())
      .post(`/api/v1/leads/${fixture.leadId}/stage`)
      .set('Authorization', authHeader(login.accessToken))
      .send({ stage: 'marketing_qualified' })
      .expect(201);

    let conversions = await prisma.metrikaConversion.findMany({
      where: { leadId: fixture.leadId },
      orderBy: { target: 'asc' },
    });
    expect(conversions.map((item) => item.target)).toEqual(['MARKETING_QUAL']);

    await request(app.getHttpServer())
      .post(`/api/v1/leads/${fixture.leadId}/stage`)
      .set('Authorization', authHeader(login.accessToken))
      .send({ stage: 'completed' })
      .expect(201);

    conversions = await prisma.metrikaConversion.findMany({
      where: { leadId: fixture.leadId },
      orderBy: { target: 'asc' },
    });
    expect(conversions.map((item) => item.target)).toEqual([
      'MARKETING_QUAL',
      'SALES_QUAL',
    ]);
    expect(
      await prisma.metrikaConversion.count({
        where: { leadId: fixture.leadId, target: 'MARKETING_QUAL' },
      }),
    ).toBe(1);

    const stageLogs = await prisma.activityLogEntry.findMany({
      where: {
        entityType: 'lead',
        entityId: fixture.leadId,
        action: 'stage_changed',
      },
      orderBy: { createdAt: 'asc' },
    });
    expect(stageLogs.map((item) => item.summary)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('application → marketing_qualified'),
        expect.stringContaining('marketing_qualified → completed'),
      ]),
    );
  });

  it('APIC-064: does not enqueue Metrika conversion for an unqualified lead', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const fixture = await createLeadInWork(
      app,
      login.accessToken,
      uniqueSeed('APIC064'),
    );

    await request(app.getHttpServer())
      .post(`/api/v1/leads/${fixture.leadId}/stage`)
      .set('Authorization', authHeader(login.accessToken))
      .send({ stage: 'unqualified', reason: 'QA: не прошёл квалификацию' })
      .expect(201);

    expect(
      await prisma.metrikaConversion.count({ where: { leadId: fixture.leadId } }),
    ).toBe(0);
  });

  it('APIC-067: one Lead retains calls, comments and attribution through all statuses and rollback (QA-REQ-067)', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const { leadId } = await createLeadInWork(app, login.accessToken, uniqueSeed('APIC067'));
    const header = authHeader(login.accessToken);
    await request(app.getHttpServer()).patch(`/api/v1/leads/${leadId}`)
      .set('Authorization', header).send({ comment: 'QA: исходный комментарий' }).expect(200);
    const recording = await prisma.activityLogEntry.create({ data: {
      entityType: 'lead', entityId: leadId, action: 'note_added', summary: 'QA: входящий звонок Mango',
      payload: { telephony: { recordingUrl: 'https://example.test/qa-recording.mp3' } },
    } });
    const attribution = await prisma.leadAttribution.create({ data: {
      leadId, integrationEventId: `QA-${leadId}`, submissionId: `QA-${leadId}`,
      metrikaClientId: 'qa-local-only', yclid: 'qa-click', utmSource: 'qa', capturedAt: new Date(),
    } });
    for (const stage of ['marketing_qualified', 'completed', 'application', 'marketing_qualified', 'completed', 'unqualified', 'lead']) {
      const result = await request(app.getHttpServer()).post(`/api/v1/leads/${leadId}/stage`)
        .set('Authorization', header).send({ stage, reason: 'QA: проверка' }).expect(201);
      expect(result.body).toMatchObject({ id: leadId, stage, managerId: login.user.id, comment: 'QA: исходный комментарий' });
      expect(result.body.attributions).toEqual(expect.arrayContaining([expect.objectContaining({ id: attribution.id })]));
      expect(result.body.linkedIds.applicationId).toBeNull();
    }
    const outbox = await prisma.metrikaConversion.findMany({ where: { leadId } });
    expect(outbox.map((row) => row.target).sort()).toEqual(['MARKETING_QUAL', 'SALES_QUAL']);
    // Concurrent retries must neither duplicate an audit transition nor create an Application.
    await Promise.all(Array.from({ length: 4 }, () => request(app.getHttpServer())
      .post(`/api/v1/leads/${leadId}/stage`).set('Authorization', header)
      .send({ stage: 'marketing_qualified' }).expect(201)));
    expect(await prisma.activityLogEntry.count({ where: {
      entityType: 'lead', entityId: leadId, action: 'stage_changed',
      payload: { path: ['from'], equals: 'lead' }, summary: 'Стадия: lead → marketing_qualified',
    } })).toBe(1);
    for (const expected of ['application', 'lead']) {
      const rollback = await request(app.getHttpServer()).post(`/api/v1/leads/${leadId}/rollback`)
        .set('Authorization', header).send({ reason: 'QA: rollback' }).expect(201);
      expect(rollback.body.stage).toBe(expected);
    }
    expect(await prisma.application.count({ where: { leadId } })).toBe(0);
    expect((await prisma.metrikaConversion.findMany({ where: { leadId } })).map((row) => row.id).sort())
      .toEqual(outbox.map((row) => row.id).sort());
    const history = await request(app.getHttpServer()).get(`/api/v1/leads/${leadId}/activity?take=1`)
      .set('Authorization', header).expect(200);
    expect(history.body).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: recording.id }),
      expect.objectContaining({ summary: 'QA: исходный комментарий' }),
    ]));
  });

  it('APIC-068: legacy Application history resolves to Lead, remains intact and is owner-scoped (QA-REQ-067)', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const { leadId } = await createLeadInWork(app, login.accessToken, uniqueSeed('APIC068'));
    const client = await prisma.client.create({ data: { name: 'QA legacy client', phone: '000', phoneNormalized: '000' } });
    const legacy = await prisma.application.create({ data: {
      number: uniqueSeed('QA-LEGACY'), leadId, clientId: client.id, responsibleManagerId: login.user.id,
      comment: 'QA legacy comment',
    } });
    const note = await prisma.activityLogEntry.create({ data: {
      entityType: 'application', entityId: legacy.id, action: 'note_added', summary: legacy.comment!,
    } });
    const foreign = await prisma.lead.create({ data: {
      contactName: 'QA foreign', contactPhone: '000', phoneNormalized: '000',
    } });
    const foreignNote = await prisma.activityLogEntry.create({ data: {
      entityType: 'lead', entityId: foreign.id, action: 'note_added', summary: 'QA private',
    } });
    const header = authHeader(login.accessToken);
    await request(app.getHttpServer()).post(`/api/v1/leads/${leadId}/stage`)
      .set('Authorization', header).send({ stage: 'marketing_qualified' }).expect(201);
    await request(app.getHttpServer()).post(`/api/v1/leads/${leadId}/rollback`)
      .set('Authorization', header).send({}).expect(201);
    const history = await request(app.getHttpServer()).get(`/api/v1/leads/${leadId}/activity`)
      .set('Authorization', header).expect(200);
    expect(history.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: note.id })]));
    expect(history.body).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: foreignNote.id })]));
    expect(await prisma.application.findUnique({ where: { id: legacy.id } })).toEqual(legacy);
    const link = await request(app.getHttpServer()).get('/api/v1/navigation/deep-link')
      .query({ entityType: 'application', entityId: legacy.id }).set('Authorization', header).expect(200);
    expect(link.body.canonical).toEqual({ secondaryId: 'leads', entityType: 'lead', entityId: leadId });
    await request(app.getHttpServer()).get(`/api/v1/leads/${foreign.id}/activity`).set('Authorization', header).expect(403);
    await request(app.getHttpServer()).post(`/api/v1/leads/${foreign.id}/stage`)
      .set('Authorization', header).send({ stage: 'application' }).expect(403);
  });

  it('APIC-066: retries a transient Metrika upload and marks the same outbox row sent (QA-REQ-065)', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const fixture = await createLeadInWork(
      app,
      login.accessToken,
      uniqueSeed('APIC066'),
    );
    await prisma.leadAttribution.create({
      data: {
        leadId: fixture.leadId,
        integrationEventId: `APIC-066-${fixture.leadId}`,
        submissionId: `APIC-066-${fixture.leadId}`,
        metrikaClientId: `qa-client-${fixture.leadId}`,
        capturedAt: new Date(),
      },
    });

    await request(app.getHttpServer())
      .post(`/api/v1/leads/${fixture.leadId}/stage`)
      .set('Authorization', authHeader(login.accessToken))
      .send({ stage: 'marketing_qualified' })
      .expect(201);

    const previousCounterId = process.env.YANDEX_METRIKA_COUNTER_ID;
    const previousOauthToken = process.env.YANDEX_METRIKA_OAUTH_TOKEN;
    process.env.YANDEX_METRIKA_COUNTER_ID = 'qa-counter';
    process.env.YANDEX_METRIKA_OAUTH_TOKEN = 'qa-oauth-token';
    const metrika = new MetrikaService(
      prisma,
      new ConfigService(),
      app.get(ActivityService),
    );

    const fetchMock = jest.spyOn(global, 'fetch');
    try {
      fetchMock.mockResolvedValueOnce(
        new Response('temporary failure', { status: 503 }),
      );
      await metrika.flushPending(fixture.leadId);

      const failed = await prisma.metrikaConversion.findUniqueOrThrow({
        where: {
          leadId_target: {
            leadId: fixture.leadId,
            target: 'MARKETING_QUAL',
          },
        },
      });
      expect(failed.status).toBe('failed');
      expect(failed.attempts).toBe(1);
      expect(failed.lastErrorCode).toBe('HTTP_503');
      expect(failed.nextAttemptAt?.getTime()).toBeGreaterThan(Date.now());

      await prisma.metrikaConversion.update({
        where: { id: failed.id },
        data: { nextAttemptAt: new Date() },
      });
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ uploading: { id: 'qa-upload-066' } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
      await metrika.flushPending(fixture.leadId);

      const sent = await prisma.metrikaConversion.findUniqueOrThrow({
        where: { id: failed.id },
      });
      expect(sent).toMatchObject({
        status: 'sent',
        attempts: 2,
        uploadId: 'qa-upload-066',
        lastErrorCode: null,
      });
      expect(sent.sentAt).toBeInstanceOf(Date);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      fetchMock.mockRestore();
      if (previousCounterId === undefined) {
        delete process.env.YANDEX_METRIKA_COUNTER_ID;
      } else {
        process.env.YANDEX_METRIKA_COUNTER_ID = previousCounterId;
      }
      if (previousOauthToken === undefined) {
        delete process.env.YANDEX_METRIKA_OAUTH_TOKEN;
      } else {
        process.env.YANDEX_METRIKA_OAUTH_TOKEN = previousOauthToken;
      }
    }
  });
});
