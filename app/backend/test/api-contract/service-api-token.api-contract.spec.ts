import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  generateServiceApiToken,
  type ServiceApiScope,
} from '../../src/common/service-api-token';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TEST_ADMIN, ensureBaseUsers } from '../helpers/auth-fixtures';
import { uniquePhone, uniqueSeed } from '../helpers/domain-fixtures';
import { closeTestApp, createTestApp } from '../helpers/test-app';

describe('API Contract - Service API tokens (QA-REQ-062)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let actorUserId: string;
  const tokenIds: string[] = [];
  const leadIds: string[] = [];
  const integrationEventIds: string[] = [];

  async function persistToken(scopes: ServiceApiScope[], revokedAt?: Date) {
    const generated = generateServiceApiToken();
    const created = await prisma.serviceApiToken.create({
      data: {
        name: `QA service token ${uniqueSeed('SAT')}`,
        tokenPrefix: generated.tokenPrefix,
        tokenHash: generated.tokenHash,
        scopes,
        actorUserId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        revokedAt,
      },
    });
    tokenIds.push(created.id);
    return generated.token;
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await ensureBaseUsers(prisma);
    actorUserId = (
      await prisma.user.findUniqueOrThrow({
        where: { email: TEST_ADMIN.email },
        select: { id: true },
      })
    ).id;
  });

  afterAll(async () => {
    await prisma.activityLogEntry.deleteMany({
      where: { entityType: 'lead', entityId: { in: leadIds } },
    });
    await prisma.lead.deleteMany({ where: { id: { in: leadIds } } });
    await prisma.integrationEvent.deleteMany({ where: { id: { in: integrationEventIds } } });
    await prisma.serviceApiToken.deleteMany({ where: { id: { in: tokenIds } } });
    await closeTestApp(app);
  });

  it('APIC-062A: exact service scopes allow lead read/create/update and integration-event read only', async () => {
    const token = await persistToken([
      'leads:read',
      'leads:create',
      'leads:update',
      'integration-events:read',
    ]);
    const auth = `Bearer ${token}`;

    await request(app.getHttpServer())
      .get('/api/v1/leads')
      .set('Authorization', auth)
      .expect(200);

    const created = await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set('Authorization', auth)
      .send({
        contactName: 'QA service token lead',
        contactPhone: uniquePhone('062'),
      })
      .expect(201);

    const leadId = created.body.lead.id as string;
    leadIds.push(leadId);
    expect(created.body.lead.managerId).toBeNull();

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/leads/${leadId}`)
      .set('Authorization', auth)
      .send({ comment: 'Updated through scoped service token' })
      .expect(200);
    expect(updated.body.comment).toBe('Updated through scoped service token');

    const stageChanged = await request(app.getHttpServer())
      .post(`/api/v1/leads/${leadId}/stage`)
      .set('Authorization', auth)
      .send({ stage: 'unqualified', reason: 'QA scoped update check' })
      .expect(201);
    expect(stageChanged.body.stage).toBe('unqualified');

    const integrationEvent = await prisma.integrationEvent.create({
      data: {
        channel: 'site',
        externalId: `QA-SAT-${uniqueSeed('062')}`,
        idempotencyKey: `qa-sat-${uniqueSeed('062')}`,
        payload: { kind: 'service-token-contract-test' },
        status: 'processed',
        relatedLeadId: leadId,
      },
    });
    integrationEventIds.push(integrationEvent.id);

    await request(app.getHttpServer())
      .get('/api/v1/integrations/events')
      .set('Authorization', auth)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/integrations/events/${integrationEvent.id}`)
      .set('Authorization', auth)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', auth)
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/v1/integrations/events/${integrationEvent.id}/replay`)
      .set('Authorization', auth)
      .send({ reason: 'must stay forbidden' })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/v1/leads/${leadId}/rollback`)
      .set('Authorization', auth)
      .send({ reason: 'must stay forbidden' })
      .expect(403);
  });

  it('APIC-062B: missing scope returns 403 without falling back to admin role', async () => {
    const token = await persistToken(['leads:read']);
    await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${token}`)
      .send({
        contactName: 'Must not be created',
        contactPhone: uniquePhone('062B'),
      })
      .expect(403);
  });

  it('APIC-062C: revoked service token returns 401', async () => {
    const token = await persistToken(['leads:read'], new Date());
    await request(app.getHttpServer())
      .get('/api/v1/leads')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });
});
