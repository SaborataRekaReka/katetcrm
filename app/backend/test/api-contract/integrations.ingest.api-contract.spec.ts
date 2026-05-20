import type { INestApplication } from '@nestjs/common';
import { createHash, createHmac } from 'crypto';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  TEST_ADMIN,
  TEST_MANAGER,
  ensureBaseUsers,
  loginByPassword,
} from '../helpers/auth-fixtures';
import { authHeader, uniquePhone, uniqueSeed } from '../helpers/domain-fixtures';
import { closeTestApp, createTestApp } from '../helpers/test-app';

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b));

    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${stableSerialize(item)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function buildMangoIngestHeaders(payload: Record<string, unknown>) {
  const secret = (process.env.INTEGRATION_MANGO_SECRET ?? '').trim();
  if (!secret) {
    return {};
  }

  const timestamp = Date.now().toString();
  const message = `${timestamp}.mango.${stableSerialize(payload)}`;
  const signature = createHmac('sha256', secret).update(message).digest('hex');

  return {
    'x-integration-timestamp': timestamp,
    'x-integration-signature': `sha256=${signature}`,
  };
}

function buildSiteIngestHeaders(payload: Record<string, unknown>) {
  const secret = (process.env.INTEGRATION_SITE_SECRET ?? '').trim();
  if (!secret) {
    return {};
  }

  const timestamp = Date.now().toString();
  const message = `${timestamp}.site.${stableSerialize(payload)}`;
  const signature = createHmac('sha256', secret).update(message).digest('hex');

  return {
    'x-integration-timestamp': timestamp,
    'x-integration-signature': `sha256=${signature}`,
  };
}

function buildMangoConnectorBody(payload: Record<string, unknown>) {
  const apiKey = process.env.INTEGRATION_MANGO_API_KEY ?? 'qa-test-mango-api-key';
  const secret = (process.env.INTEGRATION_MANGO_SECRET ?? '').trim();
  const json = JSON.stringify(payload);
  const sign = createHash('sha256').update(`${apiKey}${json}${secret}`).digest('hex');

  return {
    vpbx_api_key: apiKey,
    sign,
    json,
  };
}

describe('API Contract - Integrations ingest Mango (QA-REQ: 036, 037, 050, 051, 052, 053)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let originalMangoSecret: string | undefined;
  let originalMangoApiKey: string | undefined;
  let originalMangoRecordingAccountId: string | undefined;
  let originalMangoRecordingUrlTemplate: string | undefined;
  let originalSiteSecret: string | undefined;

  beforeAll(async () => {
    originalMangoSecret = process.env.INTEGRATION_MANGO_SECRET;
    originalMangoApiKey = process.env.INTEGRATION_MANGO_API_KEY;
    originalMangoRecordingAccountId = process.env.INTEGRATION_MANGO_RECORDING_ACCOUNT_ID;
    originalMangoRecordingUrlTemplate = process.env.INTEGRATION_MANGO_RECORDING_URL_TEMPLATE;
    originalSiteSecret = process.env.INTEGRATION_SITE_SECRET;
    if (!originalMangoSecret) {
      process.env.INTEGRATION_MANGO_SECRET = 'qa-test-mango-secret';
    }
    if (!originalMangoApiKey) {
      process.env.INTEGRATION_MANGO_API_KEY = 'qa-test-mango-api-key';
    }
    if (!originalMangoRecordingAccountId) {
      process.env.INTEGRATION_MANGO_RECORDING_ACCOUNT_ID = 'qa-recording-account';
    }
    if (!originalMangoRecordingUrlTemplate) {
      process.env.INTEGRATION_MANGO_RECORDING_URL_TEMPLATE =
        'https://lk.mango-office.ru/issa/api/{apiKey}/{accountId}/call-recording/play-record/{recordingId}';
    }
    if (!originalSiteSecret) {
      process.env.INTEGRATION_SITE_SECRET = 'qa-test-site-secret';
    }

    app = await createTestApp();
    prisma = app.get(PrismaService);
    await ensureBaseUsers(prisma);
    await prisma.systemConfig.deleteMany({
      where: { key: { in: ['integrations.mango.call_routing.v1', 'integrations.site.lead_routing.v1'] } },
    });
  });

  afterAll(async () => {
    await prisma.systemConfig.deleteMany({
      where: { key: { in: ['integrations.mango.call_routing.v1', 'integrations.site.lead_routing.v1'] } },
    });
    if (originalMangoSecret === undefined) {
      delete process.env.INTEGRATION_MANGO_SECRET;
    } else {
      process.env.INTEGRATION_MANGO_SECRET = originalMangoSecret;
    }
    if (originalMangoApiKey === undefined) {
      delete process.env.INTEGRATION_MANGO_API_KEY;
    } else {
      process.env.INTEGRATION_MANGO_API_KEY = originalMangoApiKey;
    }
    if (originalMangoRecordingAccountId === undefined) {
      delete process.env.INTEGRATION_MANGO_RECORDING_ACCOUNT_ID;
    } else {
      process.env.INTEGRATION_MANGO_RECORDING_ACCOUNT_ID = originalMangoRecordingAccountId;
    }
    if (originalMangoRecordingUrlTemplate === undefined) {
      delete process.env.INTEGRATION_MANGO_RECORDING_URL_TEMPLATE;
    } else {
      process.env.INTEGRATION_MANGO_RECORDING_URL_TEMPLATE = originalMangoRecordingUrlTemplate;
    }
    if (originalSiteSecret === undefined) {
      delete process.env.INTEGRATION_SITE_SECRET;
    } else {
      process.env.INTEGRATION_SITE_SECRET = originalSiteSecret;
    }
    await closeTestApp(app);
  });

  it('APIC-036: ingest call creates/updates lead and logs recording activity for lead/application', async () => {
    const seed = uniqueSeed('036');
    const phone = uniquePhone('036');

    const firstPayload = {
      contactName: 'QA Mango APIC 036',
      contactCompany: `QA APIC 036 ${seed} LLC`,
      address: 'Moscow, APIC 036 test site',
      call: {
        callId: `mango-apic-036-call-1-${seed}`,
        direction: 'incoming',
        from: phone,
        to: '+74951234567',
        duration: 453,
        status: 'answered',
        recordingUrl: 'https://records.mango.test/apic036-call-1.mp3',
        eventTime: '2026-05-13T12:00:00.000Z',
      },
      comment: 'first call from integration',
    } as Record<string, unknown>;

    const firstHeaders = buildMangoIngestHeaders(firstPayload);
    const firstIngest = await request(app.getHttpServer())
      .post('/api/v1/integrations/events/ingest')
      .set(firstHeaders)
      .send({
        channel: 'mango',
        externalId: `MANGO-APIC-036-1-${seed}`,
        payload: firstPayload,
      })
      .expect(201);

    expect(firstIngest.body.deduplicated).toBe(false);
    expect(firstIngest.body.processed).toBe(true);
    expect(firstIngest.body.event).toMatchObject({
      channel: 'mango',
      externalId: `MANGO-APIC-036-1-${seed}`,
      status: 'processed',
      relatedLeadId: expect.any(String),
    });

    const leadId = firstIngest.body.event.relatedLeadId as string;
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    expect(lead).not.toBeNull();
    expect(lead?.source).toBe('mango');
    expect(lead?.contactPhone).toContain(phone.slice(-10));
    expect(lead?.comment).toContain(`[integration:mango#MANGO-APIC-036-1-${seed}]`);
    expect(lead?.comment).toContain('https://records.mango.test/apic036-call-1.mp3');

    const leadCallActivity = await prisma.activityLogEntry.findFirst({
      where: {
        entityType: 'lead',
        entityId: leadId,
        action: 'note_added',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    expect(leadCallActivity).not.toBeNull();
    expect(leadCallActivity?.summary).toContain('Mango');
    const leadActivityPayload = leadCallActivity?.payload as
      | {
          integration?: { provider?: string };
          telephony?: { recordingUrl?: string };
        }
      | undefined;
    expect(leadActivityPayload?.integration?.provider).toBe('mango');
    expect(leadActivityPayload?.telephony?.recordingUrl).toBe(
      'https://records.mango.test/apic036-call-1.mp3',
    );

    const adminLogin = await loginByPassword(app, TEST_ADMIN);

    await request(app.getHttpServer())
      .post(`/api/v1/leads/${leadId}/stage`)
      .set('Authorization', authHeader(adminLogin.accessToken))
      .send({ stage: 'application' })
      .expect(201);

    const activeApplication = await prisma.application.findFirst({
      where: {
        leadId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    expect(activeApplication?.id).toEqual(expect.any(String));

    const secondPayload = {
      contactName: 'QA Mango APIC 036',
      call: {
        callId: `mango-apic-036-call-2-${seed}`,
        direction: 'outgoing',
        from: '+74951234567',
        to: phone,
        durationSec: 61,
        status: 'completed',
        recordingUrl: 'https://records.mango.test/apic036-call-2.mp3',
        eventTime: '2026-05-13T13:00:00.000Z',
      },
    } as Record<string, unknown>;

    const secondHeaders = buildMangoIngestHeaders(secondPayload);
    const secondIngest = await request(app.getHttpServer())
      .post('/api/v1/integrations/events/ingest')
      .set(secondHeaders)
      .send({
        channel: 'mango',
        externalId: `MANGO-APIC-036-2-${seed}`,
        payload: secondPayload,
      })
      .expect(201);

    expect(secondIngest.body.processed).toBe(true);
    expect(secondIngest.body.event.relatedLeadId).toBe(leadId);

    const appCallActivity = await prisma.activityLogEntry.findFirst({
      where: {
        entityType: 'application',
        entityId: activeApplication!.id,
        action: 'note_added',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    expect(appCallActivity).not.toBeNull();
    const appActivityPayload = appCallActivity?.payload as
      | {
          telephony?: { direction?: string; recordingUrl?: string };
        }
      | undefined;
    expect(appActivityPayload?.telephony?.direction).toBe('outbound');
    expect(appActivityPayload?.telephony?.recordingUrl).toBe(
      'https://records.mango.test/apic036-call-2.mp3',
    );
  });

  it('APIC-037: accepts Mango Office API connector signed form callback', async () => {
    const seed = uniqueSeed('037');
    const phone = uniquePhone('037');
    const payload = {
      entry_id: `mango-connector-apic-037-entry-1-${seed}`,
      call_id: `mango-connector-apic-037-call-1-${seed}`,
      call_direction: 'incoming',
      from_number: phone,
      to_number: '+74951234567',
      duration: 37,
      call_state: 'connected',
      create_time: '2026-05-13T14:00:00.000Z',
    } as Record<string, unknown>;

    const response = await request(app.getHttpServer())
      .post('/api/v1/integrations/events/mango')
      .type('form')
      .send(buildMangoConnectorBody(payload))
      .expect(201);

    expect(response.body.processed).toBe(true);
    expect(response.body.event).toMatchObject({
      channel: 'mango',
      externalId: `mango-connector-apic-037-entry-1-${seed}`,
      status: 'processed',
      relatedLeadId: expect.any(String),
    });

    const lead = await prisma.lead.findUnique({
      where: { id: response.body.event.relatedLeadId as string },
    });

    expect(lead).not.toBeNull();
    expect(lead?.source).toBe('mango');
    expect(lead?.contactPhone).toContain(phone.slice(-10));
  });

  it('APIC-038: records rejected Mango connector callbacks for admin diagnostics (QA-REQ-050)', async () => {
    const seed = uniqueSeed('038');
    const phone = uniquePhone('038');
    const payload = {
      entry_id: `mango-connector-apic-038-entry-1-${seed}`,
      call_id: `mango-connector-apic-038-call-1-${seed}`,
      call_direction: 'incoming',
      from_number: phone,
      to_number: '+74951234567',
      duration: 18,
      call_state: 'connected',
      create_time: '2026-05-13T15:00:00.000Z',
    } as Record<string, unknown>;

    await request(app.getHttpServer())
      .post('/api/v1/integrations/events/mango')
      .type('form')
      .send({
        vpbx_api_key: process.env.INTEGRATION_MANGO_API_KEY ?? 'qa-test-mango-api-key',
        sign: '0'.repeat(64),
        json: JSON.stringify(payload),
      })
      .expect(403);

    const event = await prisma.integrationEvent.findFirst({
      where: {
        channel: 'mango',
        externalId: `mango-connector-apic-038-entry-1-${seed}`,
      },
      orderBy: { receivedAt: 'desc' },
    });

    expect(event).not.toBeNull();
    expect(event?.status).toBe('failed');
    expect(event?.relatedLeadId).toBeNull();
    expect(event?.errorMessage).toBe('Invalid Mango connector signature');
  });

  it('APIC-039: accepts Mango Office typed call event path (QA-REQ-051)', async () => {
    const seed = uniqueSeed('039');
    const phone = uniquePhone('039');
    const payload = {
      entry_id: `mango-connector-apic-039-entry-1-${seed}`,
      call_id: `mango-connector-apic-039-call-1-${seed}`,
      call_direction: 'incoming',
      from: { number: phone },
      to: { number: '+74951234567' },
      duration: 25,
      call_state: 'connected',
      create_time: '2026-05-13T16:00:00.000Z',
    } as Record<string, unknown>;

    const response = await request(app.getHttpServer())
      .post('/api/v1/integrations/events/mango/events/call')
      .type('form')
      .send(buildMangoConnectorBody(payload))
      .expect(201);

    expect(response.body.processed).toBe(true);
    expect(response.body.event).toMatchObject({
      channel: 'mango',
      externalId: `mango-connector-apic-039-entry-1-${seed}`,
      status: 'processed',
      relatedLeadId: expect.any(String),
    });

    const lead = await prisma.lead.findUnique({
      where: { id: response.body.event.relatedLeadId as string },
    });

    expect(lead).not.toBeNull();
    expect(lead?.source).toBe('mango');
    expect(lead?.contactPhone).toContain(phone.slice(-10));
  });

  it('APIC-040: protects and persists Mango call-routing settings (QA-REQ-052)', async () => {
    const adminLogin = await loginByPassword(app, TEST_ADMIN);
    const managerLogin = await loginByPassword(app, TEST_MANAGER);
    const manager = await prisma.user.findUniqueOrThrow({
      where: { email: TEST_MANAGER.email },
      select: { id: true },
    });

    const settings = {
      enabled: true,
      updateResponsibleOnAnswered: true,
      updateResponsibleOnTransfer: true,
      assignMissedCalls: false,
      fallbackManagerId: null,
      rules: [
        {
          extension: '915',
          userId: manager.id,
          isActive: true,
        },
      ],
    };

    await request(app.getHttpServer())
      .get('/api/v1/integrations/mango/call-routing')
      .set('Authorization', authHeader(managerLogin.accessToken))
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/v1/integrations/mango/call-routing')
      .set('Authorization', authHeader(managerLogin.accessToken))
      .send(settings)
      .expect(403);

    const saved = await request(app.getHttpServer())
      .post('/api/v1/integrations/mango/call-routing')
      .set('Authorization', authHeader(adminLogin.accessToken))
      .send(settings)
      .expect(201);

    expect(saved.body).toMatchObject(settings);

    const fetched = await request(app.getHttpServer())
      .get('/api/v1/integrations/mango/call-routing')
      .set('Authorization', authHeader(adminLogin.accessToken))
      .expect(200);

    expect(fetched.body).toMatchObject(settings);
  });

  it('APIC-041: routes inbound Mango calls to Lead and active Application manager (QA-REQ-052)', async () => {
    const seed = uniqueSeed('041');
    const phone = uniquePhone('041');
    const adminLogin = await loginByPassword(app, TEST_ADMIN);
    const manager = await prisma.user.findUniqueOrThrow({
      where: { email: TEST_MANAGER.email },
      select: { id: true },
    });

    await request(app.getHttpServer())
      .post('/api/v1/integrations/mango/call-routing')
      .set('Authorization', authHeader(adminLogin.accessToken))
      .send({
        enabled: true,
        updateResponsibleOnAnswered: true,
        updateResponsibleOnTransfer: true,
        assignMissedCalls: false,
        fallbackManagerId: null,
        rules: [
          {
            extension: '115',
            userId: manager.id,
            isActive: true,
          },
        ],
      })
      .expect(201);

    const leadResponse = await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set('Authorization', authHeader(adminLogin.accessToken))
      .send({
        contactName: 'QA Mango Routing Lead',
        contactPhone: phone,
        requestedDate: '2026-05-20T09:00:00.000Z',
        address: 'QA Mango Routing Address',
      })
      .expect(201);

    const leadId = leadResponse.body.lead.id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/leads/${leadId}/stage`)
      .set('Authorization', authHeader(adminLogin.accessToken))
      .send({ stage: 'application' })
      .expect(201);

    const activeApplication = await prisma.application.findFirstOrThrow({
      where: { leadId, isActive: true },
      select: { id: true, responsibleManagerId: true },
    });
    expect(activeApplication.responsibleManagerId).not.toBe(manager.id);

    const payload = {
      contactName: 'QA Mango Routing Lead',
      call: {
        callId: `mango-routing-apic-041-call-${seed}`,
        direction: 'incoming',
        from: phone,
        to: '+74951234567',
        operator_extension: '(115) QA Manager',
        duration: 42,
        status: 'answered',
        eventTime: '2026-05-13T17:00:00.000Z',
      },
    } as Record<string, unknown>;

    const response = await request(app.getHttpServer())
      .post('/api/v1/integrations/events/ingest')
      .set(buildMangoIngestHeaders(payload))
      .send({
        channel: 'mango',
        externalId: `MANGO-ROUTING-APIC-041-${seed}`,
        payload,
      })
      .expect(201);

    expect(response.body.processed).toBe(true);
    expect(response.body.event.relatedLeadId).toBe(leadId);

    const routedLead = await prisma.lead.findUniqueOrThrow({
      where: { id: leadId },
      select: { managerId: true },
    });
    expect(routedLead.managerId).toBe(manager.id);

    const routedApplication = await prisma.application.findUniqueOrThrow({
      where: { id: activeApplication.id },
      select: { responsibleManagerId: true },
    });
    expect(routedApplication.responsibleManagerId).toBe(manager.id);

    const assignmentActivity = await prisma.activityLogEntry.findFirst({
      where: {
        entityType: 'application',
        entityId: activeApplication.id,
        action: 'updated',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(assignmentActivity?.summary).toContain('Mango');
  });

  it('APIC-042: protects and persists site lead-routing settings (QA-REQ-053)', async () => {
    const adminLogin = await loginByPassword(app, TEST_ADMIN);
    const managerLogin = await loginByPassword(app, TEST_MANAGER);
    const manager = await prisma.user.findUniqueOrThrow({
      where: { email: TEST_MANAGER.email },
      select: { id: true },
    });

    const settings = {
      enabled: true,
      preserveExistingManager: true,
      fallbackManagerId: null,
      managerIds: [manager.id],
    };

    await request(app.getHttpServer())
      .get('/api/v1/integrations/site/lead-routing')
      .set('Authorization', authHeader(managerLogin.accessToken))
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/v1/integrations/site/lead-routing')
      .set('Authorization', authHeader(managerLogin.accessToken))
      .send(settings)
      .expect(403);

    const saved = await request(app.getHttpServer())
      .post('/api/v1/integrations/site/lead-routing')
      .set('Authorization', authHeader(adminLogin.accessToken))
      .send(settings)
      .expect(201);

    expect(saved.body).toMatchObject(settings);
    expect(saved.body.lastAssignedManagerId).toBeNull();

    const fetched = await request(app.getHttpServer())
      .get('/api/v1/integrations/site/lead-routing')
      .set('Authorization', authHeader(adminLogin.accessToken))
      .expect(200);

    expect(fetched.body).toMatchObject(settings);
    expect(fetched.body.lastAssignedManagerId).toBeNull();
  });

  it('APIC-043: routes new site leads round-robin and preserves duplicate manager (QA-REQ-053)', async () => {
    const seed = uniqueSeed('043');
    const firstPhone = uniquePhone('0431');
    const secondPhone = uniquePhone('0432');
    const adminLogin = await loginByPassword(app, TEST_ADMIN);
    const firstManager = await prisma.user.findUniqueOrThrow({
      where: { email: TEST_MANAGER.email },
      select: { id: true },
    });
    const secondManager = await prisma.user.create({
      data: {
        email: `site-routing-${seed}@qa.test`,
        fullName: 'QA Site Routing Manager',
        passwordHash: 'not-used-in-test',
        role: 'manager',
        isActive: true,
      },
      select: { id: true },
    });

    await request(app.getHttpServer())
      .post('/api/v1/integrations/site/lead-routing')
      .set('Authorization', authHeader(adminLogin.accessToken))
      .send({
        enabled: true,
        preserveExistingManager: true,
        fallbackManagerId: null,
        managerIds: [firstManager.id, secondManager.id],
      })
      .expect(201);

    const firstPayload = {
      contactName: 'QA Site Routing First Lead',
      contactPhone: firstPhone,
      contactCompany: `QA Site ${seed} LLC`,
    } as Record<string, unknown>;

    const firstResponse = await request(app.getHttpServer())
      .post('/api/v1/integrations/events/ingest')
      .set(buildSiteIngestHeaders(firstPayload))
      .send({
        channel: 'site',
        externalId: `SITE-ROUTING-APIC-043-1-${seed}`,
        payload: firstPayload,
      })
      .expect(201);

    const firstLeadId = firstResponse.body.event.relatedLeadId as string;
    const firstLead = await prisma.lead.findUniqueOrThrow({
      where: { id: firstLeadId },
      select: { managerId: true, source: true },
    });
    expect(firstLead.source).toBe('site');
    expect(firstLead.managerId).toBe(firstManager.id);

    const secondPayload = {
      contactName: 'QA Site Routing Second Lead',
      contactPhone: secondPhone,
      contactCompany: `QA Site ${seed} Second LLC`,
      message: 'second site form',
    } as Record<string, unknown>;

    const secondResponse = await request(app.getHttpServer())
      .post('/api/v1/integrations/events/ingest')
      .set(buildSiteIngestHeaders(secondPayload))
      .send({
        channel: 'site',
        externalId: `SITE-ROUTING-APIC-043-2-${seed}`,
        payload: secondPayload,
      })
      .expect(201);

    const secondLead = await prisma.lead.findUniqueOrThrow({
      where: { id: secondResponse.body.event.relatedLeadId as string },
      select: { managerId: true },
    });
    expect(secondLead.managerId).toBe(secondManager.id);

    const duplicatePayload = {
      contactName: 'QA Site Routing First Lead Updated',
      contactPhone: firstPhone,
      contactCompany: `QA Site ${seed} LLC`,
      message: 'duplicate site form',
    } as Record<string, unknown>;

    const duplicateResponse = await request(app.getHttpServer())
      .post('/api/v1/integrations/events/ingest')
      .set(buildSiteIngestHeaders(duplicatePayload))
      .send({
        channel: 'site',
        externalId: `SITE-ROUTING-APIC-043-3-${seed}`,
        payload: duplicatePayload,
      })
      .expect(201);

    expect(duplicateResponse.body.event.relatedLeadId).toBe(firstLeadId);

    const preservedLead = await prisma.lead.findUniqueOrThrow({
      where: { id: firstLeadId },
      select: { managerId: true, contactName: true },
    });
    expect(preservedLead.managerId).toBe(firstManager.id);
    expect(preservedLead.contactName).toBe('QA Site Routing First Lead Updated');
  });

  it('APIC-044: accepts Mango recording callback without contact phone and links by call_id (QA-REQ-051)', async () => {
    const seed = uniqueSeed('044');
    const phone = uniquePhone('044');
    const expectedRecordingAccountId = '10160071';

    const baseCallPayload = {
      entry_id: `mango-connector-apic-044-entry-call-${seed}`,
      call_id: `mango-connector-apic-044-call-${seed}`,
      call_direction: 'incoming',
      from_number: phone,
      to_number: '+74951234567',
      duration: 31,
      call_state: 'connected',
      create_time: '2026-05-20T09:00:00.000Z',
    } as Record<string, unknown>;

    const baseCallResponse = await request(app.getHttpServer())
      .post('/api/v1/integrations/events/mango')
      .type('form')
      .send(buildMangoConnectorBody(baseCallPayload))
      .expect(201);

    expect(baseCallResponse.body.processed).toBe(true);
    const leadId = baseCallResponse.body.event.relatedLeadId as string;
    expect(leadId).toEqual(expect.any(String));

    const adminLogin = await loginByPassword(app, TEST_ADMIN);
    await request(app.getHttpServer())
      .post(`/api/v1/leads/${leadId}/stage`)
      .set('Authorization', authHeader(adminLogin.accessToken))
      .send({ stage: 'application' })
      .expect(201);

    const activeApplication = await prisma.application.findFirstOrThrow({
      where: { leadId, isActive: true },
      select: { id: true },
    });

    const recordingId = Buffer
      .from(`1:${expectedRecordingAccountId}:mango-connector-apic-044-rec-${seed}:0`, 'utf8')
      .toString('base64')
      .replace(/=+$/g, '');
    const previousRecordingAccountId = process.env.INTEGRATION_MANGO_RECORDING_ACCOUNT_ID;
    delete process.env.INTEGRATION_MANGO_RECORDING_ACCOUNT_ID;

    let recordingResponse: request.Response;
    try {
      const recordingPayload = {
        seq: 2,
        call_id: `mango-connector-apic-044-call-${seed}`,
        entry_id: `mango-connector-apic-044-entry-rec-${seed}`,
        extension: '11',
        recipient: 'Cloud',
        timestamp: 1779199699,
        recording_id: recordingId,
        completion_code: 1000,
        recording_state: 'Completed',
      } as Record<string, unknown>;

      recordingResponse = await request(app.getHttpServer())
        .post('/api/v1/integrations/events/mango/events/recording')
        .type('form')
        .send(buildMangoConnectorBody(recordingPayload))
        .expect(201);
    } finally {
      if (previousRecordingAccountId === undefined) {
        delete process.env.INTEGRATION_MANGO_RECORDING_ACCOUNT_ID;
      } else {
        process.env.INTEGRATION_MANGO_RECORDING_ACCOUNT_ID = previousRecordingAccountId;
      }
    }

    expect(recordingResponse.body.processed).toBe(true);
    expect(recordingResponse.body.event).toMatchObject({
      channel: 'mango',
      externalId: `mango-connector-apic-044-entry-rec-${seed}`,
      status: 'processed',
      relatedLeadId: leadId,
      errorMessage: null,
    });

    const leadActivities = await prisma.activityLogEntry.findMany({
      where: {
        entityType: 'lead',
        entityId: leadId,
        action: 'note_added',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    const recordingLeadActivity = leadActivities.find((entry) => {
      const payload = entry.payload as
        | {
            integration?: { eventId?: string };
            telephony?: { recordingUrl?: string | null };
          }
        | undefined;
      return payload?.integration?.eventId === recordingResponse.body.event.id;
    });
    expect(recordingLeadActivity).toBeDefined();
    const recordingLeadPayload = recordingLeadActivity?.payload as
      | { telephony?: { recordingUrl?: string | null } }
      | undefined;
    expect(recordingLeadPayload?.telephony?.recordingUrl).toBe(
      `https://lk.mango-office.ru/issa/api/${process.env.INTEGRATION_MANGO_API_KEY}/${expectedRecordingAccountId}/call-recording/play-record/${recordingId}`,
    );

    const appActivities = await prisma.activityLogEntry.findMany({
      where: {
        entityType: 'application',
        entityId: activeApplication.id,
        action: 'note_added',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    const recordingAppActivity = appActivities.find((entry) => {
      const payload = entry.payload as
        | {
            integration?: { eventId?: string };
            telephony?: { recordingUrl?: string | null };
          }
        | undefined;
      return payload?.integration?.eventId === recordingResponse.body.event.id;
    });
    expect(recordingAppActivity).toBeDefined();
    const recordingAppPayload = recordingAppActivity?.payload as
      | { telephony?: { recordingUrl?: string | null } }
      | undefined;
    expect(recordingAppPayload?.telephony?.recordingUrl).toBe(
      `https://lk.mango-office.ru/issa/api/${process.env.INTEGRATION_MANGO_API_KEY}/${expectedRecordingAccountId}/call-recording/play-record/${recordingId}`,
    );
  });

  it('APIC-045: allows replay for already replayed Mango events (QA-REQ-051)', async () => {
    const seed = uniqueSeed('045');
    const phone = uniquePhone('045');
    const payload = {
      contactName: 'QA Mango APIC 045',
      contactCompany: `QA APIC 045 ${seed} LLC`,
      call: {
        callId: `mango-apic-045-call-${seed}`,
        direction: 'incoming',
        from: phone,
        to: '+74951234567',
        duration: 26,
        status: 'answered',
        recordingUrl: `https://records.mango.test/apic045-${seed}.mp3`,
        eventTime: '2026-05-20T10:00:00.000Z',
      },
      comment: 'apic-045 replay after replayed status',
    } as Record<string, unknown>;

    const ingestResponse = await request(app.getHttpServer())
      .post('/api/v1/integrations/events/ingest')
      .set(buildMangoIngestHeaders(payload))
      .send({
        channel: 'mango',
        externalId: `MANGO-APIC-045-${seed}`,
        payload,
      })
      .expect(201);

    expect(ingestResponse.body.processed).toBe(true);
    const eventId = ingestResponse.body.event.id as string;
    const leadId = ingestResponse.body.event.relatedLeadId as string;

    await prisma.integrationEvent.update({
      where: { id: eventId },
      data: {
        status: 'replayed',
        replayedAt: new Date('2026-05-20T10:05:00.000Z'),
      },
    });

    const adminLogin = await loginByPassword(app, TEST_ADMIN);
    const replayResponse = await request(app.getHttpServer())
      .post(`/api/v1/integrations/events/${eventId}/replay`)
      .set('Authorization', authHeader(adminLogin.accessToken))
      .send({ reason: 'replay already replayed event for recording backfill' })
      .expect(201);

    expect(replayResponse.body.processed).toBe(true);
    expect(replayResponse.body.event).toMatchObject({
      id: eventId,
      channel: 'mango',
      status: 'replayed',
      relatedLeadId: leadId,
      errorMessage: null,
    });

    const replayAudit = await prisma.activityLogEntry.findFirst({
      where: {
        entityType: 'integration_event',
        entityId: eventId,
        action: 'updated',
        summary: { contains: 'Replay succeeded' },
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(replayAudit).not.toBeNull();
  });
});
