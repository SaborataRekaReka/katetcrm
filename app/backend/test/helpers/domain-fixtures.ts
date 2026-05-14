import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { PrismaService } from '../../src/prisma/prisma.service';

export interface LeadApplicationFixture {
  leadId: string;
  applicationId: string;
  clientId: string | null;
}

export interface EquipmentFixture {
  equipmentTypeId: string;
  equipmentUnitId: string;
}

export function uniqueSeed(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function uniquePhone(seed: string): string {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return `+7999${seed}${stamp}`.slice(0, 18);
}

export function futureIso(minutesFromNow: number): string {
  return new Date(Date.now() + minutesFromNow * 60_000).toISOString();
}

export function authHeader(accessToken: string): string {
  return `Bearer ${accessToken}`;
}

export async function ensureEquipmentFixture(
  prisma: PrismaService,
  seed: string,
): Promise<EquipmentFixture> {
  const type = await prisma.equipmentType.create({
    data: {
      name: `QA ${seed} Type`,
      description: `Fixture ${seed}`,
    },
    select: { id: true },
  });

  const unit = await prisma.equipmentUnit.create({
    data: {
      name: `QA ${seed} Unit`,
      equipmentTypeId: type.id,
      plateNumber: `QA-${seed.slice(-6)}`,
      status: 'active',
    },
    select: { id: true },
  });

  return {
    equipmentTypeId: type.id,
    equipmentUnitId: unit.id,
  };
}

export async function createLeadAndApplication(
  app: INestApplication,
  accessToken: string,
  seed: string,
): Promise<LeadApplicationFixture> {
  const leadCreate = await request(app.getHttpServer())
    .post('/api/v1/leads')
    .set('Authorization', authHeader(accessToken))
    .send({
      contactName: `QA ${seed} Lead`,
      contactPhone: uniquePhone(seed.replace(/\D/g, '').slice(0, 6) || '777'),
      equipmentTypeHint: `QA ${seed} Equipment`,
      requestedDate: futureIso(1440),
      timeWindow: '09:00-18:00',
      address: `QA ${seed} Address`,
    })
    .expect(201);

  const leadId = leadCreate.body?.lead?.id as string | undefined;
  if (!leadId) {
    throw new Error('Lead create response does not contain lead.id');
  }

  await request(app.getHttpServer())
    .post(`/api/v1/leads/${leadId}/stage`)
    .set('Authorization', authHeader(accessToken))
    .send({ stage: 'application' })
    .expect(201);

  const apps = await request(app.getHttpServer())
    .get('/api/v1/applications')
    .query({ leadId })
    .set('Authorization', authHeader(accessToken))
    .expect(200);

  const first = Array.isArray(apps.body?.items) ? apps.body.items[0] : undefined;
  if (!first?.id) {
    throw new Error('Applications list does not contain generated application');
  }

  return {
    leadId,
    applicationId: first.id as string,
    clientId: (first.clientId as string | null | undefined) ?? null,
  };
}

export async function addApplicationItem(
  app: INestApplication,
  accessToken: string,
  applicationId: string,
  payload: Record<string, unknown>,
) {
  const response = await request(app.getHttpServer())
    .post(`/api/v1/applications/${applicationId}/items`)
    .set('Authorization', authHeader(accessToken))
    .send(payload)
    .expect(201);

  return response.body as { id: string };
}

export async function createReservation(
  app: INestApplication,
  accessToken: string,
  payload: Record<string, unknown>,
  expectedStatus = 201,
) {
  const response = await request(app.getHttpServer())
    .post('/api/v1/reservations')
    .set('Authorization', authHeader(accessToken))
    .send(payload)
    .expect(expectedStatus);

  return response;
}

export async function createDeparture(
  app: INestApplication,
  accessToken: string,
  payload: Record<string, unknown>,
  expectedStatus = 201,
) {
  const response = await request(app.getHttpServer())
    .post('/api/v1/departures')
    .set('Authorization', authHeader(accessToken))
    .send(payload)
    .expect(expectedStatus);

  return response;
}