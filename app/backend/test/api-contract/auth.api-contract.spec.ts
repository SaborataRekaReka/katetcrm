import type { INestApplication } from '@nestjs/common';
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

  beforeAll(async () => {
    app = await createTestApp();
    await ensureBaseUsers(app.get(PrismaService));
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
});
