import type { INestApplication } from '@nestjs/common';
import { createHash, createHmac } from 'crypto';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  TEST_ADMIN,
  ensureBaseUsers,
  loginByPassword,
} from '../helpers/auth-fixtures';
import { authHeader, uniquePhone } from '../helpers/domain-fixtures';
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

describe('API Contract - Integrations ingest Mango (QA-REQ: 036, 037)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let originalMangoSecret: string | undefined;
  let originalMangoApiKey: string | undefined;

  beforeAll(async () => {
    originalMangoSecret = process.env.INTEGRATION_MANGO_SECRET;
    originalMangoApiKey = process.env.INTEGRATION_MANGO_API_KEY;
    if (!originalMangoSecret) {
      process.env.INTEGRATION_MANGO_SECRET = 'qa-test-mango-secret';
    }
    if (!originalMangoApiKey) {
      process.env.INTEGRATION_MANGO_API_KEY = 'qa-test-mango-api-key';
    }

    app = await createTestApp();
    prisma = app.get(PrismaService);
    await ensureBaseUsers(prisma);
  });

  afterAll(async () => {
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
    await closeTestApp(app);
  });

  it('APIC-036: ingest call creates/updates lead and logs recording activity for lead/application', async () => {
    const phone = uniquePhone('036');

    const firstPayload = {
      contactName: 'QA Mango APIC 036',
      contactCompany: 'QA APIC 036 LLC',
      call: {
        callId: 'mango-apic-036-call-1',
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
        externalId: 'MANGO-APIC-036-1',
        payload: firstPayload,
      })
      .expect(201);

    expect(firstIngest.body.deduplicated).toBe(false);
    expect(firstIngest.body.processed).toBe(true);
    expect(firstIngest.body.event).toMatchObject({
      channel: 'mango',
      externalId: 'MANGO-APIC-036-1',
      status: 'processed',
      relatedLeadId: expect.any(String),
    });

    const leadId = firstIngest.body.event.relatedLeadId as string;
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    expect(lead).not.toBeNull();
    expect(lead?.source).toBe('mango');
    expect(lead?.contactPhone).toContain(phone.slice(-10));
    expect(lead?.comment).toContain('[integration:mango#MANGO-APIC-036-1]');
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
        callId: 'mango-apic-036-call-2',
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
        externalId: 'MANGO-APIC-036-2',
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
    const phone = uniquePhone('037');
    const payload = {
      entry_id: 'mango-connector-apic-037-entry-1',
      call_id: 'mango-connector-apic-037-call-1',
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
      externalId: 'mango-connector-apic-037-entry-1',
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
});
