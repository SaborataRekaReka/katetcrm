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
  createLeadAndApplication,
  uniqueSeed,
} from '../helpers/domain-fixtures';

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

  it('APIC-060: sales-lite qualifies Application directly and blocks Reservation progression', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const fixture = await createLeadAndApplication(
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

    const applicationAfterQualification = await prisma.application.findUniqueOrThrow({
      where: { id: fixture.applicationId },
    });
    expect(applicationAfterQualification.stage).toBe('completed');
    expect(applicationAfterQualification.isActive).toBe(false);
    expect(applicationAfterQualification.completedAt).toBeInstanceOf(Date);

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
    const fixture = await createLeadAndApplication(
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
      .expect(400);

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
    const fixture = await createLeadAndApplication(
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

  it('APIC-066: retries a transient Metrika upload and marks the same outbox row sent (QA-REQ-065)', async () => {
    const login = await loginByPassword(app, TEST_MANAGER);
    const fixture = await createLeadAndApplication(
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
