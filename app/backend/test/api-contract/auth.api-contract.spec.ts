import type { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  TEST_ADMIN,
  TEST_MANAGER,
  ensureBaseUsers,
  loginByPassword,
} from '../helpers/auth-fixtures';
import { closeTestApp, createTestApp } from '../helpers/test-app';

describe('API Contract - Auth (QA-REQ: 003, 032, 033, 035)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const DEMO_EMAIL = 'demo@katet.local';
  const DEMO_PASSWORD = 'demo123';

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await ensureBaseUsers(prisma);

    await prisma.user.upsert({
      where: { email: DEMO_EMAIL },
      create: {
        email: DEMO_EMAIL,
        fullName: 'Demo ReadOnly',
        role: 'manager',
        isActive: true,
        passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
      },
      update: {
        fullName: 'Demo ReadOnly',
        role: 'manager',
        isActive: true,
        passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
      },
    });
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('APIC-001: login and auth me contract for manager and admin roles', async () => {
    const adminLogin = await loginByPassword(app, TEST_ADMIN);
    expect(adminLogin.accessToken).toEqual(expect.any(String));
    expect(adminLogin.refreshToken).toEqual(expect.any(String));
    expect(adminLogin.user).toMatchObject({
      email: TEST_ADMIN.email,
      role: 'admin',
    });

    const adminMe = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminLogin.accessToken}`)
      .expect(200);

    expect(adminMe.body).toMatchObject({
      sub: adminLogin.user.id,
      email: TEST_ADMIN.email,
      role: 'admin',
    });

    const managerLogin = await loginByPassword(app, TEST_MANAGER);
    expect(managerLogin.accessToken).toEqual(expect.any(String));
    expect(managerLogin.refreshToken).toEqual(expect.any(String));
    expect(managerLogin.user).toMatchObject({
      email: TEST_MANAGER.email,
      role: 'manager',
    });

    const managerMe = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${managerLogin.accessToken}`)
      .expect(200);

    expect(managerMe.body).toMatchObject({
      sub: managerLogin.user.id,
      email: TEST_MANAGER.email,
      role: 'manager',
    });
  });

  it('APIC-001A: unauthorized /auth/me returns 401 without token', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });

  it('APIC-001B (QA-REQ-035): demo read-only account can login but cannot mutate protected API', async () => {
    const demoLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
      .expect(200);

    expect(demoLogin.body.user).toMatchObject({
      email: DEMO_EMAIL,
      role: 'manager',
    });

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${demoLogin.body.accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/bug-reports')
      .set('Authorization', `Bearer ${demoLogin.body.accessToken}`)
      .send({
        title: 'Demo mutation must be blocked',
        description: 'Demo account has read-only access and cannot create records.',
      })
      .expect(403);
  });
});
