import type { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import type { PrismaService } from '../../src/prisma/prisma.service';

export type FixtureRole = 'admin' | 'manager';

export interface TestUserFixture {
  email: string;
  password: string;
  fullName: string;
  role: FixtureRole;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: FixtureRole;
  };
}

export const TEST_ADMIN: TestUserFixture = {
  email: 'admin@katet.local',
  password: 'admin123',
  fullName: 'Admin User',
  role: 'admin',
};

export const TEST_MANAGER: TestUserFixture = {
  email: 'manager@katet.local',
  password: 'manager123',
  fullName: 'Manager User',
  role: 'manager',
};

async function upsertUser(prisma: PrismaService, fixture: TestUserFixture): Promise<void> {
  const passwordHash = await bcrypt.hash(fixture.password, 10);

  await prisma.user.upsert({
    where: { email: fixture.email },
    create: {
      email: fixture.email,
      fullName: fixture.fullName,
      role: fixture.role,
      isActive: true,
      passwordHash,
    },
    update: {
      fullName: fixture.fullName,
      role: fixture.role,
      isActive: true,
      passwordHash,
    },
  });
}

export async function ensureBaseUsers(prisma: PrismaService): Promise<void> {
  await upsertUser(prisma, TEST_ADMIN);
  await upsertUser(prisma, TEST_MANAGER);
}

export async function loginByPassword(
  app: INestApplication,
  fixture: TestUserFixture,
): Promise<LoginResponse> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({
      email: fixture.email,
      password: fixture.password,
    })
    .expect(200);

  return response.body as LoginResponse;
}