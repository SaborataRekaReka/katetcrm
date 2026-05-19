import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
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

describe('API Contract - Sales-lite workflow profile (QA-REQ-054..056, 060)', () => {
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
});
